const {authUser,json}=require('./_lib');
const DEFAULT_STUNS=['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302','stun:stun3.l.google.com:19302','stun:stun4.l.google.com:19302'];
module.exports=async(req,res)=>{try{
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 const u=await authUser(req);if(!u)return json(res,401,{error:'Login required'});
 const stunRaw=String(process.env.STUN_URLS||'');
 const stuns=(stunRaw?stunRaw.split(','):DEFAULT_STUNS).map(x=>x.trim()).filter(Boolean).filter(x=>!/^turns?:/i.test(x));
 const servers=[...new Set(stuns)].map(urls=>({urls}));
 const turnUrls=String(process.env.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean).filter(x=>/^turns?:/i.test(x));
 const turnUser=String(process.env.TURN_USERNAME||'').trim();
 const turnPass=String(process.env.TURN_PASSWORD||'').trim();
 if(turnUrls.length&&turnUser&&turnPass)servers.push({urls:[...new Set(turnUrls)],username:turnUser,credential:turnPass});
 return json(res,200,{iceServers:servers,turnConfigured:Boolean(turnUrls.length&&turnUser&&turnPass),directOnly:!(turnUrls.length&&turnUser&&turnPass)});
}catch(e){return json(res,500,{error:e.message||'Voice configuration failed'})}};
