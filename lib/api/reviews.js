const {authUser,req:sbreq,json,profile}=require('./_lib');
const {createNotification}=require('../notify-push');

async function readReportStore(){
  try{
    const rows=await sbreq('/rest/v1/platform_settings?key=eq.review_reports&select=value&limit=1');
    const v=rows[0]?.value;return Array.isArray(v)?v:[];
  }catch{return []}
}
async function writeReportStore(reports){
  // Fallback storage must never write an astrologer UUID into platform_settings.updated_by.
  // That column references admin_accounts, so updated_by is intentionally omitted here.
  await sbreq('/rest/v1/platform_settings',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({key:'review_reports',value:reports,updated_at:new Date().toISOString()})});
}

async function getReportStoreForAstrologer(astrologerId){
  try{
    const rows=await sbreq(`/rest/v1/review_reports?astrologer_id=eq.${encodeURIComponent(astrologerId)}&select=id,review_id,status,created_at,resolved_at&order=created_at.desc&limit=500`);
    return Array.isArray(rows)?rows:[];
  }catch(e){
    if(!/relation|review_reports|schema cache|404|column .* does not exist/i.test(String(e?.message||'')))throw e;
    const stored=await readReportStore();
    return stored.filter(r=>String(r.astrologer_id)===String(astrologerId));
  }
}


module.exports=async(req,res)=>{
  try{
    const u=await authUser(req);
    if(!u)return json(res,401,{error:'Login required'});

    if(req.method==='GET'){
      const up=await profile(u.id);
      const isAstrologer=up?.role==='astrologer'||u.account_type==='astrologer'||u.user_metadata?.account_type==='astrologer';
      if(isAstrologer){
        const path=`/rest/v1/reviews?astrologer_id=eq.${encodeURIComponent(u.id)}&select=*&order=created_at.desc&limit=500`;
        const [reviews,reports]=await Promise.all([sbreq(path),getReportStoreForAstrologer(u.id)]);
        const latestOpen=new Map();
        for(const r of reports){if(String(r.status)==='open'&&!latestOpen.has(String(r.review_id)))latestOpen.set(String(r.review_id),r)}
        return json(res,200,{reviews:reviews.map(r=>({...r,report_status:latestOpen.has(String(r.id))?'open':null,report_id:latestOpen.get(String(r.id))?.id||null}))});
      }
      const cid=String(req.query?.conversationId||'').trim();
      const base=`/rest/v1/reviews?user_id=eq.${encodeURIComponent(u.id)}`;
      const path=cid
        ? `${base}&conversation_id=eq.${encodeURIComponent(cid)}&select=*&limit=1`
        : `${base}&select=*&order=created_at.desc`;
      const rows=await sbreq(path);
      return json(res,200,{reviews:rows,review:cid?(rows[0]||null):null,alreadyReviewed:!!(cid&&rows[0])});
    }

    const currentProfile=await profile(u.id);
    const isAstrologer=currentProfile?.role==='astrologer'||u.account_type==='astrologer'||u.user_metadata?.account_type==='astrologer';

    if(req.method==='POST'&&isAstrologer){
      const b=req.body||{};
      const reviewId=String(b.reviewId||'').trim();
      const message=String(b.message||'').trim().slice(0,2000);
      if(!reviewId||!message)return json(res,400,{error:'Review ID and report message are required'});
      const review=(await sbreq(`/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}&select=id,astrologer_id,user_id,rating,review,moderation_status&limit=1`))[0];
      if(!review||String(review.astrologer_id)!==String(u.id))return json(res,404,{error:'Review not found'});
      let open=null;
      try{open=(await sbreq(`/rest/v1/review_reports?review_id=eq.${encodeURIComponent(reviewId)}&reporter_id=eq.${encodeURIComponent(u.id)}&status=eq.open&select=id&limit=1`))[0]||null}
      catch(e){if(!/relation|review_reports|schema cache|404/i.test(String(e?.message||'')))throw e}
      if(!open){
        const stored=await readReportStore();
        open=stored.find(r=>String(r.review_id)===reviewId&&String(r.reporter_id)===String(u.id)&&String(r.status)==='open')||null;
      }
      if(open)return json(res,409,{error:'इस review की report पहले ही भेजी जा चुकी है'});
      let row;
      try{
        row=(await sbreq('/rest/v1/review_reports',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
          review_id:review.id,astrologer_id:u.id,reporter_id:u.id,message,status:'open'
        })}))[0];
      }catch(e){
        // Compatibility fallback: keep reports in the admin-only platform settings
        // bucket when the optional review_reports migration has not been run yet.
        if(!/relation|review_reports|schema cache|404/i.test(String(e?.message||'')))throw e;
        const reports=await readReportStore();
        row={id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,review_id:review.id,astrologer_id:u.id,reporter_id:u.id,message,status:'open',created_at:new Date().toISOString()};
        reports.unshift(row);await writeReportStore(reports);
      }
      return json(res,201,{report:row});
    }

    if(req.method==='POST'){
      if(u.account_type!=='user')return json(res,403,{error:'Only users can review'});
      const b=req.body||{};
      const cid=String(b.conversationId||'').trim();
      const rating=Math.max(1,Math.min(5,Number(b.rating||0)));
      if(!cid||!rating)return json(res,400,{error:'conversationId and rating required'});

      const c=(await sbreq(`/rest/v1/conversations?id=eq.${encodeURIComponent(cid)}&select=*`))[0];
      if(!c||c.user_id!==u.id||c.status!=='closed')return json(res,403,{error:'Review is allowed only after a closed chat'});

      // A review belongs to one exact Chat ID (conversation_id), not to the user/astrologer pair.
      // This lets the same user review every separate chat with the same astrologer.
      const existing=(await sbreq(`/rest/v1/reviews?conversation_id=eq.${encodeURIComponent(cid)}&user_id=eq.${encodeURIComponent(u.id)}&select=id,rating,review,created_at&limit=1`))[0];
      if(existing)return json(res,409,{error:'इस chat के लिए review पहले ही submit हो चुका है',review:existing,alreadyReviewed:true});

      const row={conversation_id:c.id,user_id:u.id,astrologer_id:c.astrologer_id,rating,review:String(b.review||'').slice(0,2000)};
      let rows;
      try{
        rows=await sbreq('/rest/v1/reviews',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
      }catch(e){
        if(/duplicate|unique|23505/i.test(String(e.message||'')))
          return json(res,409,{error:'इस chat के लिए review पहले ही submit हो चुका है',alreadyReviewed:true});
        throw e;
      }

      // Keep the review write independent from an optional rating_count column.
      // The current Bhavishya Gyani schema does not require rating_count on
      // public.astrologers; the profile API calculates the count from reviews.
      // Do not update public.astrologers.rating_count/rating_avg here.
      // Some deployments do not have those columns. The profile endpoint
      // calculates the aggregate directly from reviews, so saving the review
      // must never fail because of an optional astrologer column.
      const rs=await sbreq(`/rest/v1/reviews?astrologer_id=eq.${encodeURIComponent(c.astrologer_id)}&select=rating,moderation_status`);
      const visible=rs.filter(r=>String(r.moderation_status||'approved')!=='hidden');
      const avg=visible.length?visible.reduce((s,r)=>s+Number(r.rating||0),0)/visible.length:0;
      await createNotification({recipientId:c.astrologer_id,recipientRole:'astrologer',title:'⭐ नया Rating & Review',body:`आपको ${rating}/5 star की नई rating मिली है${String(b.review||'').trim()?' और एक review भी आया है।':'।'}`,notificationType:'rating_review',link:'/astrologer-dashboard.html',data:{rating,conversationId:c.id}});
      return json(res,201,{review:rows[0],alreadyReviewed:true,rating_avg:Math.round(avg*100)/100,rating_count:visible.length});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(e){return json(res,500,{error:e.message})}
};
