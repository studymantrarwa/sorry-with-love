const {json}=require('./_lib');
module.exports=async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD') return json(res,405,{error:'Method not allowed'});
  return json(res,200,{ok:true,service:'Bhavishya Gyani',version:'37.2.4',node:true,vercel:!!process.env.VERCEL,ephemerisConfigured:!!process.env.EPHEMERIS_URL,supabaseConfigured:!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),blobConfigured:!!process.env.BLOB_READ_WRITE_TOKEN});
};
