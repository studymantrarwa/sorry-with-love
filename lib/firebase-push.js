const {req:sbreq}=require('./api/_lib');

let adminPromise=null;
async function firebaseAdmin(){
  if(adminPromise)return adminPromise;
  adminPromise=(async()=>{
    if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
    try{
      const admin=require('firebase-admin');
      if(admin.apps?.length)return admin;
      let service=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      try{service=JSON.parse(service)}catch(_){service=JSON.parse(Buffer.from(service,'base64').toString('utf8'))}
      admin.initializeApp({credential:admin.credential.cert(service)});
      return admin;
    }catch(e){console.error('[firebase-push] init failed',e);return null}
  })();
  return adminPromise;
}

async function tokensFor(userId){
  try{
    const rows=await sbreq(`/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id,token,platform,updated_at&limit=100`);
    return Array.isArray(rows)?rows:[];
  }catch(e){
    if(/relation|push_tokens|schema cache|404/i.test(String(e?.message||'')))return [];
    throw e;
  }
}

async function sendToUser(userId,{title,body,data={},kind='notification',link=null}){
  if(!userId)return {sent:0,configured:false};
  const admin=await firebaseAdmin();
  if(!admin)return {sent:0,configured:false};
  const tokens=await tokensFor(userId);
  if(!tokens.length)return {sent:0,configured:true};
  const messaging=admin.messaging();
  const cleanData={};
  Object.entries({...data,kind,link:link||''}).forEach(([k,v])=>cleanData[String(k)]=String(v??''));
  let sent=0,stale=[];
  for(let i=0;i<tokens.length;i+=500){
    const chunk=tokens.slice(i,i+500).map(x=>x.token).filter(Boolean);
    if(!chunk.length)continue;
    try{
      const r=await messaging.sendEachForMulticast({
        tokens:chunk,
        notification:{title:String(title||'Bhavishya Gyani'),body:String(body||'')},
        data:cleanData,
        android:{
          priority:'high',
          notification:{channelId:kind==='call'?'bg_calls':kind==='chat'?'bg_chat':'bg_notifications',sound:kind==='call'?'default':'default',defaultSound:true,defaultVibrateTimings:true,visibility:'public',clickAction:'OPEN_NOTIFICATION'}
        },
        webpush:{
          headers:{Urgency:kind==='call'?'high':'normal'},
          notification:{title:String(title||'Bhavishya Gyani'),body:String(body||''),icon:'/assets/bhavishya-logo.png',badge:'/assets/bhavishya-logo.png',tag:`bg-${kind}-${userId}`,renotify:true,requireInteraction:kind==='call',vibrate:[300,150,300,150,700],actions:link?[{action:'open',title:'Open'}]:[]},
          fcmOptions:(link&&((process.env.PUBLIC_APP_URL||'').startsWith('http')||link.startsWith('http')))?{link:link.startsWith('http')?link:`${process.env.PUBLIC_APP_URL}${link}`}:undefined
        }
      });
      sent+=r.successCount||0;
      r.responses?.forEach((x,idx)=>{if(!x.success&&/registration-token-not-registered|invalid-registration-token|unregistered/i.test(String(x.error?.code||x.error?.message||'')))stale.push(chunk[idx])});
    }catch(e){console.error('[firebase-push] send failed',e);}
  }
  if(stale.length){
    for(const token of stale){try{await sbreq(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch(_){} }
  }
  return {sent,configured:true};
}

async function notifyAndPush(userId,notification){
  return sendToUser(userId,notification);
}

module.exports={firebaseAdmin,tokensFor,sendToUser,notifyAndPush};
