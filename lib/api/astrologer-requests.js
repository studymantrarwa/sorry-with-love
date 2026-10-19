const {authUser,req:sbreq,json,profile}=require('./_lib');
const {applyActiveChatOffers,chatBudget}=require('./finance');
const {createNotification}=require('../notify-push');
const esc=v=>encodeURIComponent(String(v));const RETENTION_MS=172800000;const t=()=>Date.now();
async function expire(c){if(c.status==='requested'&&t()-new Date(c.requested_at||c.created_at).getTime()>120000){const r=await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'missed',missed_by:'astrologer',retention_until:null})});return r[0]||{...c,status:'missed',missed_by:'user'}}return c}
async function decorate(rows){return Promise.all(rows.map(async c=>{
  let u=null,kundli=null;
  try{u=(await sbreq(`/rest/v1/user_profiles?id=eq.${esc(c.user_id)}&select=id,full_name,avatar_url,blocked`))[0]||null}catch(_){}
  try{
    const kid=String(c.kundli_id||'').trim();
    if(kid)kundli=(await sbreq(`/rest/v1/kundalis?id=eq.${esc(kid)}&select=id,name,dob,birth_time,place,gender,latitude,longitude,timezone,created_at`))[0]||null;
    if(!kundli){const msgs=await sbreq(`/rest/v1/messages?conversation_id=eq.${esc(c.id)}&kundali_id=not.is.null&select=kundali_id,created_at&order=created_at.desc&limit=1`);const mid=msgs[0]?.kundali_id;if(mid)kundli=(await sbreq(`/rest/v1/kundalis?id=eq.${esc(mid)}&select=id,name,dob,birth_time,place,gender,latitude,longitude,timezone,created_at`))[0]||null;}
  }catch(_){}
  return {...c,user:u,kundli};
}))}
module.exports=async(req,res)=>{try{
 const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});const p=await profile(u.id,u.account_type);if(p?.role!=='astrologer')return json(res,403,{error:'Astrologer only'});if(p.blocked)return json(res,403,{error:'Account blocked'});
 if(req.method==='GET'){
  let rows=await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(u.id)}&channel=eq.chat&select=*&order=created_at.desc&limit=150`);
  rows=await Promise.all(rows.map(async c=>{
    c=await expire(c);
    if(c.status==='accepted'&&!c.chat_started_at){
      const deadline=c.user_confirm_deadline?new Date(c.user_confirm_deadline).getTime():0;
      if(deadline>Date.now()){
        const z=await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'astrologer_accepted',accepted_at:null,chat_started_at:null,chat_budget_seconds:0})});
        c=z[0]||{...c,status:'astrologer_accepted',accepted_at:null,chat_started_at:null,chat_budget_seconds:0};
      }else{
        const z=await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'requested',requested_at:new Date().toISOString(),astrologer_accepted_at:null,user_confirm_deadline:null,user_confirmed_at:null,accepted_at:null,chat_started_at:null,chat_budget_seconds:0,billed_seconds:0,billed_amount:0,missed_by:null,closed_at:null,retention_until:null})});
        c=z[0]||{...c,status:'requested'};
      }
    }
    return c;
  }));
  const cutoff=t()-RETENTION_MS;rows=rows.filter(c=>['requested','astrologer_accepted','accepted'].includes(c.status)||new Date(c.closed_at||c.last_message_at||c.created_at||0).getTime()>=cutoff);rows=await Promise.all(rows.map(async c=>({...c,history_visibility:'recent_48h'})));return json(res,200,{requests:await decorate(rows)});
}
 if(req.method==='POST'){
   const b=req.body||{},id=String(b.conversationId||'');if(!id)return json(res,400,{error:'conversationId required'});let c=(await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&astrologer_id=eq.${esc(u.id)}&channel=eq.chat&select=*`))[0];if(!c)return json(res,404,{error:'Conversation not found'});c=await expire(c);
   if(b.action==='accept'){
    if(c.status!=='requested')return json(res,409,{error:`Request is already ${c.status}`});
    const active=(await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(u.id)}&channel=eq.chat&status=eq.accepted&chat_started_at=not.is.null&select=id&limit=1`))[0]||null;
    if(active&&String(active.id)!==String(c.id))return json(res,409,{error:'Astrologer is currently busy with another active chat. This request remains pending.'});
    const sec=Math.max(0,Math.round((t()-new Date(c.requested_at||c.created_at).getTime())/1000));if(sec>120)return json(res,409,{error:'2 minute astrologer acceptance window expired'});
   // Always read the current Admin-set price when accepting. Older requests may have been created
   // before the Admin configured the price, so do not rely only on fee_snapshot.
   const astro=(await sbreq(`/rest/v1/astrologers?id=eq.${esc(u.id)}&select=id,fee_per_minute,fee,discount,verified,blocked,chat_enabled`))[0]||null;
   if(!astro||!astro.verified||astro.blocked)return json(res,403,{error:'Astrologer is not approved or is blocked'});
   const storedSnapshot=Math.max(0,Number(c.fee_snapshot||0));
   const baseRate=Math.max(0,Number(astro.fee_per_minute||astro.fee||storedSnapshot||0));
   const discount=[0,25,50,75].includes(Number(astro.discount))?Number(astro.discount):0;
   const currentRate=Math.round(baseRate*(1-discount/100)*100)/100;
   if(currentRate<=0)return json(res,409,{error:'Admin ने अभी Chat price set नहीं किया है। पहले Admin Panel में astrologer का price set करें।'});
   if(astro.chat_enabled===false)return json(res,409,{error:'Astrologer chat is OFF'});
   // Accept only means the astrologer has accepted the request. The paid chat must
   // NOT start or consume time until the user explicitly confirms.
   const acceptedAt=new Date().toISOString();
   const deadline=new Date(t()+120000).toISOString();
   const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.requested`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'astrologer_accepted',fee_snapshot:currentRate,discount_snapshot:discount,astrologer_accepted_at:acceptedAt,user_confirm_deadline:deadline,user_confirmed_at:null,accepted_at:null,chat_started_at:null,chat_budget_seconds:0,billed_seconds:0,billed_amount:0,astrologer_response_seconds:sec})});
   const conversation=rows[0]||{...c,status:'astrologer_accepted',fee_snapshot:currentRate,discount_snapshot:discount,astrologer_accepted_at:acceptedAt,user_confirm_deadline:deadline};
   await createNotification({recipientId:c.user_id,recipientRole:'user',userId:c.user_id,title:'💬 Astrologer ने Chat Accept की',body:'आपका chat request accept हो गया है। Chat खोलकर Confirm & Start Chat करें।',notificationType:'chat_accepted',link:`/chat.html?role=user&conversation_id=${encodeURIComponent(id)}`,data:{conversationId:id}});
   return json(res,200,{conversation,rate:currentRate,discount,user_confirm_deadline:deadline});}   if(b.action==='reject'){
     if(c.status!=='requested')return json(res,409,{error:`Request is already ${c.status}`});
     const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.requested`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({
       status:'rejected',waiting_until:null,waiting_for_conversation_id:null,
       user_confirm_deadline:null,user_confirmed_at:null,accepted_at:null,
       chat_started_at:null,chat_budget_seconds:0,session_end_at:null,
       billed_seconds:0,billed_amount:0,closed_at:new Date().toISOString(),
       retention_until:null
     })});
     const updated=rows[0]||{...c,status:'rejected'};
     await createNotification({recipientId:c.user_id,recipientRole:'user',userId:c.user_id,title:'❌ Chat Request Rejected',body:'Astrologer ने आपका chat request reject कर दिया। Please try again.',notificationType:'chat_rejected',link:'/',data:{conversationId:id,status:'rejected'}});
     return json(res,200,{conversation:updated,rejected:true});
   }
   if(b.action==='close'){const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'closed',closed_at:new Date().toISOString(),retention_until:null})});return json(res,200,{conversation:rows[0]});}
   return json(res,400,{error:'Unknown action'});
 }
 return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:e.message})}};
