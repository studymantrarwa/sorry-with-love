const {authUser,req:sbreq,json,ensureProfile}=require('./_lib');
const crypto=require('crypto');
const {wallet,chargeConversation,applyActiveChatOffers,userFree,chatBudget,effectiveRate,consumeFreeMinutes}=require('./finance');
const {createNotification}=require('../notify-push');
const esc=v=>encodeURIComponent(String(v));
const ACTIVE=['requested','astrologer_accepted','accepted'];
const HISTORY=['closed','missed','rejected'];
const now=()=>Date.now();
function deterministicUuid(key){
 const h=crypto.createHash('sha256').update(String(key)).digest();
 h[6]=(h[6]&0x0f)|0x40; h[8]=(h[8]&0x3f)|0x80;
 const hex=h.toString('hex');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
async function getConv(id){
 const r=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&select=*`);
 let c=r[0]||null;
 // Repair legacy chats created by the old flow. An accepted chat without
 // chat_started_at was never actually started by the user, so it must never
 // appear as Active or become billable. If its confirmation window is still
 // valid, expose it as waiting-for-user-confirmation; otherwise send it back
 // to a fresh request state so the astrologer can accept again.
 if(c&&c.channel==='chat'&&c.status==='accepted'&&!c.chat_started_at){
   // Legacy records from the pre-confirmation flow must not be recycled or
   // converted back into a fresh request. That used to make old chats vanish
   // from History and could also reuse the same conversation_id for a new chat.
   // Only a still-valid confirmation window is promoted to pending confirmation.
   const deadline=c.user_confirm_deadline?new Date(c.user_confirm_deadline).getTime():0;
   if(deadline>Date.now()){
     const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'astrologer_accepted',accepted_at:null,chat_started_at:null,chat_budget_seconds:0})});
     c=rows[0]||{...c,status:'astrologer_accepted',accepted_at:null,chat_started_at:null,chat_budget_seconds:0};
   }
 }
 return c
}
async function decorate(c){
 if(!c)return null;
 const out={...c,user:null,astrologer:null,admin:null};
 try{
  const [users,astros,admins]=await Promise.all([
   c.user_id?sbreq(`/rest/v1/user_profiles?id=eq.${esc(c.user_id)}&select=id,full_name,avatar_url,blocked`):Promise.resolve([]),
   c.astrologer_id?sbreq(`/rest/v1/astrologers?id=eq.${esc(c.astrologer_id)}&select=id,full_name,avatar_url,blocked,online,chat_enabled,call_enabled`):Promise.resolve([]),
   c.admin_id?sbreq(`/rest/v1/admin_profiles?id=eq.${esc(c.admin_id)}&select=id,full_name,avatar_url`):Promise.resolve([])
  ]);
  out.user=users[0]||null;out.astrologer=astros[0]||null;out.admin=admins[0]||null;
 }catch(_){
  try{
   const ids=[c.user_id,c.astrologer_id,c.admin_id].filter(Boolean);
   if(ids.length){
    const ps=await sbreq(`/rest/v1/profiles?id=in.(${ids.map(esc).join(',')})&select=id,full_name,avatar_url,role`);
    const find=id=>id?ps.find(x=>String(x.id)===String(id))||null:null;
    out.user=find(c.user_id);out.astrologer=find(c.astrologer_id);out.admin=find(c.admin_id);
   }
  }catch(_2){}
 }
 return out;
}
function allowed(u,p,c){return !!c&&(c.user_id===u.id||c.astrologer_id===u.id||c.admin_id===u.id||p?.role==='admin')}
async function expire(c){
 if(!c)return c;
 if(c.status==='requested'&&now()-new Date(c.requested_at||c.created_at).getTime()>120000){
  const r=await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'missed',missed_by:'astrologer',retention_until:null})});
  return r[0]||{...c,status:'missed',missed_by:'astrologer'};
 }
 if(c.status==='astrologer_accepted'&&c.user_confirm_deadline&&now()>new Date(c.user_confirm_deadline).getTime()){
  const r=await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'missed',missed_by:'user',retention_until:null})});
  return r[0]||{...c,status:'missed',missed_by:'user'};
 }
 return c;
}
async function reconcileWaiting(aid){
 if(!aid)return;
 try{
  let active=(await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(aid)}&channel=eq.chat&status=eq.accepted&chat_started_at=not.is.null&select=*&order=created_at.desc&limit=1`))[0]||null;
  if(active){
    const endMs=new Date(active.session_end_at||new Date(new Date(active.chat_started_at).getTime()+Math.max(0,Number(active.chat_budget_seconds||0))*1000)).getTime();
    if(Number.isFinite(endMs)&&endMs<=Date.now()){
      try{
        const bill=await chargeConversation({...active,closed_at:new Date(endMs).toISOString()});
        const closed=(await sbreq(`/rest/v1/conversations?id=eq.${esc(active.id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'closed',closed_at:new Date(endMs).toISOString(),session_end_at:new Date(endMs).toISOString(),billed_seconds:Number(bill?.seconds||active.chat_budget_seconds||0),billed_amount:Number(bill?.wallet_amount||0),retention_until:null})}))[0];
        active=null;
      }catch(_){}
    }
  }
  if(active)return active;
  const waiting=await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(aid)}&channel=eq.chat&status=eq.waiting&select=*&order=created_at.asc&limit=50`);
  for(const w of waiting){
    const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(w.id)}&status=eq.waiting`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'requested',waiting_for_conversation_id:null,waiting_until:null,requested_at:new Date().toISOString(),missed_by:null})});
    const promoted=rows[0];
    if(promoted)await createNotification({recipientId:aid,recipientRole:'astrologer',title:'💬 Waiting Chat Request Ready',body:'एक waiting user अब available है। कृपया request Accept/Reject करें।',notificationType:'chat_request',link:`/astrologer-dashboard.html?conversation_id=${encodeURIComponent(w.id)}`,data:{conversationId:w.id}});
  }
  return null;
 }catch(_){return null}
}
async function availableChatSeconds(c){
 const rate=Math.max(0,Number(c?.fee_snapshot||0));
 if(rate<=0||!c?.chat_started_at)return 0;
 const freeNow=Math.max(0,Number((await userFree(c.user_id)).free_chat_minutes||0));
 const walletNow=await wallet(c.user_id);
 const affordable=Math.max(0,Math.floor((freeNow+(Math.max(0,Number(walletNow.balance||0))/rate))*60));
 const budget=Math.max(0,Number(c.chat_budget_seconds||0));
 return Math.min(budget||affordable,affordable);
}
async function syncLiveFreeTime(c, elapsedSeconds){
 const target=Math.max(0,Math.min(Number(c.free_minutes_snapshot||0), Number(elapsedSeconds||0)/60));
 const used=Math.max(0,Number(c.free_minutes_consumed_live||0));
 const delta=Math.max(0,Math.round((target-used)*10000)/10000);
 if(delta<=0)return {used,delta:0,remainingFree:Math.max(0,Number(c.free_minutes_snapshot||0)-used)};
 try{
   const r=await sbreq('/rest/v1/rpc/consume_chat_free_time_live',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_conversation_id:c.id,p_user_id:c.user_id,p_minutes:delta})});
   const x=r||{};
   return {used:Number(x.used_total??(used+delta)),delta:Number(x.used_delta??delta),remainingFree:Number(x.remaining_free??Math.max(0,Number(c.free_minutes_snapshot||0)-used-delta))};
 }catch(e){
   // Compatibility fallback for deployments before the live-free-time SQL migration.
   // The normal path is the atomic RPC above.
   if(!/function .*consume_chat_free_time_live|does not exist|404|schema cache/i.test(String(e?.message||'')))throw e;
   const current=await userFree(c.user_id);
   const take=Math.min(delta,Math.max(0,Number(current.free_chat_minutes||0)));
   if(take>0)await consumeFreeMinutes(c.user_id,take,c.id);
   const newUsed=used+take; try{await sbreq(`/rest/v1/conversations?id=eq.${esc(c.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({free_minutes_consumed_live:newUsed})})}catch(_){} return {used:newUsed,delta:take,remainingFree:Math.max(0,Number(c.free_minutes_snapshot||0)-newUsed)};
 }
}
async function affordableChatSeconds(c, endedAt){
 const available=await availableChatSeconds(c);
 const startedMs=new Date(c.chat_started_at).getTime();
 const endedMs=new Date(endedAt||new Date()).getTime();
 const elapsed=Number.isFinite(startedMs)&&Number.isFinite(endedMs)?Math.max(0,Math.floor((endedMs-startedMs)/1000)):0;
 return Math.min(elapsed,available);
}
async function listFor(u,p){
 let q;
 if(p?.role==='admin') q='/rest/v1/conversations?select=*&limit=5000';
 else q=`/rest/v1/conversations?or=(user_id.eq.${esc(u.id)},astrologer_id.eq.${esc(u.id)},admin_id.eq.${esc(u.id)})&channel=in.(chat,support)&select=*&limit=5000`;
 let rows=await sbreq(q);
 rows=await Promise.all(rows.map(expire));
 // IMPORTANT: User chat history is permanent. Never remove an older chat just
 // because a new chat with the same astrologer was created. Every conversation
 // row is its own Chat ID and must remain independently reopenable/reviewable.
 if(p?.role==='astrologer'){
  // Astrologer dashboard history is permanent. Active chats and all released
  // chats remain available so the Chat History box can show the complete record.
  rows=rows.filter(c=>ACTIVE.includes(c.status)||['closed','missed','rejected','ended','completed','cancelled'].includes(c.status));
  try{const ers=await sbreq(`/rest/v1/astrologer_earnings?astrologer_id=eq.${esc(u.id)}&select=conversation_id,net_amount,amount,gross_amount,commission_amount,earned_at&limit=10000`);const em=new Map(ers.filter(x=>x.conversation_id).map(x=>[String(x.conversation_id),x]));rows=rows.map(c=>{const e=em.get(String(c.id));return {...c,earning_amount:e?Number(e.net_amount??e.amount??0):0,earning_gross:e?Number(e.gross_amount??e.amount??0):0,earning_commission:e?Number(e.commission_amount??0):0,earning_record:e||null}})}catch(_){}
 }
 rows.sort((a,b)=>{
   const ta=new Date(a.last_message_at||a.created_at||0).getTime();
   const tb=new Date(b.last_message_at||b.created_at||0).getTime();
   return tb-ta;
 });
 return rows;
}
async function kundliForUser(kid,userId){
 if(!kid)return null;
 const k=(await sbreq(`/rest/v1/kundalis?id=eq.${esc(kid)}&select=id,user_id,name,dob,birth_time,place,gender,latitude,longitude,timezone,calculation_data`))[0]||null;
 if(!k||k.user_id!==userId)return null;
 return k;
}
async function savePrechat(c,k,u){
 if(!c||!k)return null;
 const body=`__BG_CHAT_INTAKE__\nनाम: ${k.name||''}\nजन्म तारीख: ${k.dob||''}\nजन्म समय: ${k.birth_time||''}\nजन्म स्थान: ${k.place||''}`;
 const messageId=deterministicUuid(`${c.id}:${k.id}:chat_intake`);
 const existing=(await sbreq(`/rest/v1/messages?id=eq.${esc(messageId)}&conversation_id=eq.${esc(c.id)}&select=*`))[0];
 if(existing)return existing;
 const rows=await sbreq('/rest/v1/messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:messageId,conversation_id:c.id,sender_id:u.id,body,kundali_id:k.id})});
 return rows[0]||null;
}
function snapshotFromIntake(m){
 if(!m)return null;
 const lines=String(m.body||'').split('\n');
 const o={kundali_id:m.kundali_id||null};
 for(const line of lines.slice(1)){
   const i=line.indexOf(':'); if(i<0)continue;
   const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();
   if(k==='नाम')o.name=v;
   if(k==='जन्म तारीख')o.dob=v;
   if(k==='जन्म समय')o.birth_time=v;
   if(k==='जन्म स्थान')o.place=v;
 }
 return o.name?o:null;
}
async function shareKundliSnapshotOnce(c,snapshot,u){
 if(!c||!snapshot||!snapshot.name)return null;
 const kid=String(snapshot.kundali_id||c.kundli_id||'').trim();
 const body=`__BG_KUNDLI_SHARE__\nname: ${snapshot.name||'Kundli'}\ndob: ${snapshot.dob||''}\nbirth_time: ${snapshot.birth_time||''}\nplace: ${snapshot.place||''}`;
 const messageId=deterministicUuid(`${c.id}:${kid||'snapshot'}:kundli_auto_share`);
 const existing=(await sbreq(`/rest/v1/messages?id=eq.${esc(messageId)}&conversation_id=eq.${esc(c.id)}&select=*`))[0];
 if(existing)return existing;
 const rows=await sbreq('/rest/v1/messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:messageId,conversation_id:c.id,sender_id:c.user_id,body,kundali_id:kid||null})});
 return rows[0]||null;
}
async function shareKundliOnce(c,k,u){
 if(!c||!k)return null;
 return shareKundliSnapshotOnce(c,{kundali_id:k.id,name:k.name,dob:k.dob,birth_time:k.birth_time,place:k.place},u);
}
async function ensureStartedKundliMessage(c,u){
 // The conversation's selected kundli_id is authoritative. Do not depend on
 // the intake-message lookup succeeding: every newly started chat must show
 // the exact Kundli selected for that request.
 if(!c||c.channel!=='chat'||c.status!=='accepted'||!c.user_id)return null;
 try{
   if(c.kundli_id){
     const selected=await kundliForUser(c.kundli_id,c.user_id);
     if(selected)return await shareKundliOnce(c,selected,{id:c.user_id});
   }
   const intake=await latestIntake(c);
   const snap=snapshotFromIntake(intake);
   if(snap)return await shareKundliSnapshotOnce(c,snap,{id:c.user_id});
 }catch(_){ }
 return null;
}
function prechatData(rows){
 const m=(rows||[]).slice().reverse().find(x=>String(x.body||'').startsWith('__BG_CHAT_INTAKE__'));
 if(!m)return null;
 const lines=String(m.body).split('\n'),o={kundali_id:m.kundali_id||null};
 for(const line of lines.slice(1)){const i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();if(k==='नाम')o.name=v;if(k==='जन्म तारीख')o.dob=v;if(k==='जन्म समय')o.birth_time=v;if(k==='जन्म स्थान')o.place=v;}
 return o;
}
function makeCursor(m){
  if(!m?.created_at||!m?.id)return null;
  return Buffer.from(JSON.stringify({t:m.created_at,id:String(m.id)}),'utf8').toString('base64url');
}
function parseCursor(v){
  if(!v)return null;
  try{
    const o=JSON.parse(Buffer.from(String(v),'base64url').toString('utf8'));
    if(!o?.t||!o?.id)return null;
    return {t:String(o.t),id:String(o.id)};
  }catch(_){return null}
}
function olderFilter(cursor){
  const c=parseCursor(cursor);
  // Backward compatibility with pre-v34.5.6 cached cursors.
  if(!c&&cursor){return `&created_at=lt.${encodeURIComponent(String(cursor))}`;}
  if(!c)return '';
  // Composite cursor: created_at first, id as deterministic tie-breaker.
  // This prevents messages with identical timestamps from being skipped.
  const expr=`(created_at.lt.${c.t},and(created_at.eq.${c.t},id.lt.${c.id}))`;
  return `&or=${encodeURIComponent(expr)}`;
}
function visibleMessageFilter(){
  const expr=`(body.not.like.__BG_CALL_SIGNAL__%,body.not.like.__BG_CHAT_INTAKE__%)`;
  return `&and=${encodeURIComponent(expr)}`;
}
async function messagesFor(id,limit=50,before=null){
  const lim=Math.min(50,Math.max(1,Number(limit)||50));
  let q=`/rest/v1/messages?conversation_id=eq.${esc(id)}${visibleMessageFilter()}&select=*&order=created_at.desc,id.desc&limit=${lim+1}`;
  q+=olderFilter(before);
  const rows=await sbreq(q);
  const hasMore=rows.length>lim;
  const page=rows.slice(0,lim).reverse();
  return {messages:page,has_more:hasMore,oldest_message_cursor:makeCursor(page[0]),oldest_message_at:page[0]?.created_at||null};
}
async function legacyMessagesForPair(c,limit=50,before=null){
  if(!c?.user_id||!c?.astrologer_id)return {messages:[],has_more:false,oldest_message_at:null,oldest_message_cursor:null};
  const lim=Math.min(50,Math.max(1,Number(limit)||50));
  try{
    const convs=await sbreq(`/rest/v1/conversations?user_id=eq.${esc(c.user_id)}&astrologer_id=eq.${esc(c.astrologer_id)}&select=id,created_at,channel&order=created_at.desc&limit=5000`);
    const ids=(convs||[]).filter(x=>String(x.id)!==String(c.id)).map(x=>x.id).filter(Boolean);
    if(!ids.length)return {messages:[],has_more:false,oldest_message_at:null,oldest_message_cursor:null};

    // Read up to 51 real messages from EACH old conversation, then merge them.
    // This keeps the API response at <=50 while ensuring a long old chat cannot
    // hide messages from another old chat and cannot be truncated at 51 rows.
    const all=[];
    for(let i=0;i<ids.length;i+=50){
      const chunk=ids.slice(i,i+50);
      const parts=await Promise.all(chunk.map(cid=>{
        let q=`/rest/v1/messages?conversation_id=eq.${esc(cid)}${visibleMessageFilter()}&select=*&order=created_at.desc,id.desc&limit=${lim+1}`;
        q+=olderFilter(before);
        return sbreq(q);
      }));
      for(const rows of parts)for(const m of (rows||[]))all.push(m);
    }
    all.sort((a,b)=>{
      const t=new Date(b.created_at||0)-new Date(a.created_at||0);
      return t||String(b.id).localeCompare(String(a.id));
    });
    const hasMore=all.length>lim;
    const page=all.slice(0,lim).reverse();
    return {messages:page,has_more:hasMore,oldest_message_at:page[0]?.created_at||null,oldest_message_cursor:makeCursor(page[0])};
  }catch(_){return {messages:[],has_more:false,oldest_message_at:null,oldest_message_cursor:null};}
}
async function latestIntake(c){
  try{
    const rows=await sbreq(`/rest/v1/messages?conversation_id=eq.${esc(c.id)}&body=like.${encodeURIComponent('__BG_CHAT_INTAKE__%')}&select=*&order=created_at.desc&limit=1`);
    return rows[0]||null;
  }catch(_){return null}
}
module.exports=async(req,res)=>{try{
 const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});
 const p=await ensureProfile(u);if(p?.blocked)return json(res,403,{error:'Account blocked'});
 if(req.method==='GET'){
  const id=String(req.query?.conversation_id||req.query?.id||'').trim();
  if(id){
   const c=await expire(await getConv(id));if(!allowed(u,p,c))return json(res,403,{error:'Forbidden'});
   if(String(req.query?.action||'')==='timer'){
    if(c.channel!=='chat'||c.status!=='accepted'||!c.accepted_at||!c.chat_started_at)return json(res,200,{active:false,remaining_seconds:0,reason:'chat_not_started'});
    const started=new Date(c.chat_started_at).getTime();
    if(!Number.isFinite(started))return json(res,200,{active:false,remaining_seconds:0,reason:'chat_not_started'});
    const budget=Math.max(0,Number(c.chat_budget_seconds||0));
    const elapsed=Math.max(0,Math.floor((now()-started)/1000));
    // Free minutes are consumed continuously while the chat is active. The
    // remaining timer is therefore the unconsumed free time + the wallet time
    // still available, minus only the paid seconds already used in this chat.
    const live=await syncLiveFreeTime(c,elapsed);
    const freeRemainingSeconds=Math.max(0,Number(live.remainingFree||0)*60);
    const walletNow=await wallet(c.user_id);
    const rate=Math.max(0,Number(c.fee_snapshot||0));
    const walletSeconds=rate>0?Math.max(0,Number(walletNow.balance||0)/rate*60):0;
    const freeUsedSeconds=Math.min(elapsed,Number(c.free_minutes_snapshot||0)*60,Number(live.used||0)*60);
    const paidElapsed=Math.max(0,elapsed-freeUsedSeconds);
    const remaining=Math.max(0,Math.min(budget||Infinity,freeRemainingSeconds+walletSeconds-paidElapsed));
    const effectiveTotal=Math.max(0,remaining+elapsed);
    if(remaining<=0){
      const autoCloseSeconds=Math.min(elapsed,effectiveTotal);
      const startedMs=new Date(c.chat_started_at).getTime();
      const billClosedAt=new Date(startedMs+Math.max(0,autoCloseSeconds)*1000).toISOString();
      let bill=await chargeConversation({...c,closed_at:billClosedAt});
      if(bill.insufficient){
       const payableSeconds=await affordableChatSeconds(c,billClosedAt);
       if(payableSeconds>0){
         const cappedAt=new Date(startedMs+payableSeconds*1000).toISOString();
         bill=await chargeConversation({...c,closed_at:cappedAt});
       }
      }
      const finalClosedAt=new Date(startedMs+Math.max(0,Number(bill?.seconds||autoCloseSeconds))*1000).toISOString();
      const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'closed',closed_at:finalClosedAt,session_end_at:finalClosedAt,retention_until:null,billed_seconds:Number.isFinite(Number(bill?.seconds))?Math.min(effectiveTotal,Math.max(0,Number(bill.seconds))):0,billed_amount:Number(bill?.wallet_amount||0)})});
      const updated=rows[0]||{...c,status:'closed',closed_at:finalClosedAt};
      return json(res,200,{active:false,remaining_seconds:0,auto_ended:true,reason:'wallet_or_free_minutes_exhausted',conversation:await decorate(updated),billing:bill});
    }
    return json(res,200,{active:true,remaining_seconds:remaining,budget_seconds:effectiveTotal,rate:Number(c.fee_snapshot||0),started_at:c.chat_started_at||c.accepted_at});
   }
   const legacyBefore=String(req.query?.legacy_before||'').trim()||null;
   const legacyMode=String(req.query?.legacy||'')==='1';
   if(legacyMode||legacyBefore){
     const legacy=await legacyMessagesForPair(c,50,legacyBefore);
     return json(res,200,{conversation:await decorate(c),legacy_messages:legacy.messages,legacy_has_more:legacy.has_more,legacy_oldest_message_at:legacy.oldest_message_at,legacy_oldest_message_cursor:legacy.oldest_message_cursor});
   }
   // Repair legacy/partially migrated chats too. The helper first uses the
   // selected Kundli stored on the conversation, then falls back to its intake
   // message, so both participants see the same persisted chat card.
   if(c.status==='accepted'&&c.channel==='chat'){
     await ensureStartedKundliMessage(c,u);
   }
   const pageLimit=Math.min(50,Math.max(1,Number(req.query?.limit||50)));
    const before=String(req.query?.before||'').trim()||null;
    const page=await messagesFor(id,pageLimit,before);
    const all=page.messages;
    const hasMore=page.has_more;
    const intake=await latestIntake(c);
    // An astrologer must be able to see the conversation/history immediately
   // after pressing Accept. This does NOT start billing or the paid chat: the
   // conversation remains `astrologer_accepted` until the user confirms.
   // Previously the API returned [] for this state, which made the astrologer
   // screen look empty until a reload after the user confirmation.
   const pendingAstroHistory = c.status==='astrologer_accepted' && p?.role==='astrologer' && c.astrologer_id===u.id;
   const historyVisible=HISTORY.includes(c.status)||c.status==='accepted'||pendingAstroHistory;
   // Do not preload an additional 50-message legacy page here. One API load
   // must deliver at most 50 visible messages. Older conversations are loaded
   // lazily only after the current conversation is exhausted and the user
   // scrolls upward; for a newly accepted astrologer chat the frontend will
   // immediately request that first legacy page because the current chat is
   // still empty.
   let previousHistory=[];
   let legacyHasMore=historyVisible;
   let legacyOldestMessageAt=null;
   let legacyOldestMessageCursor=null;
   let chatEarning=null;
   if(c.status==='closed'&&p?.role==='astrologer'&&c.astrologer_id===u.id){
    const er=await sbreq(`/rest/v1/astrologer_earnings?conversation_id=eq.${esc(c.id)}&select=net_amount,amount,gross_amount,commission_amount,earned_at&limit=1`);
    if(er[0]) chatEarning={amount:Number(er[0].net_amount??er[0].amount??0),earned_at:er[0].earned_at||null};
   }
   return json(res,200,{conversation:await decorate(c),messages:historyVisible?all:[],has_more:historyVisible&&hasMore,oldest_message_at:all[0]?.created_at||null,oldest_message_cursor:page.oldest_message_cursor||null,prechat:prechatData(intake?[intake]:[]),previousHistory:[],legacy_messages:[],legacy_has_more:historyVisible&&legacyHasMore,legacy_oldest_message_at:legacyOldestMessageAt,legacy_oldest_message_cursor:legacyOldestMessageCursor,legacy_available:historyVisible,chatEarning});
  }
  const rows=await listFor(u,p);return json(res,200,{conversations:await Promise.all(rows.map(decorate))});
 }
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const b=req.body||{},action=String(b.action||'request');
 if(action==='find-active'){
   if(p?.role!=='user')return json(res,403,{error:'Only user accounts can find active chats'});
   const aid=String(b.astrologerId||'').trim();
   if(!aid)return json(res,400,{error:'astrologerId required'});
   await reconcileWaiting(aid);
   const existing=(await sbreq(`/rest/v1/conversations?user_id=eq.${esc(u.id)}&astrologer_id=eq.${esc(aid)}&channel=eq.chat&status=in.(requested,waiting,astrologer_accepted,accepted)&select=*&order=created_at.desc&limit=10`))||[];
   const active=existing.find(x=>x.status==='accepted'&&x.chat_started_at)||null;
   if(active){
     const endMs=new Date(active.session_end_at||0).getTime();
     if(Number.isFinite(endMs)&&endMs>0&&endMs<=Date.now()){
       await reconcileWaiting(aid);
       return json(res,200,{existing:false,conversation:null});
     }
     return json(res,200,{existing:true,conversation:await decorate(active)});
   }
   const pending=existing.find(x=>['requested','waiting','astrologer_accepted'].includes(x.status));
   if(pending)return json(res,200,{existing:true,conversation:await decorate(pending)});
   return json(res,200,{existing:false,conversation:null});
 }
 if(action==='request'){
  const aid=String(b.astrologerId||'').trim();
  // Chat requests keep the existing flow untouched.
  if(action==='request'){
   if(p?.role!=='user')return json(res,403,{error:'Only user accounts can start a new request'});
   if(aid){
    const a=(await sbreq(`/rest/v1/astrologers?id=eq.${esc(aid)}&select=*`))[0];
    if(!a||!a.verified)return json(res,409,{error:'Astrologer is not approved'});
    const fresh=a.last_seen&&((Date.now()-new Date(a.last_seen).getTime())<=75000);if(!a.online||!fresh)return json(res,409,{error:'Astrologer is offline'});
    const baseRate=Math.max(0,Number(a.fee_per_minute||a.fee||0));
    const discount=[0,25,50,75].includes(Number(a.discount))?Number(a.discount):0;
    const rate=effectiveRate(baseRate,discount);
    if(rate<=0)return json(res,409,{error:'इस astrologer की Chat price अभी Admin ने set नहीं की है। पहले price configure करें।'});
    if(rate>0){
      await applyActiveChatOffers(u.id);
      const free=await userFree(u.id); const w=await wallet(u.id); const freeMinutes=Number(free.free_chat_minutes||0); const balance=Number(w.balance||0);
      if(freeMinutes<1&&balance<rate)return json(res,402,{error:`Free chat minutes खत्म हैं। कम से कम ₹${rate.toFixed(2)} wallet में होना चाहिए।`,free_minutes:freeMinutes,balance});
    }
    if(a.chat_enabled===false)return json(res,409,{error:'Astrologer chat is OFF'});
    let kundli=null;const kid=String(b.kundliId||'').trim();if(kid){kundli=await kundliForUser(kid,u.id);if(!kundli)return json(res,403,{error:'Selected Kundli does not belong to this account'});}
    await reconcileWaiting(aid);
     const activeChat=(await sbreq(`/rest/v1/conversations?astrologer_id=eq.${esc(aid)}&channel=eq.chat&status=eq.accepted&chat_started_at=not.is.null&select=id,chat_started_at,chat_budget_seconds,session_end_at&order=created_at.desc&limit=1`))[0]||null;
     const oldRows=await sbreq(`/rest/v1/conversations?user_id=eq.${esc(u.id)}&astrologer_id=eq.${esc(aid)}&channel=eq.chat&select=*&order=created_at.desc&limit=5`);
    let old=oldRows[0]||null;
    if(old&&old.status==='accepted'){
      // A genuinely started chat is still active: reopen that exact chat.
      if(old.chat_started_at&&Number(old.chat_budget_seconds||0)>0){
        return json(res,200,{conversation:await decorate(old),existing:true});
      }
      // Legacy accepted rows with no start timestamp are historical/incomplete.
      // Preserve them and create a fresh conversation for the new request.
      const marked=await sbreq(`/rest/v1/conversations?id=eq.${esc(old.id)}&status=eq.accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'missed',missed_by:'system',retention_until:null})});
      old=marked[0]||{...old,status:'missed'};
    }
    if(old&&ACTIVE.includes(old.status))return json(res,200,{conversation:await decorate(old),existing:true});
    if(old&&old.status==='waiting'&&activeChat){
      return json(res,200,{conversation:await decorate(old),existing:true,waiting:true,waiting_until:old.waiting_until||activeChat.session_end_at||null});
    }
    if(activeChat){
      const activeStart=activeChat.channel==='call'?activeChat.call_started_at:activeChat.chat_started_at;const activeBudget=activeChat.channel==='call'?activeChat.call_budget_seconds:activeChat.chat_budget_seconds;const waitingUntil=activeChat.session_end_at||new Date(new Date(activeStart).getTime()+Math.max(0,Number(activeBudget||0))*1000).toISOString();
      const waitBody={user_id:u.id,astrologer_id:aid,admin_id:null,status:'waiting',channel:'chat',requested_at:new Date().toISOString(),fee_snapshot:rate,discount_snapshot:discount,kundli_id:kid||null,billed_seconds:0,billed_amount:0,waiting_for_conversation_id:activeChat.id,waiting_until:waitingUntil};
      const rows=await sbreq('/rest/v1/conversations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(waitBody)});
      const c=rows[0];
      if(kundli)await savePrechat(c,kundli,u);
      await createNotification({recipientId:u.id,recipientRole:'user',userId:u.id,title:'⏳ Astrologer Busy',body:'Astrologer अभी दूसरे chat में हैं। आपका request Waiting में है।',notificationType:'chat_waiting',link:`/chat.html?role=user&conversation_id=${encodeURIComponent(c.id)}`,data:{conversationId:c.id,waitingUntil}});
      return json(res,201,{conversation:await decorate(c),waiting:true,waiting_until:waitingUntil});
    }
    if(old&&HISTORY.includes(old.status)){
     // IMPORTANT: every completed/missed/rejected chat is a separate conversation.
     // Never recycle the old conversation_id, otherwise a review on the previous
     // chat makes the next chat appear as "Already Reviewed".
     const body={user_id:u.id,astrologer_id:aid,admin_id:null,status:'requested',channel:'chat',requested_at:new Date().toISOString(),fee_snapshot:rate,discount_snapshot:discount,kundli_id:kid||null,billed_seconds:0,billed_amount:0};
     const rows=await sbreq('/rest/v1/conversations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
     const c=rows[0];
     if(kundli)await savePrechat(c,kundli,u);
     await createNotification({recipientId:aid,recipientRole:'astrologer',title:'💬 New Chat Request',body:`${p?.full_name||'User'} ने chat request भेजी है।`,notificationType:'chat_request',link:`/astrologer-dashboard.html?conversation_id=${encodeURIComponent(c.id)}`,data:{conversationId:c.id}});
     return json(res,201,{conversation:await decorate(c),existing:false,new_chat:true});
    }
    const body={user_id:u.id,astrologer_id:aid,admin_id:null,status:'requested',channel:'chat',requested_at:new Date().toISOString(),fee_snapshot:rate,discount_snapshot:discount,kundli_id:kid||null,billed_seconds:0,billed_amount:0};
    const rows=await sbreq('/rest/v1/conversations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
    const c=rows[0];
    if(kundli)await savePrechat(c,kundli,u);
    await createNotification({recipientId:aid,recipientRole:'astrologer',title:'💬 New Chat Request',body:`${p?.full_name||'User'} ने chat request भेजी है।`,notificationType:'chat_request',link:`/astrologer-dashboard.html?conversation_id=${encodeURIComponent(c.id)}`,data:{conversationId:c.id}});
    return json(res,201,{conversation:await decorate(c)});
   }
   const admins=await sbreq('/rest/v1/profiles?role=eq.admin&select=id,full_name,avatar_url,role&limit=1');const admin=admins[0];if(!admin)return json(res,503,{error:'No admin support account is available'});
   const old=await sbreq(`/rest/v1/conversations?user_id=eq.${esc(u.id)}&admin_id=eq.${esc(admin.id)}&channel=eq.support&status=eq.accepted&select=*&order=created_at.desc&limit=1`);if(old[0])return json(res,200,{conversation:await decorate(old[0]),existing:true});
   const rows=await sbreq('/rest/v1/conversations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:u.id,astrologer_id:null,admin_id:admin.id,status:'accepted',channel:'support',requested_at:new Date().toISOString(),accepted_at:new Date().toISOString()})});return json(res,201,{conversation:await decorate(rows[0])});
  }
 }

 if(action==='call'){
  // Voice/video call request. Calls have their own conversation row and do
  // not require an existing chat. This keeps every call separately billable.
  const sourceId=String(b.sourceConversationId||b.conversationId||'').trim();
  let pairUser=null,pairAstro=null;
  if(p?.role==='user'){
   pairUser=u.id;
   pairAstro=String(b.astrologerId||'').trim();
   if(!pairAstro && sourceId){const source=await getConv(sourceId);if(source?.channel==='chat'&&source.user_id===u.id)pairAstro=source.astrologer_id;}
   if(!pairAstro)return json(res,400,{error:'Astrologer is required to start a call'});
   const a=(await sbreq(`/rest/v1/astrologers?id=eq.${esc(pairAstro)}&select=*`))[0];
   if(!a||!a.verified||a.blocked)return json(res,409,{error:'Astrologer is not approved'});
   const fresh=a.last_seen&&((Date.now()-new Date(a.last_seen).getTime())<=75000);
   if(!a.online||!fresh)return json(res,409,{error:'Astrologer is offline'});
   if(a.call_enabled===false)return json(res,409,{error:'Astrologer call is OFF'});
   const baseRate=Math.max(0,Number(a.fee_per_minute||a.fee||0));
   const discount=[0,25,50,75].includes(Number(a.discount))?Number(a.discount):0;
   const rate=effectiveRate(baseRate,discount);
   if(rate<=0)return json(res,409,{error:'इस astrologer की Call price अभी Admin ने set नहीं की है। पहले price configure करें।'});
   await applyActiveChatOffers(u.id);
   const free=await userFree(u.id),w=await wallet(u.id);
   if(Number(free.free_chat_minutes||0)<1 && Number(w.balance||0)<rate){
     return json(res,402,{error:`Call शुरू करने के लिए कम से कम ₹${rate.toFixed(2)} wallet में होना चाहिए या free minutes उपलब्ध होने चाहिए।`,free_minutes:Number(free.free_chat_minutes||0),balance:Number(w.balance||0)});
   }
  }else if(p?.role==='astrologer'){
   pairAstro=u.id;
   if(!sourceId)return json(res,400,{error:'User conversationId is required to start a call'});
   const source=await getConv(sourceId);
   if(!source||source.channel!=='chat'||source.status!=='accepted')return json(res,409,{error:'Call can be started only from an active chat'});
   if(source.astrologer_id!==u.id)return json(res,403,{error:'You are not a participant of this chat'});
   pairUser=source.user_id;
  }else return json(res,403,{error:'User or Astrologer only'});

  const existing=await sbreq(`/rest/v1/conversations?user_id=eq.${esc(pairUser)}&astrologer_id=eq.${esc(pairAstro)}&channel=eq.call&select=*&order=created_at.desc&limit=20`);
  const activeCallStatuses=['call_requested_user','call_requested_astrologer','astrologer_accepted','call_accepted'];
  const old=(existing||[]).find(x=>activeCallStatuses.includes(x.status));
  if(old)return json(res,200,{conversation:await decorate(old),existing:true});
  const requestedStatus=p?.role==='user'?'call_requested_astrologer':'call_requested_user';
  const common={user_id:pairUser,astrologer_id:pairAstro,admin_id:null,status:requestedStatus,channel:'call',requested_at:new Date().toISOString(),astrologer_accepted_at:null,user_confirm_deadline:null,user_confirmed_at:null,accepted_at:null,closed_at:null,missed_by:null,retention_until:null,fee_snapshot:0,billed_seconds:0,billed_amount:0};
  const rows=await sbreq('/rest/v1/conversations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(common)});
  const created=rows[0];
  const recipientId=p?.role==='user'?pairAstro:pairUser;
  await createNotification({recipientId,recipientRole:p?.role==='user'?'astrologer':'user',title:'📞 Incoming Call Request',body:p?.role==='user'?'User ने आपको call request भेजी है।':'Astrologer ने call request भेजी है।',notificationType:'call_request',link:`/call.html?conversation_id=${encodeURIComponent(created?.id||'')}`,data:{conversationId:created?.id||'',callMode:String(b.mode||'voice')}});
  return json(res,201,{conversation:await decorate(created)});
 }
 const id=String(b.conversationId||b.conversation_id||'').trim();if(!id)return json(res,400,{error:'conversationId required'});let c=await getConv(id);c=await expire(c);if(!allowed(u,p,c))return json(res,403,{error:'Forbidden'});
 if(action==='admin-accept'){if(p?.role!=='admin')return json(res,403,{error:'Admin only'});const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'accepted',accepted_at:new Date().toISOString(),admin_id:u.id})});return json(res,200,{conversation:await decorate(rows[0])});}
 if(action==='user-confirm'){
  if(p?.role!=='user'||c.user_id!==u.id)return json(res,403,{error:'User only'});
  if(c.status!=='astrologer_accepted')return json(res,409,{error:`Chat is ${c.status}, not awaiting confirmation`});
  if(c.user_confirm_deadline&&now()>new Date(c.user_confirm_deadline).getTime())return json(res,409,{error:'Confirmation window expired'});
  const sec=Math.max(0,Math.round((now()-new Date(c.astrologer_accepted_at||c.created_at).getTime())/1000));
  await applyActiveChatOffers(u.id);
  // Re-read the astrologer's Admin price + current discount at the exact moment
  // the user confirms. The final rate must always match the offer currently set.
  const astro=(await sbreq(`/rest/v1/astrologers?id=eq.${esc(c.astrologer_id)}&select=id,fee_per_minute,fee,discount,verified,blocked,chat_enabled`))[0]||null;
  if(!astro||!astro.verified||astro.blocked)return json(res,409,{error:'Astrologer is not available'});
  if(astro.chat_enabled===false)return json(res,409,{error:'Astrologer chat is OFF'});
  const baseRate=Math.max(0,Number(astro.fee_per_minute||astro.fee||c.fee_snapshot||0));
  const discount=[0,25,50,75].includes(Number(astro.discount))?Number(astro.discount):0;
  const rate=effectiveRate(baseRate,discount);
  if(rate<=0)return json(res,409,{error:'Admin ने अभी Chat price set नहीं किया है।'});
  const budget=await chatBudget(u.id,rate);
  if(budget.total_seconds<60)return json(res,402,{error:`Chat शुरू करने के लिए कम से कम 1 मिनट का balance/free minute चाहिए। Wallet ₹${budget.wallet_balance.toFixed(2)}, Free ${budget.free_minutes} min`,free_minutes:budget.free_minutes,balance:budget.wallet_balance,rate});
  const startAt=new Date().toISOString();
  const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.astrologer_accepted`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'accepted',fee_snapshot:rate,discount_snapshot:discount,user_confirmed_at:startAt,accepted_at:startAt,chat_started_at:startAt,chat_budget_seconds:budget.total_seconds,free_minutes_snapshot:budget.free_minutes,free_minutes_consumed_live:0,billed_seconds:0,billed_amount:0,session_end_at:new Date(new Date(startAt).getTime()+Math.max(0,Number(budget.total_seconds||0))*1000).toISOString(),user_confirm_response_seconds:sec})});
  const conversation=rows[0]||null;
  if(!conversation)return json(res,409,{error:'Chat request changed. Please reopen the request and confirm again.'});
  // Share the exact Kundli chosen when this request was created. Prefer the
  // conversation's selected ID over intake text; use intake only for legacy
  // rows that did not persist kundli_id. The per-conversation message ID makes
  // retries safe while allowing the same Kundli to be sent in every new chat.
  const selectedKundliId=String(conversation.kundli_id||c.kundli_id||'').trim();
  let sharedKundli=null;
  if(selectedKundliId){
    const selected=await kundliForUser(selectedKundliId,u.id);
    if(selected)sharedKundli=await shareKundliOnce(conversation,selected,u);
  }
  if(!sharedKundli){
    const intake=await latestIntake(c);
    const snap=snapshotFromIntake(intake);
    if(snap)sharedKundli=await shareKundliSnapshotOnce(conversation,snap,u);
  }
  await createNotification({recipientId:c.astrologer_id,recipientRole:'astrologer',title:'💬 Chat Started',body:'User ने chat confirm करके शुरू कर दी है।',notificationType:'chat_started',link:`/chat.html?role=astrologer&conversation_id=${encodeURIComponent(id)}`,data:{conversationId:id}});
  if(sharedKundli){
    await createNotification({recipientId:c.astrologer_id,recipientRole:'astrologer',title:'📜 Kundli Shared',body:'User की चुनी हुई Kundli chat में share हो गई है।',notificationType:'chat_message',link:`/chat.html?role=astrologer&conversation_id=${encodeURIComponent(id)}`,data:{conversationId:id,kundaliId:selectedKundliId||sharedKundli.kundali_id||''}});
  }
  return json(res,200,{conversation:await decorate(conversation),rate,discount,budget});
 }
 if(action==='close'){
  if(!['user','astrologer','admin'].includes(p?.role))return json(res,403,{error:'Not allowed'});
  const closedAt=new Date().toISOString();
  let bill=null;
  if(c.channel==='chat'&&c.accepted_at&&c.astrologer_id){
   // Flush the exact free-time usage through the close moment before settlement.
   if(c.chat_started_at){
    const elapsed=Math.max(0,Math.floor((new Date(closedAt).getTime()-new Date(c.chat_started_at).getTime())/1000));
    const live=await syncLiveFreeTime(c,elapsed);
    c={...c,free_minutes_consumed_live:Number(live.used||c.free_minutes_consumed_live||0)};
   }
   bill=await chargeConversation({...c,closed_at:closedAt});
   if(bill.insufficient){
    // A chat must never get stuck on End Chat because the current wallet is
    // slightly lower than the calculated end amount. This can happen when a
    // wallet is changed from another tab/device while the chat is active.
    // Close the chat at the maximum currently payable duration instead of
    // leaving it permanently active/pending.
    const cappedSeconds=await affordableChatSeconds(c,closedAt);
    if(cappedSeconds>0){
      const startedMs=new Date(c.chat_started_at).getTime();
      bill=await chargeConversation({...c,closed_at:new Date(startedMs+cappedSeconds*1000).toISOString()});
    }
    // Even if no payable amount remains, the user explicitly ended the chat;
    // always close it rather than returning HTTP 402 and trapping the UI.
   }
  }
  const patch={status:'closed',closed_at:closedAt,session_end_at:closedAt,retention_until:null};
  if(bill){patch.billed_seconds=Math.max(0,Number(bill.seconds||0));patch.billed_amount=Number(bill.wallet_amount||0)}
  const rows=await sbreq(`/rest/v1/conversations?id=eq.${esc(id)}&status=eq.${esc(c.status)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
  const updated=rows[0]||{...c,...patch};
  return json(res,200,{conversation:await decorate(updated),billing:bill});
 }
 return json(res,400,{error:'Unknown action'});
}catch(e){return json(res,500,{error:e.message})}};
