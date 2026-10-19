const crypto=require('crypto');
const {req:sbreq,json,makeToken,hashPassword,cleanEmail,cleanPhone,validateIdentity,rateLimitRequest,rateLimitResponse}=require('./_lib');
function sameSecret(a,b){const x=crypto.createHash('sha256').update(String(a)).digest();const y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y);}

module.exports=async(req,res)=>{
  try{
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
    const limited=rateLimitResponse(res,await rateLimitRequest(req,'admin-register',3,3600)); if(limited)return limited;
    const b=req.body||{};
    const name=String(b.full_name||'').trim().slice(0,100);
    const email=cleanEmail(b.email);
    const phone=cleanPhone(b.phone);
    const password=String(b.password||'');
    const code=String(b.registration_code||'').trim();

    if(!name)return json(res,400,{error:'Admin name is required'});
    validateIdentity(email,phone);
    if(password.length<12)return json(res,400,{error:'Admin password must be at least 12 characters'});
    if(password.length>256)return json(res,400,{error:'Password is too long'});
    if(code.length>256)return json(res,400,{error:'Invalid Admin registration code'});

    // First-admin bootstrap and subsequent admin registration are both protected
    // only by the server-side deployment secret. No existing admin login is
    // required, so a brand-new Supabase project can create its first admin.
    const required=String(process.env.ADMIN_REGISTRATION_CODE||'').trim();
    if(!required)throw new Error('ADMIN_REGISTRATION_CODE is required in the server environment');
    if(!sameSecret(code,required))return json(res,403,{error:'Invalid Admin registration code'});

    const ex1=await sbreq(`/rest/v1/admin_accounts?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
    const ex2=await sbreq(`/rest/v1/admin_accounts?phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`);
    if(ex1[0]||ex2[0])return json(res,409,{error:'This email or mobile is already registered in Admin accounts.'});

    const id=crypto.randomUUID(),hp=hashPassword(password);
    await sbreq('/rest/v1/admin_accounts',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id,email,phone,password_hash:hp.hash,password_salt:hp.salt,full_name:name,blocked:false})});
    try{
      await sbreq('/rest/v1/admin_profiles',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id,full_name:name,avatar_url:null})});
    }catch(profileErr){
      try{await sbreq(`/rest/v1/admin_accounts?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch(cleanupErr){}
      throw new Error('Admin profile could not be created. The incomplete account was cleaned up when possible; verify Admin accounts before retrying. '+(profileErr.message||''));
    }
    return json(res,201,{ok:true,message:'Admin account created successfully',admin:{id,email,full_name:name,role:'admin'},token:makeToken({id,email,account_type:'admin'})});
  }catch(e){
    // Keep infrastructure/database details out of public responses.
    return json(res,500,{error:'Admin registration failed. Check server configuration and logs.'});
  }
};
