const {authUser,req:sbreq,json}=require('./_lib');
function key(u){return `user_language:${u.account_type}:${u.id}`}
async function readLang(u){
  try{const rows=await sbreq(`/rest/v1/system_settings?key=eq.${encodeURIComponent(key(u))}&select=value&limit=1`);return rows[0]?.value==='en'?'en':'hi';}
  catch(e){return 'hi';}
}
module.exports=async(req,res)=>{
  try{
    const u=await authUser(req); if(!u)return json(res,401,{error:'Login required'});
    const k=key(u);
    if(req.method==='GET') return json(res,200,{language:await readLang(u)});
    if(req.method!=='POST'&&req.method!=='PATCH') return json(res,405,{error:'Method not allowed'});
    const language=String(req.body?.language||'hi')==='en'?'en':'hi';
    await sbreq('/rest/v1/system_settings',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({key:k,value:language,updated_at:new Date().toISOString()})});
    return json(res,200,{ok:true,language});
  }catch(e){return json(res,500,{error:e.message||'Language save failed'});}
};
