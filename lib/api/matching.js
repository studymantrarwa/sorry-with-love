const {match}=require("../matching");
const {json,rateLimitRequest,rateLimitResponse}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  const limited=rateLimitResponse(res,await rateLimitRequest(req,"matching",30,60)); if(limited)return limited;
  try{return res.status(200).json(await match(req.body?.a||{},req.body?.b||{}));}
  catch(e){return json(res,400,{error:"Matching calculation failed. Please verify the birth details."});}
};
