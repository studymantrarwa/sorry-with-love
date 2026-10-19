const {rateLimitRequest,rateLimitResponse,json}=require('./_lib');
const {panchang}=require("../features-engine");

const pad=n=>String(n).padStart(2,"0");
const daysInMonth=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();

const COMMON_TITHI=new Set([2,3,5,7,10,11,13]);
const RULES={
  wedding:{
    label:"विवाह मुहूर्त",
    tithi:COMMON_TITHI,
    nak:new Set(["रोहिणी","मृगशिरा","मघा","उत्तराफाल्गुनी","हस्त","स्वाती","अनुराधा","मूल","उत्तराषाढ़ा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]), // सोम, बुध, गुरु, शुक्र
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति","विष्कम्भ"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  vehicle:{
    label:"वाहन मुहूर्त",
    tithi:COMMON_TITHI,
    nak:new Set(["अश्विनी","रोहिणी","मृगशिरा","पुनर्वसु","पुष्य","हस्त","चित्रा","स्वाती","अनुराधा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत","चर"]),
    minScore:3
  },
  griha_pravesh:{
    label:"गृह प्रवेश मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,12,13]),
    nak:new Set(["रोहिणी","मृगशिरा","अनुराधा","रेवती","उत्तराफाल्गुनी","उत्तराषाढ़ा","उत्तराभाद्रपद","चित्रा","धनिष्ठा"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत","चर"]),
    minScore:3
  },
  property:{
    label:"संपत्ति मुहूर्त",
    tithi:new Set([2,3,5,6,7,10,11,13]),
    nak:new Set(["अश्विनी","रोहिणी","मृगशिरा","पुष्य","हस्त","चित्रा","अनुराधा","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  business:{
    label:"व्यवसाय मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,13]),
    nak:new Set(["अश्विनी","रोहिणी","मृगशिरा","पुष्य","हस्त","चित्रा","स्वाती","अनुराधा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  naming:{
    label:"नामकरण मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,13]),
    nak:new Set(["अश्विनी","रोहिणी","मृगशिरा","पुष्य","हस्त","चित्रा","स्वाती","अनुराधा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  mundan:{
    label:"मुंडन मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,13]),
    nak:new Set(["अश्विनी","मृगशिरा","पुनर्वसु","पुष्य","हस्त","चित्रा","स्वाती","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  upanayan:{
    label:"उपनयन मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,13]),
    nak:new Set(["रोहिणी","मृगशिरा","पुनर्वसु","पुष्य","हस्त","चित्रा","स्वाती","अनुराधा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["शुभ","लाभ","अमृत"]),
    minScore:3
  },
  travel:{
    label:"यात्रा मुहूर्त",
    tithi:new Set([2,3,5,7,10,11,13]),
    nak:new Set(["अश्विनी","पुनर्वसु","पुष्य","हस्त","अनुराधा","श्रवण","धनिष्ठा","रेवती"]),
    days:new Set([0,1,3,4,5]),
    avoidYoga:new Set(["व्याघात","शूल","गण्ड","अतिगण्ड","वज्र","परिघ","वैधृति"]),
    goodChog:new Set(["चर","लाभ","अमृत","शुभ"]),
    minScore:3
  }
};

function minutesFromDisplay(s){
  if(!s||s==="—")return null;
  const m=String(s).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); if(!m)return null;
  let h=+m[1]; if(m[3].toUpperCase()==="PM"&&h!==12)h+=12; if(m[3].toUpperCase()==="AM"&&h===12)h=0;
  return h*60 + +m[2];
}
function fmtMinutes(mins){
  if(mins==null)return null;
  const v=((Number(mins)%1440)+1440)%1440,h=Math.floor(v/60),m=Math.round(v%60);
  const ap=h>=12?"PM":"AM",hh=h%12||12;
  return `${String(hh).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`;
}
function overlaps(a,b,c,d){return a<c?b>c:d>a;}
function subtractRahu(start,end,rahu){
  if(start==null||end==null)return [];
  if(!Array.isArray(rahu)||rahu.length<2)return [[start,end]];
  const r1=Number(rahu[0]),r2=Number(rahu[1]);
  if(!Number.isFinite(r1)||!Number.isFinite(r2)||r2<=r1)return [[start,end]];
  if(end<=r1||start>=r2)return [[start,end]];
  const out=[]; if(start<r1)out.push([start,r1]); if(end>r2)out.push([r2,end]); return out;
}
function localDateInRange(date,start,end){
  return String(date)>=String(start) && String(date)<=String(end);
}
async function findEkadashiDate(year,startISO,endISO,lat,lon,tz,shiftDays=0){
  const a=new Date(startISO+"T00:00:00Z"),b=new Date(endISO+"T00:00:00Z");
  for(let d=new Date(a);d<=b;d.setUTCDate(d.getUTCDate()+1)){
    const iso=`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
    const x=await panchang({date:iso,latitude:lat,longitude:lon,timezone:tz,summary:true});
    if(x.tithi?.number===11 && x.tithi?.paksha==="शुक्ल"){ const out=new Date(d); out.setUTCDate(out.getUTCDate()+shiftDays); return `${out.getUTCFullYear()}-${pad(out.getUTCMonth()+1)}-${pad(out.getUTCDate())}`; }
  }
  return null;
}
async function getChaturmasWindow(year,lat,lon,tz){
  const [start,end]=await Promise.all([
    findEkadashiDate(year,`${year}-07-01`,`${year}-08-10`,lat,lon,tz,1),
    findEkadashiDate(year,`${year}-10-25`,`${year}-12-05`,lat,lon,tz,0)
  ]);
  return {start,end};
}
function getSlots(x,rule){
  const out=[];
  for(const z of x.choghadiya||[]){
    if(!rule.goodChog.has(z.name))continue;
    const a=minutesFromDisplay(z.start),b=minutesFromDisplay(z.end);
    for(const [s,e] of subtractRahu(a,b,x.auspicious?.rahuKaalMinutes)) if(e-s>=10) out.push({name:z.name,start:fmtMinutes(s),end:fmtMinutes(e)});
  }
  const ab=x.auspicious?.abhijitMinutes;
  if(ab?.length===2){
    for(const [s,e] of subtractRahu(ab[0],ab[1],x.auspicious?.rahuKaalMinutes)) if(e-s>=10) out.push({name:"अभिजित",start:fmtMinutes(s),end:fmtMinutes(e)});
  }
  return out;
}

module.exports=async(req,res)=>{
  const limited=rateLimitResponse(res,await rateLimitRequest(req,"muhurat",8,60)); if(limited)return limited;
  try{
    const q=req.query||{};
    const year=Math.min(2100,Math.max(1900,Number(q.year)||new Date().getFullYear()));
    const month=Math.min(12,Math.max(1,Number(q.month)||new Date().getMonth()+1));
    const lat=Number(q.latitude),lon=Number(q.longitude),tz=Number(q.timezone);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(tz)) return res.status(400).json({ok:false,error:"स्थान की latitude, longitude और timezone आवश्यक हैं।"});
    const place=String(q.place||"India");
    const type=String(q.type||"wedding").toLowerCase();
    const rule=RULES[type]||RULES.wedding;
    const chaturmas=await getChaturmasWindow(year,lat,lon,tz);
    const chaturmasSensitive=new Set(["wedding","griha_pravesh"]).has(type);
    const total=daysInMonth(year,month),rows=[];
    for(let d=1;d<=total;d++){
      const date=`${year}-${pad(month)}-${pad(d)}`;
      const x=await panchang({date,latitude:lat,longitude:lon,timezone:tz,place,summary:true});
      const weekday=new Date(Date.UTC(year,month-1,d)).getUTCDay();
      const tithiOk=rule.tithi.has(Number(x.tithi?.number));
      const nakOk=rule.nak.has(x.nakshatra?.name);
      const dayOk=rule.days.has(weekday);
      const yogaOk=!rule.avoidYoga.has(x.yoga?.name);
      const seasonOk=!chaturmasSensitive || !chaturmas.start || !chaturmas.end || !localDateInRange(date,chaturmas.start,chaturmas.end);
      const score=Number(tithiOk)+Number(nakOk)+Number(dayOk)+Number(yogaOk)+Number(seasonOk);
      const suitable=score===5;
      const candidate=seasonOk && score>=rule.minScore;
      const slots=(suitable||candidate)?getSlots(x,rule):[];
      rows.push({
        date,day:d,weekday,x,suitable,candidate,score,
        criteria:{tithiOk,nakOk,dayOk,yogaOk,seasonOk},
        blockedReason:!seasonOk?"चातुर्मास के दौरान इस कार्य के लिए पारंपरिक विवाह/गृह-प्रवेश निषेध लागू":""
        ,times:slots.slice(0,6)
      });
    }
    res.json({
      ok:true,type,label:rule.label,year,month,place,latitude:lat,longitude:lon,timezone:tz,rows,
      method:"पंचांग-आधारित पारंपरिक shortlist: तिथि + नक्षत्र + वार + योग + लागू seasonal restriction, तथा राहुकाल से हटाए गए शुभ daytime slots",
      notice:`यह गणना चुने हुए स्थान के पंचांग data पर आधारित पारंपरिक shortlist है। ${chaturmasSensitive&&chaturmas.start&&chaturmas.end?`इस वर्ष का चातुर्मास ${chaturmas.start} से ${chaturmas.end} तक विवाह/गृह-प्रवेश shortlist में रोका गया है। `:""}व्यक्तिगत जन्म-कुंडली, स्थानीय परंपरा, ग्रह अस्त/उदय और अन्य क्षेत्रीय निषेध अलग से लागू हो सकते हैं।`
    });
  }catch(e){res.status(500).json({ok:false,error:e.message||"Muhurat calculation failed"});}
};
module.exports.RULES=RULES;
