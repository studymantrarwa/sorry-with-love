const {authUser,req:sbreq,json,profile}=require('./_lib');
const esc=v=>encodeURIComponent(String(v));

module.exports=async(req,res)=>{try{
 const u=await authUser(req); if(!u)return json(res,401,{error:'Login required'});
 const p=await profile(u.id); if(!['user','astrologer','admin'].includes(p?.role))return json(res,403,{error:'Login required'});
 if(req.method==='GET'){
  const requestedId=String(req.query?.id||'').trim();
  const target=requestedId||u.id;
  if(requestedId && requestedId!==u.id){
   const rows=await sbreq(`/rest/v1/astrologers?id=eq.${esc(target)}&verified=eq.true&select=*`);
   const a=rows[0];
   if(!a)return json(res,404,{error:'Astrologer not found'});
   const ps=await sbreq(`/rest/v1/profiles?id=eq.${esc(target)}&select=id,full_name,avatar_url,blocked,role`);
   const app=await sbreq(`/rest/v1/astrologer_applications?user_id=eq.${esc(target)}&select=education&limit=1`);
   const profileRow=ps[0]||null;
   if(profileRow?.blocked)return json(res,404,{error:'Astrologer not found'});

   // Public profile statistics. Only approved review content is exposed.
   const reviewRows=await sbreq(`/rest/v1/reviews?astrologer_id=eq.${esc(target)}&select=id,user_id,rating,review,moderation_status,created_at&order=created_at.desc`);
   const reviews=reviewRows.filter(r=>String(r.moderation_status||'approved')!=='hidden');
   const followersRows=await sbreq(`/rest/v1/astrologer_follows?astrologer_id=eq.${esc(target)}&select=id&limit=100000`);
   const consultationRows=await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(target)}&channel=eq.chat&status=eq.closed&select=id&limit=100000`);
   const ratingCount=reviews.length;
   const ratingAvg=ratingCount?Math.round((reviews.reduce((s,r)=>s+Number(r.rating||0),0)/ratingCount)*100)/100:Number(a.rating_avg||0);
   const base=Number(a.fee_per_minute??a.fee??0);
   const discount=[0,25,50,75].includes(Number(a.discount))?Number(a.discount):0;
   const effective=Math.round(base*(1-discount/100)*100)/100;
   // Determine live BUSY state safely. The previous build referenced an
   // undefined `active` variable here, which made every public astrologer
   // profile return HTTP 500. Keep the existing online flag as the source of
   // truth and only mark BUSY when a currently-running chat/call exists.
   let active=null;
   try{
    const liveRows=await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(target)}&or=(and(channel.eq.chat,status.eq.accepted,chat_started_at.not.is.null),and(channel.eq.call,status.eq.call_accepted,call_started_at.not.is.null))&select=id,channel,session_end_at,chat_started_at,chat_budget_seconds,call_started_at,call_budget_seconds&order=created_at.desc&limit=50`);
    for(const row of (liveRows||[])){
     const start=row.channel==='call'?row.call_started_at:row.chat_started_at;
     const budget=row.channel==='call'?row.call_budget_seconds:row.chat_budget_seconds;
     const end=row.session_end_at||((start&&Number.isFinite(new Date(start).getTime()))?new Date(new Date(start).getTime()+Math.max(0,Number(budget||0))*1000).toISOString():null);
     const endMs=end?new Date(end).getTime():0;
     if(endMs>Date.now()){active={...row,session_end_at:end};break;}
    }
   }catch(_){active=null;}
   const activeNow=!!active;
   const online=activeNow?true:!!a.online;
   return json(res,200,{astrologer:{...a,avatar_url:a.avatar_url||'/assets/astrologer-default.svg',online,availability_state:activeNow?'BUSY':(online?'AVAILABLE':'OFFLINE'),busy_until:active?.session_end_at||null,active_session_channel:active?.channel||null,full_name:profileRow?.full_name||a.full_name||'Astrologer',avatar_url:a.avatar_url||profileRow?.avatar_url||'/assets/astrologer-default.svg',education:a.education||app[0]?.education||'',base_fee_per_minute:base,discount_percent:discount,effective_fee_per_minute:effective,rating_avg:ratingAvg,rating_count:ratingCount,followers:followersRows.length,followers_count:followersRows.length,consultations:consultationRows.length},reviews});
  }
  const rows=await sbreq(`/rest/v1/astrologers?id=eq.${esc(u.id)}&select=*`);
  return json(res,200,{astrologer:rows[0]?{...rows[0],avatar_url:rows[0].avatar_url||'/assets/astrologer-default.svg'}:null});
 }
 if(req.method==='PATCH'){
  const b=req.body||{}; const patch={};
  for(const k of ['education','bio','experience_years','expertise','languages','call_enabled','chat_enabled','video_enabled','boosted']) if(k in b) patch[k]=b[k];
  // Price is controlled only by Admin. Astrologers can change discount only.
  if('fee' in b || 'fee_per_minute' in b) return json(res,403,{error:'Price is controlled by Admin. You can only set the allowed discount.'});
  if('discount' in b){const d=Number(b.discount);if(![0,25,50,75].includes(d))return json(res,400,{error:'Discount must be 0%, 25%, 50% or 75%'});patch.discount=d;}
  if('online' in b){patch.online=!!b.online;patch.last_seen=b.online?new Date().toISOString():null;}if('chat_enabled' in b) patch.chat_enabled=!!b.chat_enabled;
  if(!Object.keys(patch).length)return json(res,400,{error:'Nothing to update'});
  const rows=await sbreq(`/rest/v1/astrologers?id=eq.${esc(u.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
  return json(res,200,{astrologer:rows[0]?{...rows[0],avatar_url:rows[0].avatar_url||'/assets/astrologer-default.svg'}:null});
 }
 return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:e.message})}};
