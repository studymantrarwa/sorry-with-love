const {authUser,req:sbreq,json,profile}=require('./_lib');
const esc=v=>encodeURIComponent(String(v));
module.exports=async(req,res)=>{try{
  const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});
  const p=await profile(u.id,u.account_type);if(!p||!['user','astrologer'].includes(p.role))return json(res,403,{error:'Push access denied'});
  if(req.method==='GET'){
    const rows=await sbreq(`/rest/v1/push_tokens?user_id=eq.${esc(u.id)}&select=id,platform,updated_at,created_at&order=updated_at.desc&limit=50`).catch(()=>[]);
    return json(res,200,{tokens:rows||[]});
  }
  if(req.method==='POST'){
    const b=req.body||{},token=String(b.token||'').trim();if(token.length<20||token.length>4096)return json(res,400,{error:'Invalid FCM token'});
    const row={user_id:u.id,token,platform:String(b.platform||'web').slice(0,40),device_label:String(b.deviceLabel||'').slice(0,120)||null,updated_at:new Date().toISOString()};
    await sbreq('/rest/v1/push_tokens',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
    return json(res,200,{ok:true});
  }
  if(req.method==='DELETE'){
    const token=String(req.body?.token||'').trim();if(!token)return json(res,400,{error:'token required'});
    await sbreq(`/rest/v1/push_tokens?user_id=eq.${esc(u.id)}&token=eq.${esc(token)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    return json(res,200,{ok:true});
  }
  return json(res,405,{error:'Method not allowed'});
}catch(e){return json(res,500,{error:e.message||'Push service failed'})}};
