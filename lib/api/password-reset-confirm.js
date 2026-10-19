const crypto = require('crypto');
const { req: sbreq, json, hashPassword } = require('./_lib');
const TYPES = { user:'user_accounts', astrologer:'astrologer_accounts', admin:'admin_accounts' };
module.exports = async (req,res)=>{
  try{
    if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
    const b=req.body||{}, token=String(b.token||'').trim(), type=['user','astrologer','admin'].includes(b.account_type)?b.account_type:'user', password=String(b.password||'');
    if(token.length<40) return json(res,400,{error:'Invalid or expired reset link'});
    if(password.length<6) return json(res,400,{error:'Password must be at least 6 characters'});
    const hash=crypto.createHash('sha256').update(token).digest('hex');
    const rows=await sbreq(`/rest/v1/password_reset_tokens?token_hash=eq.${encodeURIComponent(hash)}&account_type=eq.${encodeURIComponent(type)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,account_id&limit=1`);
    const reset=rows[0];
    if(!reset) return json(res,400,{error:'This reset link is invalid or expired. Please request a new one.'});
    const hp=hashPassword(password);
    await sbreq(`/${'rest/v1'}/${TYPES[type]}?id=eq.${encodeURIComponent(reset.account_id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({password_hash:hp.hash,password_salt:hp.salt})});
    await sbreq(`/rest/v1/password_reset_tokens?id=eq.${encodeURIComponent(reset.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({used_at:new Date().toISOString()})});
    return json(res,200,{ok:true,message:'Password updated successfully. You can now login with your new password.'});
  }catch(e){console.error('password-reset-confirm',e);return json(res,500,{error:e.message||'Password reset failed'});}
};
