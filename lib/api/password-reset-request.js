const crypto = require('crypto');
const { req: sbreq, json, cleanEmail, rateLimit } = require('./_lib');
const { sendMail } = require('../gmail-mailer');

const TYPES = { user:'user_accounts', astrologer:'astrologer_accounts', admin:'admin_accounts' };
const TTL_MS = 30 * 60 * 1000;

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

module.exports = async (req,res)=>{
  try {
    if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
    const b=req.body||{};
    const rl=await rateLimit(`reset:${String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()}`,5,3600);
    if(rl.allowed===false)return json(res,429,{error:'Too many password reset requests. Please try again later.'});
    const email=cleanEmail(b.email);
    const type=['user','astrologer','admin'].includes(b.account_type)?b.account_type:'user';
    if(!/^\S+@\S+\.\S+$/.test(email)) return json(res,400,{error:'Valid email is required'});
    const table=TYPES[type];
    const rows=await sbreq(`/rest/v1/${table}?email=eq.${encodeURIComponent(email)}&select=id,email,full_name,blocked&limit=1`);
    // Do not reveal whether an account exists.
    if(!rows[0] || rows[0].blocked) return json(res,200,{ok:true,message:'If an account exists for this email, a password reset link has been sent.'});

    const raw=crypto.randomBytes(32).toString('hex');
    const hash=crypto.createHash('sha256').update(raw).digest('hex');
    const expires=new Date(Date.now()+TTL_MS).toISOString();
    await sbreq(`/rest/v1/password_reset_tokens?account_type=eq.${encodeURIComponent(type)}&account_id=eq.${encodeURIComponent(rows[0].id)}&used_at=is.null`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({used_at:new Date().toISOString()})}).catch(()=>{});
    await sbreq('/rest/v1/password_reset_tokens',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:crypto.randomUUID(),account_type:type,account_id:rows[0].id,token_hash:hash,expires_at:expires})});

    const base=String(process.env.APP_BASE_URL||'').trim().replace(/\/$/,'');if(!base)throw new Error('APP_BASE_URL is required');
    const link=`${base}/reset-password.html?token=${encodeURIComponent(raw)}&type=${encodeURIComponent(type)}`;
    const name=esc(rows[0].full_name||'User');
    await sendMail({
      to:email,
      subject:'Bhavishya Gyani — Password Reset',
      text:`Namaste ${rows[0].full_name||'User'},\n\nPassword reset करने के लिए यह link खोलें:\n${link}\n\nयह link 30 मिनट तक valid है और केवल एक बार इस्तेमाल किया जा सकता है.\n\nअगर आपने यह request नहीं की है, तो इस email को ignore करें.`,
      html:`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f6;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #eee"><h2 style="margin-top:0">Bhavishya Gyani</h2><p>Namaste ${name},</p><p>आपके account का password reset करने के लिए नीचे button दबाएँ:</p><p><a href="${esc(link)}" style="display:inline-block;background:#d6a928;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset Password</a></p><p style="color:#666;font-size:13px">यह link 30 मिनट तक valid है और केवल एक बार इस्तेमाल किया जा सकता है.</p><p style="color:#888;font-size:12px">अगर आपने password reset request नहीं की है, तो इस email को ignore करें.</p></div></body></html>`
    });
    return json(res,200,{ok:true,message:'If an account exists for this email, a password reset link has been sent.'});
  } catch(e) {
    console.error('password-reset-request',e);
    return json(res,500,{error:e.message||'Password reset email could not be sent'});
  }
};
