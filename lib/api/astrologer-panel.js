const {authUser,req:sbreq,json,profile}=require('./_lib');
function monthStart(){const d=new Date();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)).toISOString()}
async function getAstro(id){const rows=await sbreq(`/rest/v1/astrologers?id=eq.${encodeURIComponent(id)}&select=*`);return rows[0]||null}
async function safe(path, fallback){try{return await sbreq(path)}catch{return fallback}}
module.exports=async(req,res)=>{try{
 const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});const p=await profile(u.id);if(p?.role!=='astrologer')return json(res,403,{error:'Approved astrologer account required'});
 const view=String(req.query?.view||'');
 if(req.method==='GET'&&!view){
   const a=await getAstro(u.id);if(!a)return json(res,404,{error:'Astrologer profile not found'});
   const reviews=await safe(`/rest/v1/reviews?astrologer_id=eq.${encodeURIComponent(u.id)}&select=rating`,[]);
   const conv=await safe(`/rest/v1/conversations?astrologer_id=eq.${encodeURIComponent(u.id)}&select=id`,[]);
   const today=new Date().toISOString().slice(0,10);
   const earn=await safe(`/rest/v1/astrologer_earnings?astrologer_id=eq.${encodeURIComponent(u.id)}&earned_at=gte.${encodeURIComponent(today+'T00:00:00Z')}&select=amount`,[]);
   const total=reviews.reduce((s,r)=>s+Number(r.rating||0),0);const avg=reviews.length?Math.round(total/reviews.length*10)/10:0;
   return json(res,200,{profile:p,astrologer:a,fee_per_minute:Number(a.fee_per_minute??a.fee??0),followers:Number(a.followers_count||0),rating:{average:avg,count:reviews.length},todayEarning:earn.reduce((s,x)=>s+Number(x.amount||0),0),connections:conv.length});
 }
 if(req.method==='GET'&&view==='earnings'){
   const fromRaw=String(req.query?.from||'').trim(),toRaw=String(req.query?.to||'').trim();
   const fromDate=/^\d{4}-\d{2}-\d{2}$/.test(fromRaw)?fromRaw:monthStart().slice(0,10);
   const toDate=/^\d{4}-\d{2}-\d{2}$/.test(toRaw)?toRaw:new Date().toISOString().slice(0,10);
   const rows=await safe(`/rest/v1/astrologer_earnings?astrologer_id=eq.${encodeURIComponent(u.id)}&earned_at=gte.${encodeURIComponent(fromDate+'T00:00:00Z')}&earned_at=lte.${encodeURIComponent(toDate+'T23:59:59Z')}&select=*&order=earned_at.desc&limit=5000`,[]);
   const sum=k=>rows.filter(x=>String(x.category||'service')===k).reduce((s,x)=>s+Number(x.net_amount??x.amount??0),0);
   const today=new Date().toISOString().slice(0,10);const todayRows=rows.filter(x=>String(x.earned_at||'').slice(0,10)===today);
   const daily={};for(const x of rows){const d=String(x.earned_at||'').slice(0,10);const val=Number(x.net_amount??x.amount??0);if(!daily[d])daily[d]={total:0,chat:0,call:0};daily[d].total+=val;if(String(x.category||'')==='chat')daily[d].chat+=val;if(String(x.category||'')==='call')daily[d].call+=val}
   const gross=rows.reduce((s,x)=>s+Number(x.gross_amount??x.amount??0),0),commission=rows.reduce((s,x)=>s+Number(x.commission_amount??0),0),netAmount=rows.reduce((s,x)=>s+Number(x.net_amount??x.amount??0),0);
   const chatRows=rows.filter(x=>String(x.category||'')==='chat').map(x=>({chat_id:x.conversation_id||null,earned_at:x.earned_at||null,gross:Number(x.gross_amount??0),commission:Number(x.commission_amount??0),earning:Number(x.net_amount??x.amount??0),paid_minutes:Number(x.paid_minutes??0),paid_amount:Number(x.paid_amount??0)})); const callRows=rows.filter(x=>String(x.category||'')==='call').map(x=>({call_id:x.conversation_id||null,earned_at:x.earned_at||null,gross:Number(x.gross_amount??0),commission:Number(x.commission_amount??0),earning:Number(x.net_amount??x.amount??0),paid_minutes:Number(x.paid_minutes??0),paid_amount:Number(x.paid_amount??0)}));
   // Build a date-range activity ledger as well as the earning ledger. This keeps
   // free chats/calls visible with ₹0 and also shows missed/rejected records.
   const startIso=fromDate+'T00:00:00Z', endIso=toDate+'T23:59:59Z';
   const activityRaw=await safe(`/rest/v1/conversations?astrologer_id=eq.${encodeURIComponent(u.id)}&channel=in.(chat,call)&created_at=gte.${encodeURIComponent(startIso)}&created_at=lte.${encodeURIComponent(endIso)}&select=*&order=created_at.desc&limit=5000`,[]);
   const userIds=[...new Set(activityRaw.map(c=>c.user_id).filter(Boolean))];
   const userProfiles=userIds.length?await safe(`/rest/v1/profiles?id=in.(${userIds.map(encodeURIComponent).join(',')})&select=id,full_name`,[]):[];
   const userName=id=>userProfiles.find(v=>String(v.id)===String(id))?.full_name||'User';
   const earningByConv=new Map(rows.filter(x=>x.conversation_id).map(x=>[String(x.conversation_id),x]));
   const statusLabel=(c)=>{const st=String(c.status||'');if(c.channel==='chat'){return ({requested:'Request',astrologer_accepted:'Accepted · User Confirmation Pending',accepted:'Accepted / Active',closed:'Released',missed:c.missed_by==='user'?'Missed · User':'Missed · Astrologer',rejected:'Rejected',ended:'Ended',completed:'Completed',cancelled:'Cancelled'}[st]||st||'Record')}return ({call_requested_astrologer:'Request',call_requested_user:'Request · User',astrologer_accepted:'Accepted · User Confirmation Pending',call_accepted:'Accepted / Active',accepted:'Accepted / Active',closed:'Released',missed:c.missed_by==='user'?'Missed · User':'Missed · Astrologer',call_rejected:'Rejected',rejected:'Rejected',ended:'Ended',completed:'Completed',cancelled:'Cancelled'}[st]||st||'Record')};
   const activity=activityRaw.map(c=>{const e=earningByConv.get(String(c.id));const earning=Number(e?.net_amount??e?.amount??c.billed_amount??0);const started=c.channel==='chat'?c.chat_started_at:c.call_started_at;const duration=Number(c.billed_seconds||0);const isFree=!!started&&earning===0&&Number(c.billed_amount||0)===0&&(Number(c.free_minutes_consumed_live||0)>0||Number(c.call_free_minutes_consumed_live||0)>0||Number(c.free_minutes_snapshot||0)>0||Number(c.call_free_minutes_snapshot||0)>0);const label=statusLabel(c);return {id:c.id,channel:c.channel,user_name:userName(c.user_id),event_at:c.closed_at||c.accepted_at||c.astrologer_accepted_at||c.requested_at||c.created_at,duration_seconds:duration,earning,is_free:isFree,status:c.status,status_label:isFree?'Free · '+label:label,status_class:['accepted','call_accepted','closed','completed'].includes(String(c.status))?'ok':['requested','call_requested_astrologer','call_requested_user','astrologer_accepted'].includes(String(c.status))?'pending':'danger'};});
   const activityDaily={}; for(const v of activity){const d=String(v.event_at||'').slice(0,10);if(!d)continue;if(!activityDaily[d])activityDaily[d]={total:0,chat:0,call:0,free_count:0};activityDaily[d].total+=Number(v.earning||0);if(v.channel==='chat')activityDaily[d].chat+=Number(v.earning||0);if(v.channel==='call')activityDaily[d].call+=Number(v.earning||0);if(v.is_free)activityDaily[d].free_count+=1;}
   // Merge days that contain activity but no paid earning, so free/missed records
   // are still represented in the selected date range.
   for(const [d,v] of Object.entries(activityDaily)){if(!daily[d])daily[d]={total:0,chat:0,call:0};daily[d].free_count=Number(v.free_count||0);}
   const payouts=await safe(`/rest/v1/payouts?astrologer_id=eq.${encodeURIComponent(u.id)}&select=*&order=period_start.desc&limit=24`,[]);
   return json(res,200,{total:netAmount,gross,commission,net:netAmount,varta:sum('varta'),affiliate:sum('affiliate'),reportAffiliate:sum('report_affiliate'),service:sum('service'),today:todayRows.reduce((s,x)=>s+Number(x.net_amount??x.amount??0),0),daily,payouts,chats:chatRows,calls:callRows,activity});
 }
 if(req.method==='GET'&&view==='tutorials'){
   const rows=await safe('/rest/v1/platform_settings?key=eq.astrologer_training_videos&select=value&limit=1',[]);
   const videos=Array.isArray(rows[0]?.value)?rows[0].value.filter(v=>v&&v.url&&v.active!==false).sort((a,b)=>Number(a.order||0)-Number(b.order||0)):[];
   return json(res,200,{videos});
 }
 if(req.method==='GET'&&view==='reviews'){
   const rows=await safe(`/rest/v1/reviews?astrologer_id=eq.${encodeURIComponent(u.id)}&select=*&order=created_at.desc&limit=500`,[]);
   return json(res,200,{reviews:rows});
 }
 if(req.method==='GET'&&view==='payouts'){
   const rows=await safe(`/rest/v1/payouts?astrologer_id=eq.${encodeURIComponent(u.id)}&select=*&order=period_start.desc,created_at.desc&limit=24`,[]);
   const key=`astrologer_payment_details_${u.id}`;
   const drows=await safe(`/rest/v1/platform_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,[]);
   const details=drows[0]?.value&&typeof drows[0].value==='object'?drows[0].value:{};
   return json(res,200,{payouts:rows,paymentDetails:details});
 }
 if(req.method==='GET'&&view==='payment-details'){
   const key=`astrologer_payment_details_${u.id}`;
   const rows=await safe(`/rest/v1/platform_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,[]);
   return json(res,200,{paymentDetails:rows[0]?.value&&typeof rows[0].value==='object'?rows[0].value:{}});
 }
 if(req.method==='GET'&&view==='performance'){
   const start=new Date(Date.now()-30*86400000).toISOString();const rows=await safe(`/rest/v1/astrologer_performance_daily?astrologer_id=eq.${encodeURIComponent(u.id)}&day=gte.${encodeURIComponent(start.slice(0,10))}&select=*`,[]);
   const avg=(key)=>{const a=rows.map(x=>Number(x[key])).filter(Number.isFinite);return a.length?Math.round(a.reduce((s,v)=>s+v,0)/a.length*100)/100:0};
   const reviews=await safe(`/rest/v1/reviews?astrologer_id=eq.${encodeURIComponent(u.id)}&moderation_status=eq.approved&select=rating`,[]);const rating=reviews.length?Math.round(reviews.reduce((s,r)=>s+Number(r.rating||0),0)/reviews.length*10)/10:0;const a=await getAstro(u.id);
   return json(res,200,{callRating:'NA',chatRating:'NA',chatQuality:avg('chat_quality'),liveHours:avg('live_hours'),callPickup:avg('call_pickup_rate'),chatPickup:avg('chat_pickup_rate'),conversion:avg('conversion_rate'),responseTime:avg('response_time_sec'),loginHours:avg('login_hours'),visibleRating:rating,followers:Number(a?.followers_count||0),reviews:reviews.length,violations:Number(a?.policy_violations||0)});
 }
 if(req.method==='POST'){
   const b=req.body||{};
   if(b.action==='toggle'){
     const map={call:'call_enabled',chat:'chat_enabled',video:'video_enabled',boost:'boost_enabled',live:'online'};const col=map[String(b.key||'')];if(!col)return json(res,400,{error:'Invalid toggle'});const rows=await sbreq(`/rest/v1/astrologers?id=eq.${encodeURIComponent(u.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...{[col]:!!b.value},...(col==='online'?{last_seen:b.value?new Date().toISOString():null}:{})})});return json(res,200,{ok:true,astrologer:rows[0]||null});
   }
   if(b.action==='leave'){if(!b.from||!b.to)return json(res,400,{error:'Leave dates required'});const rows=await sbreq('/rest/v1/astrologer_leaves',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({astrologer_id:u.id,from_date:b.from,to_date:b.to,reason:String(b.reason||''),status:'pending'})});return json(res,201,{leave:rows[0]});}
   if(b.action==='ticket'){if(!b.subject)return json(res,400,{error:'Subject required'});const rows=await sbreq('/rest/v1/support_tickets',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:u.id,subject:String(b.subject),message:String(b.message||''),status:'open'})});return json(res,201,{ticket:rows[0]});}
   if(b.action==='payment-details'){
     const clean={account_holder:String(b.account_holder||'').trim(),bank_name:String(b.bank_name||'').trim(),account_number:String(b.account_number||'').trim(),ifsc:String(b.ifsc||'').trim().toUpperCase(),account_type:String(b.account_type||'Savings').trim(),upi_id:String(b.upi_id||'').trim(),note:String(b.note||'').trim(),updated_at:new Date().toISOString()};
     if(!clean.account_holder)return json(res,400,{error:'Account holder name is required'});
     if(!clean.account_number&&!clean.upi_id)return json(res,400,{error:'Bank account number or UPI ID is required'});
     const key=`astrologer_payment_details_${u.id}`;
     await sbreq('/rest/v1/platform_settings',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({key,value:clean,updated_at:new Date().toISOString()})});
     return json(res,200,{ok:true,paymentDetails:clean});
   }
   return json(res,400,{error:'Unknown action'});
 }
 return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:e.message})}};
