const {authUser,req:sbreq,json,profile}=require('./_lib');
const enc=v=>encodeURIComponent(String(v));
module.exports=async(req,res)=>{try{
 const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});
 const p=await profile(u.id);const role=p?.role==='astrologer'||u.account_type==='astrologer'||u.user_metadata?.account_type==='astrologer'?'astrologer':'user';
 if(req.method==='GET'){
  const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  let rows=[];
  try{
   const base=`/rest/v1/notifications?recipient_id=eq.${enc(u.id)}`;
   rows=await sbreq(`${base}&created_at=gte.${enc(cutoff)}&select=*&order=created_at.desc&limit=100`);
   // Keep only a rolling 24-hour window; old rows are removed for this recipient.
   try{await sbreq(`${base}&created_at=lt.${enc(cutoff)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch(_){}
  } catch(e){
   if(!/recipient_id|column|schema cache/i.test(String(e.message||'')))throw e;
   if(role==='user'){
    const base=`/rest/v1/notifications?user_id=eq.${enc(u.id)}`;
    rows=await sbreq(`${base}&created_at=gte.${enc(cutoff)}&select=*&order=created_at.desc&limit=100`);
    try{await sbreq(`${base}&created_at=lt.${enc(cutoff)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch(_){}
   }
  }
  return json(res,200,{notifications:rows,expires_after_hours:24});
 }
 if(req.method==='POST'){
  if(req.body?.action!=='chat_resume')return json(res,400,{error:'Unsupported notification action'});
  const conversationId=String(req.body?.conversationId||'');
  if(!/^[0-9a-f-]{20,}$/i.test(conversationId))return json(res,400,{error:'Invalid conversation id'});
  const participantColumn=role==='astrologer'?'astrologer_id':'user_id';
  const conversations=await sbreq(`/rest/v1/conversations?id=eq.${enc(conversationId)}&${participantColumn}=eq.${enc(u.id)}&status=eq.accepted&channel=eq.chat&chat_started_at=not.is.null&select=id&limit=1`);
  if(!Array.isArray(conversations)||!conversations.length)return json(res,404,{error:'Active chat not found'});
  const link=`/chat.html?role=${role}&conversation_id=${enc(conversationId)}`;
  const row={user_id:role==='user'?u.id:null,recipient_id:u.id,recipient_role:role,title:'Chat जारी रखें',body:'आपकी chat अभी active है। संदेशों पर वापस जाने के लिए यहाँ tap करें।',notification_type:'chat_resume',link,created_at:new Date().toISOString()};
  await sbreq('/rest/v1/notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
  return json(res,201,{ok:true});
 }
 if(req.method==='DELETE'){
  const id=String(req.body?.id||'');
  const deleteAll=req.body?.action==='delete_all';
  if(!id&&!deleteAll)return json(res,400,{error:'Notification id or delete_all action required'});
  const cutoff=new Date(Date.now()-24*60*60*1000).toISOString();
  const base=role==='user'?`/rest/v1/notifications?user_id=eq.${enc(u.id)}`:`/rest/v1/notifications?recipient_id=eq.${enc(u.id)}`;
  const own=base;
  const query=deleteAll?`${own}&created_at=gte.${enc(cutoff)}`:`${own}&id=eq.${enc(id)}`;
  await sbreq(query,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  return json(res,200,{ok:true});
 }
 if(req.method==='PATCH'){
  const id=String(req.body?.id||'');if(!id)return json(res,400,{error:'Notification id required'});
  try{await sbreq(`/rest/v1/notifications?id=eq.${enc(id)}&recipient_id=eq.${enc(u.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})})}
  catch(e){if(role==='user')await sbreq(`/rest/v1/notifications?id=eq.${enc(id)}&user_id=eq.${enc(u.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})});else throw e}
  return json(res,200,{ok:true});
 }
 return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:e.message})}};
