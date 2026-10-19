const {authUser,req:sbreq,json}=require('./_lib');

function hashCode(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

module.exports=async(req,res)=>{
  try{
    const u=await authUser(req);
    if(!u || u.account_type!=='user') return json(res,401,{error:'User login required'});

    // Do not join `profiles` here. The current Bhavishya Gyani schema
    // keeps astrologer profile data directly in `astrologers`, so a
    // PostgREST relationship join can fail with a schema-cache error.
    const rows=await sbreq(
      '/rest/v1/astrologers?verified=eq.true&blocked=eq.false&select=*&order=rank_position.asc.nullslast,rank_score.desc,online.desc'
    );
    let reviewRows=[];try{reviewRows=await sbreq('/rest/v1/reviews?select=astrologer_id,rating,moderation_status&limit=10000')}catch(_){}
    const ratingMap=new Map();
    for(const r of reviewRows){if(String(r.moderation_status||'approved')==='hidden')continue;const id=String(r.astrologer_id);const x=ratingMap.get(id)||{sum:0,count:0};x.sum+=Number(r.rating||0);x.count++;ratingMap.set(id,x)}

    // Profile photos/names may live in `profiles` while consultation settings
    // live in `astrologers`. Merge them so every Home astrologer card can
    // reliably show the same profile picture in both sections.
    const ids=rows.map(a=>String(a.id||'')).filter(Boolean);
    let activeMap=new Map();
    if(ids.length){
      try{
        const ar=await sbreq(`/rest/v1/conversations?astrologer_id=in.(${ids.map(id=>encodeURIComponent(id)).join(',')})&or=(and(channel.eq.chat,status.eq.accepted,chat_started_at.not.is.null),and(channel.eq.call,status.eq.call_accepted,call_started_at.not.is.null))&select=id,astrologer_id,channel,session_end_at,chat_started_at,chat_budget_seconds,call_started_at,call_budget_seconds`);
        for(const c of (ar||[])){
          const start=c.channel==='call'?c.call_started_at:c.chat_started_at;
          const budget=c.channel==='call'?c.call_budget_seconds:c.chat_budget_seconds;
          const end=c.session_end_at||new Date(new Date(start).getTime()+Math.max(0,Number(budget||0))*1000).toISOString();
          const endMs=new Date(end).getTime();
          if(Number.isFinite(endMs)&&endMs>Date.now())activeMap.set(String(c.astrologer_id),{conversation_id:c.id,session_end_at:end,channel:c.channel});
        }
      }catch(_){}
    }
    let profileMap={};
    if(ids.length){
      const inList=ids.map(id=>encodeURIComponent(id)).join(',');
      const ps=await sbreq(`/rest/v1/profiles?id=in.(${inList})&select=id,full_name,avatar_url,blocked`);
      profileMap=Object.fromEntries(ps.map(p=>[String(p.id),p]));
    }
    const active=rows.map(a=>{
      const p=profileMap[String(a.id)]||{};
      const rr=ratingMap.get(String(a.id));
      const liveRating=rr?.count?Math.round((rr.sum/rr.count)*100)/100:Number(a.rating_avg||0);
      return {
        ...a,
        online:activeMap.has(String(a.id)) ? true : !!a.online,
        availability_state: activeMap.has(String(a.id)) ? 'BUSY' : (a.online ? 'AVAILABLE' : 'OFFLINE'),
        busy_until: activeMap.get(String(a.id))?.session_end_at || null,
        active_session_channel: activeMap.get(String(a.id))?.channel || null,
        rating_avg:liveRating,
        rating_count:rr?.count||0,
        full_name:a.full_name||p.full_name||'Astrologer',
        avatar_url:a.avatar_url||p.avatar_url||null,
        base_fee_per_minute:Number(a.fee_per_minute||a.fee||0),
        discount_percent:[0,25,50,75].includes(Number(a.discount))?Number(a.discount):0,
        effective_fee_per_minute:Math.round(Number(a.fee_per_minute||a.fee||0)*(1-(Number(a.discount)||0)/100)*100)/100
      };
    });

    // Fair-reach ordering: every approved astrologer stays in the rotation.
    // Higher performers receive more exposure slots, while low/new performers
    // still receive guaranteed base slots. Rotation changes with time so the
    // same top accounts do not permanently occupy the first positions.
    const maxScore=Math.max(1,...active.map(x=>Number(x.rank_score||0)));
    const nowSlot=Math.floor(Date.now()/3600000);
    const buckets=active.map((x,i)=>{
      const performance=Math.max(0,Math.min(1,Number(x.rank_score||0)/maxScore));
      const reachWeight=1+performance*4+(x.boosted?0.75:0)+(x.online?0.25:0);
      const phase=(Math.abs(hashCode(String(x.id)))+nowSlot)%100000;
      return {...x,reach_weight:Number(reachWeight.toFixed(2)),exposure_score:Number((performance*100).toFixed(2)),_phase:phase/reachWeight};
    }).sort((a,b)=>a._phase-b._phase);
    const cleaned=buckets.map(({_phase,...x},i)=>({...x,rotation_position:i+1}));
    return json(res,200,{astrologers:cleaned});
  }catch(e){
    return json(res,500,{error:e.message});
  }
};
