const {numerology}=require("../features-engine");
const {json,rateLimitRequest,rateLimitResponse}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const limited=rateLimitResponse(res,await rateLimitRequest(req,"numerology",60,60)); if(limited)return limited;
  try{return json(res,200,numerology(req.body||{}));}catch(e){return json(res,400,{error:"Numerology calculation failed."});}
};
