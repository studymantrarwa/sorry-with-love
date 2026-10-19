const {panchang}=require("../features-engine");
const {json,rateLimitRequest,rateLimitResponse}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
  const limited=rateLimitResponse(res,await rateLimitRequest(req,"panchang",90,60)); if(limited)return limited;
  try{return json(res,200,await panchang(req.query||{}));}catch(e){return json(res,500,{error:"Panchang calculation failed."});}
};
