const {req:sbreq}=require('./api/_lib');
const {sendToUser}=require('./firebase-push');

async function createNotification({recipientId,recipientRole='user',title,body,notificationType='notification',link=null,data={},userId=null,sentBy=null}){
  const row={user_id:userId||null,recipient_id:recipientId,recipient_role:recipientRole,title:String(title||'Bhavishya Gyani').slice(0,160),body:String(body||'').slice(0,2000),notification_type:notificationType,link:link?String(link).slice(0,500):null,created_at:new Date().toISOString()};
  if(sentBy)row.sent_by=sentBy;
  try{await sbreq('/rest/v1/notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)})}catch(e){console.error('[notify] db notification failed',e)}
  try{await sendToUser(recipientId,{title:row.title,body:row.body,kind:notificationType.includes('call')?'call':(notificationType.includes('chat')||notificationType.includes('consultation'))?'chat':'notification',link:row.link,data:{...data,notificationId:row.id||'',recipientRole}})}catch(e){console.error('[notify] push failed',e)}
  return row;
}
module.exports={createNotification};
