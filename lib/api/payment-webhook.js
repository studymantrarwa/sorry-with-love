const crypto = require('crypto');
const {req: sbreq} = require('./_lib');

function json(res,status,data){res.status(status).setHeader('Content-Type','application/json; charset=utf-8').json(data)}
function secret(){const s=String(process.env.RAZORPAY_WEBHOOK_SECRET||'').trim();if(s.length<16)throw new Error('RAZORPAY_WEBHOOK_SECRET is required and must be at least 16 characters');return s}
function verify(raw,sig){const expected=crypto.createHmac('sha256',secret()).update(raw).digest('hex');const a=Buffer.from(String(sig||''));const b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
async function rawBody(req){if(req.rawBody){return Buffer.isBuffer(req.rawBody)?req.rawBody:Buffer.from(String(req.rawBody))}return await new Promise((resolve,reject)=>{const chunks=[];req.on('data',c=>chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)));req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject)})}

module.exports = async (req,res)=>{
 try{
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  const raw=await rawBody(req);
  const signature=req.headers['x-razorpay-signature']||'';
  if(!verify(raw,signature)) return json(res,401,{error:'Invalid webhook signature'});
  const body=JSON.parse(raw.toString('utf8')||'{}');
  const eventId=String(req.headers['x-razorpay-event-id']||body?.event_id||'').trim();
  if(!eventId) return json(res,400,{error:'Missing Razorpay event id'});
  const event=String(body.event||'');
  const entity=body?.payload?.payment?.entity||body?.payload?.order?.entity||{};
  const orderId=String(entity.order_id||body?.payload?.order?.entity?.id||'').trim();
  const paymentId=String(entity.id||'').trim();
  if(!orderId) return json(res,200,{ok:true,ignored:true,reason:'No order id'});
  if(!['payment.captured','payment.failed','order.paid'].includes(event)) return json(res,200,{ok:true,ignored:true,event});
  const status=event==='payment.failed'?'failed':'approved';
  const result=await sbreq('/rest/v1/rpc/reconcile_razorpay_payment',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_event_id:eventId,p_order_id:orderId,p_payment_id:paymentId||null,p_status:status})});
  return json(res,200,{ok:true,event,result});
 }catch(e){
  console.error('razorpay webhook',e);
  return json(res,500,{error:e.message||'Webhook processing failed'});
 }
};
