const {req:sbreq}=require('./_lib');
const esc=v=>encodeURIComponent(String(v));
function effectiveRate(base,discount){const b=Math.max(0,Number(base)||0);const d=[0,25,50,75].includes(Number(discount))?Number(discount):Math.min(100,Math.max(0,Number(discount)||0));return Math.round(b*(1-d/100)*100)/100}
async function chatBudget(uid,rate){const r=Math.max(0,Number(rate)||0);const free=await userFree(uid);const w=await wallet(uid);const freeMinutes=Math.max(0,Number(free.free_chat_minutes)||0);const balance=Math.max(0,Number(w.balance)||0);const paidMinutes=r>0?Math.max(0,(balance+1e-9)/r):0;const totalMinutes=freeMinutes+paidMinutes;return {free_minutes:freeMinutes,wallet_balance:balance,paid_minutes:paidMinutes,total_minutes:totalMinutes,total_seconds:Math.floor(totalMinutes*60),rate:r};}
async function commissionPercent(){try{const r=await sbreq('/rest/v1/platform_settings?key=eq.payment_settings&select=value&limit=1');const v=r[0]?.value||{};const n=Number(v.commission_percent);return Number.isFinite(n)?Math.min(100,Math.max(0,n)):20}catch{return 20}}
async function wallet(uid){let r=await sbreq(`/rest/v1/wallets?user_id=eq.${esc(uid)}&select=*&limit=1`);if(r[0])return r[0];r=await sbreq('/rest/v1/wallets',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:uid,balance:0})});return r[0]}
async function userFree(uid){const r=await sbreq(`/rest/v1/user_accounts?id=eq.${esc(uid)}&select=id,free_chat_minutes,free_chat_minutes_used&limit=1`);return r[0]||{id:uid,free_chat_minutes:0,free_chat_minutes_used:0}}
async function activeChatOffers(uid){
 const now=new Date().toISOString();
 let offers=[];
 try{offers=await sbreq(`/rest/v1/chat_festival_offers?active=eq.true&start_at=lte.${encodeURIComponent(now)}&end_at=gte.${encodeURIComponent(now)}&select=*&order=created_at.desc&limit=100`)}catch{return []}
 const out=[];
 for(const o of offers){
  const target=String(o.target||'all');
  if(target==='selected'&&!(Array.isArray(o.user_ids)&&o.user_ids.map(String).includes(String(uid))))continue;
  const claims=await sbreq(`/rest/v1/chat_offer_claims?offer_id=eq.${esc(o.id)}&user_id=eq.${esc(uid)}&select=id&limit=1`);
  if(claims[0])continue;
  out.push(o);
 }
 return out;
}
async function applyOfferToUser(uid,o){
 const mins=Math.max(0,Math.floor(Number(o?.minutes)||0));
 if(!uid||!o?.id||!mins)return 0;
 try{
   // Claim first. The database unique(offer_id,user_id) prevents a duplicate grant.
   await sbreq('/rest/v1/chat_offer_claims',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({offer_id:o.id,user_id:uid,minutes_granted:mins})});
 }catch(e){
   // A duplicate claim means this user already received this offer.
   if(/duplicate|unique|23505/i.test(String(e?.message||'')))return 0;
   return 0;
 }
 try{
   const current=await userFree(uid); const next=Number(current.free_chat_minutes||0)+mins;
   await sbreq(`/rest/v1/user_accounts?id=eq.${esc(uid)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({free_chat_minutes:next,updated_at:new Date().toISOString()})});
   await sbreq('/rest/v1/chat_free_minute_transactions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:uid,minutes:mins,type:'credit',source:'festival_offer',description:`${String(o.name||'Festival Offer')} — free chat minutes`})});
   return mins;
 }catch(e){
   // Do not leave a claim behind when the credit itself failed; best-effort rollback.
   try{await sbreq(`/rest/v1/chat_offer_claims?offer_id=eq.${esc(o.id)}&user_id=eq.${esc(uid)}`,{method:'DELETE'})}catch(_){}
   return 0;
 }
}
async function applyActiveChatOffers(uid){
 const offers=await activeChatOffers(uid); let added=0;
 for(const o of offers)added+=await applyOfferToUser(uid,o);
 return added;
}
async function grantFreeMinutes(uid,minutes,source='admin',description='Free chat minutes'){
 const n=Math.max(0,Math.floor(Number(minutes)||0)); if(!n)return 0;
 const current=await userFree(uid); const next=Number(current.free_chat_minutes||0)+n;
 await sbreq(`/rest/v1/user_accounts?id=eq.${esc(uid)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({free_chat_minutes:next,updated_at:new Date().toISOString()})});
 try{await sbreq('/rest/v1/chat_free_minute_transactions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:uid,minutes:n,type:'credit',source,description})})}catch(e){}
 return next;
}
async function consumeFreeMinutes(uid,minutes,conversationId,source='chat'){
 const n=Math.max(0,Number(minutes)||0); if(!n)return {used:0,remaining:0};
 const current=await userFree(uid); const available=Math.max(0,Number(current.free_chat_minutes||0)); const used=Math.min(available,n); if(used<=0)return {used:0,remaining:available};
 const next=Math.max(0,available-used); const totalUsed=Math.max(0,Number(current.free_chat_minutes_used||0))+used;
 await sbreq(`/rest/v1/user_accounts?id=eq.${esc(uid)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({free_chat_minutes:next,free_chat_minutes_used:totalUsed,updated_at:new Date().toISOString()})});
 try{await sbreq('/rest/v1/chat_free_minute_transactions',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:uid,minutes:used,type:'debit',source,conversation_id:conversationId||null,description:`Free ${source} ${used} minute${used===1?'':'s'} used`})})}catch(e){}
 return {used,remaining:next};
}
async function chargeConversation(c){
 if(!c||!c.astrologer_id||!c.user_id||c.channel!=='chat'||!c.accepted_at)return {charged:false,reason:'not_billable'};
 const existing=await sbreq(`/rest/v1/astrologer_earnings?conversation_id=eq.${esc(c.id)}&select=*&limit=1`);if(existing[0])return {charged:true,existing:existing[0],net:Number(existing[0].net_amount??existing[0].amount??0),wallet_amount:Number(existing[0].paid_amount??0)};
 // Billing must begin exactly at the user-confirmed chat start. Never fall back to an
 // old accepted_at timestamp: doing so can turn a short chat into a huge charge.
 if(!c.chat_started_at)return {charged:false,reason:'chat_not_started',minutes:0,free_minutes_used:0,wallet_amount:0};
 const started=new Date(c.chat_started_at).getTime(),ended=new Date(c.closed_at||new Date()).getTime();
 if(!Number.isFinite(started)||!Number.isFinite(ended)||ended<started)return {charged:false,reason:'invalid_chat_timing',minutes:0,free_minutes_used:0,wallet_amount:0};
 let seconds=Math.max(0,Math.round((ended-started)/1000));
 const budgetSeconds=Math.max(0,Number(c.chat_budget_seconds||0));
 // A started paid chat must always have an explicit reserved budget. If an old
 // conversation lacks it, close safely without charging an unbounded historical duration.
 if(budgetSeconds<=0)return {charged:false,reason:'chat_budget_missing',minutes:0,free_minutes_used:0,wallet_amount:0};
 seconds=Math.min(seconds,budgetSeconds);
 if(seconds<=0)return {charged:false,reason:'zero_duration',minutes:0,free_minutes_used:0,wallet_amount:0};
 const minutes=Math.round((seconds/60)*100)/100;
 const rate=Math.max(0,Number(c.fee_snapshot||0));
 if(rate<=0)return {charged:false,reason:'zero_rate',minutes,free_minutes_used:0,wallet_amount:0};
 const commPct=await commissionPercent();
 // Primary path: one Postgres transaction settles free minutes, wallet debit,
 // payment ledger and astrologer earning together. This prevents a wallet debit
 // without the corresponding astrologer earning.
 try{
   const freeBefore=await userFree(c.user_id);
   const expectedFreeUse=Math.min(minutes,Math.max(0,Number(freeBefore.free_chat_minutes||0)));
   const rpc=await sbreq('/rest/v1/rpc/settle_chat_billing_exact',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_conversation_id:c.id,p_user_id:c.user_id,p_astrologer_id:c.astrologer_id,p_rate:rate,p_commission_percent:commPct,p_seconds:seconds,p_free_already_used:Number(c.free_minutes_consumed_live||0)})});
   const r=rpc||{};
   // Verify the database actually consumed the free minutes. This protects older
   // deployments where the SQL function may exist but was created from an older
   // version that did not update user_accounts correctly.
   if(!r.existing && expectedFreeUse>0){
     const freeAfter=await userFree(c.user_id);
     const actualUsed=Math.max(0,Number(freeBefore.free_chat_minutes||0)-Number(freeAfter.free_chat_minutes||0));
     const missing=Math.max(0,Math.round((expectedFreeUse-actualUsed)*10000)/10000);
     if(missing>0)await consumeFreeMinutes(c.user_id,missing,c.id);
   }
   return {charged:true,minutes,seconds,rate,gross:Number(r.gross||0),commission:Number(r.commission||0),net:Number(r.net||0),free_minutes_used:Number(r.free_minutes_used||expectedFreeUse),paid_minutes:Number(r.paid_minutes||Math.max(0,minutes-expectedFreeUse)),wallet_amount:Number(r.wallet_amount||0),payment:r.payment_id?{id:r.payment_id}:null,earning:r.earning_id?{id:r.earning_id,net_amount:Number(r.net||0)}:null,existing:!!r.existing};
 }catch(rpcErr){
   const msg=String(rpcErr?.message||'');
   const m=msg.match(/INSUFFICIENT_WALLET:([0-9.]+):([0-9.]+)/i);
   if(m)return {charged:false,insufficient:true,required:Number(m[1]),balance:Number(m[2]),minutes,rate};
   if(/function .*settle_chat_billing_exact|does not exist|404|schema cache/i.test(msg)){
     const err=new Error('Atomic chat billing database function is missing. Apply the approved production SQL migration before enabling paid chat.');err.code='ATOMIC_BILLING_NOT_CONFIGURED';throw err;
   }
   throw rpcErr;
 }
 // Billing requires the atomic database RPC; no multi-step fallback is permitted.
}

async function chargeCall(c){
 if(!c||c.channel!=='call'||!c.user_id||!c.astrologer_id||!c.call_started_at)return {charged:false,reason:'call_not_started',wallet_amount:0};
 const existing=await sbreq(`/rest/v1/astrologer_earnings?conversation_id=eq.${esc(c.id)}&select=*&limit=1`);if(existing[0])return {charged:true,existing:existing[0],net:Number(existing[0].net_amount??existing[0].amount??0),wallet_amount:Number(existing[0].paid_amount??0)};
 const started=new Date(c.call_started_at).getTime(),ended=new Date(c.closed_at||new Date()).getTime();
 if(!Number.isFinite(started)||!Number.isFinite(ended)||ended<started)return {charged:false,reason:'invalid_call_timing',wallet_amount:0};
 let seconds=Math.max(0,Math.floor((ended-started)/1000));
 const budget=Math.max(0,Number(c.call_budget_seconds||0));seconds=Math.min(seconds,budget);
 const rate=Math.max(0,Number(c.fee_snapshot||0));if(seconds<=0||rate<=0)return {charged:false,reason:'zero_duration',seconds,wallet_amount:0};
 const minutes=Math.round(seconds/60*10000)/10000, commPct=await commissionPercent();
 try{
  const freeBefore=await userFree(c.user_id);const expectedFree=Math.min(minutes,Math.max(0,Number(freeBefore.free_chat_minutes||0)));
  const rpc=await sbreq('/rest/v1/rpc/settle_call_billing_exact',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_conversation_id:c.id,p_user_id:c.user_id,p_astrologer_id:c.astrologer_id,p_rate:rate,p_commission_percent:commPct,p_seconds:seconds,p_free_already_used:Number(c.call_free_minutes_consumed_live||0)})});
  const r=rpc||{};return {charged:true,minutes,seconds,rate,gross:Number(r.gross||0),commission:Number(r.commission||0),net:Number(r.net||0),free_minutes_used:Number(r.free_minutes_used||expectedFree),paid_minutes:Number(r.paid_minutes||0),wallet_amount:Number(r.wallet_amount||0),earning:r.earning_id?{id:r.earning_id}:null,existing:!!r.existing};
 }catch(e){
  const msg=String(e?.message||'');const m=msg.match(/INSUFFICIENT_WALLET:([0-9.]+):([0-9.]+)/i);if(m)return {charged:false,insufficient:true,required:Number(m[1]),balance:Number(m[2]),minutes,seconds,rate};
  if(/settle_call_billing_exact|does not exist|404|schema cache/i.test(msg)){
    const err=new Error('Atomic call billing database function is missing. Apply the approved production SQL migration before enabling paid calls.');err.code='ATOMIC_BILLING_NOT_CONFIGURED';throw err;
  }
  throw e;
 }
 // Atomic RPC is required for all paid call settlement.
}
module.exports={commissionPercent,chargeConversation,chargeCall,wallet,grantFreeMinutes,consumeFreeMinutes,applyActiveChatOffers,applyOfferToUser,userFree,chatBudget,effectiveRate};
