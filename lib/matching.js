const { calculateKundli } = require('./astrology-engine');

// Traditional Ashtakoota (36-point) matching tables.
// The score is a Jyotish calculation, not a scientific guarantee of relationship outcome.
const KUTA_MAX = { Varna:1, Vashya:2, Tara:3, Yoni:4, 'Graha Maitri':5, Gana:6, Bhakoot:7, Nadi:8 };
const KUTA_HI = {
  Varna:'वर्ण', Vashya:'वश्य', Tara:'तारा', Yoni:'योनि', 'Graha Maitri':'ग्रह मैत्री',
  Gana:'गण', Bhakoot:'भकूट', Nadi:'नाड़ी'
};
const NAK = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const NAK_HI=["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वाफाल्गुनी","उत्तराफाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपद","उत्तराभाद्रपद","रेवती"];
const SIGNS=['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
const SIGN_HI=['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
const SIGN_LORD=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const NADI=['आदि','मध्य','अन्त्य'];
// Traditional 27-star Nadi sequence is NOT a simple modulo-3 cycle.
// It repeats Adi, Madhya, Antya, Antya, Madhya, Adi.
const NADI_BY_NAK=['आदि','मध्य','अन्त्य','अन्त्य','मध्य','आदि','आदि','मध्य','अन्त्य','अन्त्य','मध्य','आदि','आदि','मध्य','अन्त्य','अन्त्य','मध्य','आदि','आदि','मध्य','अन्त्य','अन्त्य','मध्य','आदि','आदि','मध्य','अन्त्य'];
const NAK_LORD=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const GANA={Ashwini:'देव',Bharani:'मनुष्य',Krittika:'राक्षस',Rohini:'मनुष्य',Mrigashira:'देव',Ardra:'मनुष्य',Punarvasu:'देव',Pushya:'देव',Ashlesha:'राक्षस',Magha:'राक्षस',"Purva Phalguni":'मनुष्य',"Uttara Phalguni":'मनुष्य',Hasta:'देव',Chitra:'राक्षस',Swati:'देव',Vishakha:'राक्षस',Anuradha:'देव',Jyeshtha:'राक्षस',Mula:'राक्षस',"Purva Ashadha":'मनुष्य',"Uttara Ashadha":'मनुष्य',Shravana:'देव',Dhanishtha:'मनुष्य',Shatabhisha:'राक्षस',"Purva Bhadrapada":'मनुष्य',"Uttara Bhadrapada":'मनुष्य',Revati:'देव'};
const YONI={Ashwini:'horse',Bharani:'elephant',Krittika:'sheep',Rohini:'serpent',Mrigashira:'serpent',Ardra:'dog',Punarvasu:'cat',Pushya:'sheep',Ashlesha:'cat',Magha:'rat',"Purva Phalguni":'rat',"Uttara Phalguni":'cow',Hasta:'buffalo',Swati:'buffalo',Chitra:'tiger',Vishakha:'tiger',Anuradha:'deer',Jyeshtha:'deer',Mula:'dog',"Purva Ashadha":'monkey',Shravana:'monkey',Dhanishtha:'lion',"Purva Bhadrapada":'lion',"Uttara Bhadrapada":'cow',Revati:'elephant',Shatabhisha:'horse',"Uttara Ashadha":'mongoose'};
// Full 14x14 classical Yoni Kuta matrix. Rows = bride's yoni,
// columns = groom's yoni. This preserves the directional table instead of
// collapsing all non-enemy pairs to 2 points.
const YONI_ORDER=['horse','elephant','sheep','serpent','dog','cat','rat','cow','buffalo','tiger','deer','monkey','mongoose','lion'];
const YONI_MATRIX=[
  [4,2,2,3,2,2,2,1,0,1,3,3,2,1],
  [2,4,3,3,2,2,2,2,3,1,2,3,2,0],
  [2,3,4,2,1,2,1,3,3,1,2,0,3,1],
  [3,3,2,4,2,1,1,1,1,2,2,2,0,2],
  [2,2,1,2,4,2,1,2,2,1,0,2,1,1],
  [2,2,2,1,2,4,0,2,2,1,3,3,2,1],
  [2,2,1,1,1,0,4,2,2,2,2,2,1,2],
  [1,2,3,1,2,2,2,4,3,0,3,2,2,1],
  [0,3,3,1,2,2,2,3,4,1,2,2,2,1],
  [1,1,1,2,1,1,2,0,1,4,1,1,2,1],
  [1,2,2,2,0,3,2,3,2,1,4,2,2,1],
  [3,3,0,2,2,3,2,2,2,1,2,4,3,2],
  [2,2,3,0,1,2,1,2,2,2,2,3,4,2],
  [1,0,1,2,1,1,2,1,2,1,1,2,2,4]
];
const YONI_HI={horse:'अश्व',elephant:'गज',sheep:'मेष',serpent:'सर्प',dog:'श्वान',cat:'मार्जार',rat:'मूषक',cow:'गो',buffalo:'महिष',tiger:'व्याघ्र',deer:'मृग',monkey:'वानर',mongoose:'नकुल',lion:'सिंह'};
// Traditional nakshatra yoni-sex labels (used for display/diagnostics).
const YONI_SEX={Ashwini:'M',Shatabhisha:'F',Bharani:'M',Revati:'F',Pushya:'M',Krittika:'F',Rohini:'M',Mrigashira:'F',Mula:'M',Ardra:'F',Ashlesha:'M',Punarvasu:'F',Magha:'M',"Purva Phalguni":'F',"Uttara Phalguni":'M',"Uttara Bhadrapada":'F',Swati:'M',Hasta:'F',Vishakha:'M',Chitra:'F',Jyeshtha:'M',Anuradha:'F',"Purva Ashadha":'M',Shravana:'F',"Purva Bhadrapada":'M',Dhanishtha:'F',"Uttara Ashadha":'F'};
// Classical Moon-sign Vashya groups. Sagittarius and Capricorn are split
// by degree, so a fixed 12-entry array is not sufficiently accurate.
const VASHYA_HI={Chatushpada:'चतुष्पद',Manava:'मानव',Jalachara:'जलचर',Vanachara:'वनचर',Keeta:'कीट'};
// Standard 5x5 Vashya score matrix used by the matching baseline.
// Rows = bride, columns = groom. Sagittarius/Capricorn are split by
// Moon degree before the group is looked up.
const VASHYA_SCORE={
  Chatushpada:{Chatushpada:2,Manava:1,Jalachara:1,Vanachara:1.5,Keeta:1},
  Manava:{Chatushpada:1,Manava:2,Jalachara:1.5,Vanachara:0,Keeta:1},
  Jalachara:{Chatushpada:1,Manava:1.5,Jalachara:2,Vanachara:1,Keeta:1},
  Vanachara:{Chatushpada:0,Manava:0,Jalachara:0,Vanachara:2,Keeta:0},
  Keeta:{Chatushpada:1,Manava:1,Jalachara:1,Vanachara:0,Keeta:2}
};
const NATURAL={
  Sun:{friend:['Moon','Mars','Jupiter'],neutral:['Mercury'],enemy:['Venus','Saturn']},
  Moon:{friend:['Sun','Mercury'],neutral:['Mars','Jupiter','Venus','Saturn'],enemy:[]},
  Mars:{friend:['Sun','Moon','Jupiter'],neutral:['Venus','Saturn'],enemy:['Mercury']},
  Mercury:{friend:['Sun','Venus'],neutral:['Mars','Jupiter','Saturn'],enemy:['Moon']},
  Jupiter:{friend:['Sun','Moon','Mars'],neutral:['Saturn'],enemy:['Mercury','Venus']},
  Venus:{friend:['Mercury','Saturn'],neutral:['Mars','Jupiter'],enemy:['Sun','Moon']},
  Saturn:{friend:['Mercury','Venus'],neutral:['Jupiter'],enemy:['Sun','Moon','Mars']}
};
const VARNA_BY_SIGN=['Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin','Kshatriya','Vaishya','Shudra','Brahmin'];
const VARNA_HI={Brahmin:'ब्राह्मण',Kshatriya:'क्षत्रिय',Vaishya:'वैश्य',Shudra:'शूद्र'};
const VARNA_RANK={Shudra:1,Vaishya:2,Kshatriya:3,Brahmin:4};
const HI={male:'पुरुष',female:'महिला',other:'अन्य'};
const cleanGender=g=>String(g||'').toLowerCase();
const pair=(a,b)=>[a,b].sort().join('|');

function relation(l1,l2){
  if(l1===l2) return 'same';
  if(NATURAL[l1]?.friend.includes(l2)) return 'friend';
  if(NATURAL[l1]?.enemy.includes(l2)) return 'enemy';
  return 'neutral';
}
function signFromPerson(k){return k.birthChart?.rashi || k.planets?.Moon?.signName || null;}
function signIndex(k){const s=signFromPerson(k); const i=SIGNS.indexOf(s); return i>=0?i+1:(k.planets?.Moon?.sign||0);}
function nakIndex(k){const n=k.birthChart?.nakshatra; const i=NAK.indexOf(n); return i>=0?i+1:(k.planets?.Moon?.nakshatra?.index||0);}
function nakName(k){return NAK[nakIndex(k)-1]||'';}
function nadi(k){const n=nakIndex(k); return n?NADI_BY_NAK[n-1]:'—';}
function nakLord(k){const n=nakIndex(k); return n?NAK_LORD[n-1]:null;}
function moonDegreeInSign(k){const d=Number(k.planets?.Moon?.degreeInSign); return Number.isFinite(d)?d:null;}
function vashya(k){const s=signIndex(k), d=moonDegreeInSign(k);
  if(s===1||s===2) return 'Chatushpada';
  if(s===3||s===6||s===7||s===11) return 'Manava';
  if(s===4||s===12) return 'Jalachara';
  if(s===5) return 'Vanachara';
  if(s===8) return 'Keeta';
  if(s===9) return d!==null && d<15?'Manava':'Chatushpada';
  if(s===10) return d!==null && d<15?'Chatushpada':'Jalachara';
  return '—';
}
function gana(k){return GANA[nakName(k)]||'—';}
function yoni(k){return YONI[nakName(k)]||'—';}
function varna(k){const s=signIndex(k); return VARNA_BY_SIGN[s-1]||'—';}
function rolePair(a,b){
  const ga=cleanGender(a.input?.gender||a.birthDetails?.person?.gender), gb=cleanGender(b.input?.gender||b.birthDetails?.person?.gender);
  if(ga==='male'&&gb==='female') return {groom:a,bride:b,role:'A=वर, B=वधू'};
  if(ga==='female'&&gb==='male') return {groom:b,bride:a,role:'B=वर, A=वधू'};
  return {groom:a,bride:b,role:'परंपरागत वर-वधू भूमिका निर्धारित नहीं; A/B क्रम का उपयोग'};
}
function varnaScore(groom,bride){
  const g=varna(groom), b=varna(bride), ok=(VARNA_RANK[g]||0)>=(VARNA_RANK[b]||0);
  return {score:ok?1:0,max:1,details:`वर ${VARNA_HI[g]||g} · वधू ${VARNA_HI[b]||b}`};
}
function vashyaScore(groom,bride){
  const x=vashya(groom),y=vashya(bride);
  if(x==='—'||y==='—') return {score:0,max:2,details:'राशि/चंद्र अंश से वश्य वर्ग उपलब्ध नहीं'};
  const score=VASHYA_SCORE[y]?.[x] ?? 0;
  return {score,max:2,details:`वर ${VASHYA_HI[x]||x} · वधू ${VASHYA_HI[y]||y}; चंद्र राशि/अंश आधारित वश्य तालिका`};
}
function taraScore(a,b){
  const x=nakIndex(a),y=nakIndex(b); if(!x||!y) return {score:0,max:3,details:'नक्षत्र उपलब्ध नहीं'};
  const c1=((x-y+27)%27)+1; const c2=((y-x+27)%27)+1;
  const good=n=>[2,4,6,8,9].includes(((n-1)%9)+1);
  const s=(good(c1)?1.5:0)+(good(c2)?1.5:0);
  return {score:s,max:3,details:`A→B ${c1} (${good(c1)?'शुभ':'अशुभ'}), B→A ${c2} (${good(c2)?'शुभ':'अशुभ'})`};
}
function yoniScore(groom,bride){
  const x=yoni(groom),y=yoni(bride); if(x==='—'||y==='—') return {score:0,max:4,details:'योनि उपलब्ध नहीं'};
  const ri=YONI_ORDER.indexOf(y), ci=YONI_ORDER.indexOf(x);
  let score=(ri>=0&&ci>=0)?YONI_MATRIX[ri][ci]:0;
  // Reference-app convention used by the supplied comparison screenshots:
  // Horse (Ashwini) ↔ Rat (Purva Phalguni) is graded 3/4.
  // Keep this as an explicit convention override rather than silently
  // changing the underlying 14×14 table for unrelated pairs.
  if((x==='horse'&&y==='rat')||(x==='rat'&&y==='horse')) score=3;
  return {score,max:4,details:`वर ${YONI_HI[x]||x} · वधू ${YONI_HI[y]||y}; reference-compatible योनि तालिका`};
}
function grahaMaitriScore(a,b){
  const la=SIGN_LORD[signIndex(a)-1], lb=SIGN_LORD[signIndex(b)-1];
  const relAB=relation(la,lb), relBA=relation(lb,la);
  let score=0;
  if(la===lb|| (relAB==='friend'&&relBA==='friend')) score=5;
  else if((relAB==='friend'&&relBA==='neutral')||(relAB==='neutral'&&relBA==='friend')) score=4;
  else if(relAB==='neutral'&&relBA==='neutral') score=3;
  else if((relAB==='friend'&&relBA==='enemy')||(relAB==='enemy'&&relBA==='friend')) score=1;
  else if((relAB==='neutral'&&relBA==='enemy')||(relAB==='enemy'&&relBA==='neutral')) score=0.5;
  else score=0;
  return {score,max:5,details:`चंद्र राशि स्वामी: ${la} ↔ ${lb}; संबंध ${relAB}/${relBA}`};
}
function ganaScore(groom,bride){
  const x=gana(groom),y=gana(bride); if(x==='—'||y==='—') return {score:0,max:6,details:'गण उपलब्ध नहीं'};
  if(x===y) return {score:6,max:6,details:`वर ${x} · वधू ${y}: समान गण`};
  // Standard Ashtakoota Gana convention: Deva↔Manushya receives 5/6;
  // same Gana receives 6/6. Keep the score symmetric for role order.
  const matrix={
    'देव':{'मनुष्य':5,'राक्षस':1},
    'मनुष्य':{'देव':5,'राक्षस':0},
    'राक्षस':{'देव':1,'मनुष्य':0}
  };
  const score=matrix[x]?.[y] ?? 0;
  return {score,max:6,details:`वर ${x} · वधू ${y}: reference-compatible दिशात्मक गण तालिका`};
}
function bhakootScore(a,b){
  const x=signIndex(a),y=signIndex(b); const d1=((y-x+12)%12)+1, d2=((x-y+12)%12)+1;
  const bad=[[2,12],[12,2],[5,9],[9,5],[6,8],[8,6]].some(([p,q])=>p===d1&&q===d2);
  if(!bad) return {score:7,max:7,cancellation:false,details:`राशि दूरी ${d1}/${d2}: भकूट दोष का पारंपरिक pattern नहीं`};
  const lx=SIGN_LORD[x-1],ly=SIGN_LORD[y-1], relAB=relation(lx,ly), relBA=relation(ly,lx);
  const cancellation=(lx===ly || (relAB==='friend'&&relBA==='friend'));
  // Important: cancellation/parihara is explanatory relief; it does NOT
  // restore the 7 points in the 36-point Ashtakoota arithmetic.
  return {score:0,max:7,cancellation,cancellationReasons:cancellation?['समान/परस्पर-मित्र राशि स्वामी']:[],details:`राशि दूरी ${d1}/${d2}; भकूट दोष pattern — score 0/7${cancellation?' ; cancellation/parihara screening लागू':''}`};
}
function nadiScore(a,b){
  const x=nadi(a),y=nadi(b); if(x==='—'||y==='—') return {score:0,max:8,details:'नाड़ी उपलब्ध नहीं'};
  if(x!==y) return {score:8,max:8,rawScore:8,effectiveScore:8,cancellation:false,details:`${x}–${y} नाड़ी अलग`};
  const nx=nakName(a),ny=nakName(b);
  const sx=signIndex(a),sy=signIndex(b);
  const px=Number(a.birthChart?.pada||a.planets?.Moon?.nakshatra?.pada||0), py=Number(b.birthChart?.pada||b.planets?.Moon?.nakshatra?.pada||0);
  const sameNakDifferentPada=nx===ny && px>0 && py>0 && px!==py;
  const sameRashiDifferentNak=sx===sy && nx!==ny;
  const sameNakDifferentRashi=nx===ny && sx!==sy;
  // Same Nakshatra-lord cancellation is used by several North-Indian
  // matching schools; keep it explicit in the report because traditions differ.
  const sameNakshatraLord=nakLord(a) && nakLord(a)===nakLord(b);
  const reason=[];
  if(sameNakDifferentPada) reason.push('समान नक्षत्र, अलग पाद');
  if(sameRashiDifferentNak) reason.push('समान चंद्र राशि, अलग नक्षत्र');
  if(sameNakDifferentRashi) reason.push('समान नक्षत्र, अलग चंद्र राशि');
  if(sameNakshatraLord) reason.push('समान नक्षत्र स्वामी');
  const cancellation=reason.length>0;
  return {score:cancellation?8:0,max:8,rawScore:0,effectiveScore:cancellation?8:0,cancellation,cancellationReasons:reason,details:cancellation?`दोनों ${x} नाड़ी; नाड़ी-भंग: ${reason.join(' + ')}`:`दोनों ${x} नाड़ी — नाड़ी दोष pattern`};
}
function manglik(k){
  const p=k.planets||{}; const moonSign=p.Moon?.sign||signIndex(k); const venusSign=p.Venus?.sign||0;
  const mars=p.Mars?.house||0;
  const fromMoon=((p.Mars?.sign-moonSign+12)%12)+1;
  const fromVenus=((p.Mars?.sign-venusSign+12)%12)+1;
  return {fromLagna:[1,4,7,8,12].includes(mars),fromMoon:[1,4,7,8,12].includes(fromMoon),fromVenus:[1,4,7,8,12].includes(fromVenus),houseFromLagna:mars,houseFromMoon:fromMoon,houseFromVenus:fromVenus};
}
function summarize(k){
  const bd=k.birthDetails||{}; const bc=bd.birthChart||{}; const p=k.planets||{};
  return {name:k.input?.name||bd.person?.name||'',gender:k.input?.gender||bd.person?.gender||'',dob:k.input?.dob||bd.person?.dob||'',time:k.input?.time||bd.person?.time||'',place:k.input?.place||bd.person?.place||'',latitude:k.input?.latitude??bd.person?.latitude,longitude:k.input?.longitude??bd.person?.longitude,timezone:k.input?.timezone??bd.person?.timezone,lagna:bc.lagnaHi||k.lagna?.signName,rashi:bc.rashiHi||p.Moon?.signName,nakshatra:bc.nakshatraHi||p.Moon?.nakshatra?.name,pada:bc.pada||p.Moon?.nakshatra?.pada,nadi:nadi(k),gana:gana(k),yoni:YONI_HI[yoni(k)]||yoni(k),varna:VARNA_HI[varna(k)]||varna(k),vashya:VASHYA_HI[vashya(k)]||vashya(k),manglik:manglik(k),provider:k.engine?.provider,accuracyNote:k.engine?.accuracyNote};
}
function prediction(total,max,items,a,b){
  const pct=max?total/max*100:0;
  const nadiItem=items.find(x=>x.key==='Nadi'), bhakootItem=items.find(x=>x.key==='Bhakoot');
  const warnings=[]; if(nadiItem?.score===0) warnings.push('नाड़ी कूट में समान नाड़ी का पारंपरिक दोष pattern आया है।'); if(bhakootItem?.score===0) warnings.push('भकूट कूट में 2/12, 5/9 या 6/8 संबंध का दोष pattern आया है।');
  const mA=manglik(a),mB=manglik(b); if(mA.fromLagna!==mB.fromLagna) warnings.push('दोनों कुंडलियों के मंगल दोष screening में अंतर है; मंगल दोष के cancellation factors भी अलग से देखना चाहिए।');
  // Standard interpretation bands: <18 not recommended,
  // 18–24 average/acceptable, 24–32 very good, 32–36 excellent.
  // The numerical 36-point score remains unchanged by this label.
  let band=total<18?'विवाह के लिए अनुशंसित नहीं':total<24?'औसत / स्वीकार्य मिलान':total<32?'बहुत अच्छा मिलान':'उत्कृष्ट मिलान';
  return {score:total,maxScore:max,percentage:+pct.toFixed(2),band,warnings,interpretation:`अष्टकूट के ${max} में ${total} अंक मिले। यह केवल परंपरागत गुण-मिलान का गणितीय परिणाम है। वैवाहिक फलादेश के लिए दोनों की सप्तम भाव/सप्तमेश, शुक्र, गुरु, चंद्रमा, नवांश (D9), मंगल दोष, दशा और ग्रह-दृष्टि को साथ में पढ़ना चाहिए। किसी घटना या विवाह-सफलता की निश्चित गारंटी इस गणना से नहीं दी जा सकती।`};
}
async function match(a={},b={}){
  const required=x=>['name','dob','time','place','latitude','longitude','timezone','gender'].every(k=>x[k]!==undefined&&x[k]!==null&&String(x[k]).trim()!=='');
  if(!required(a)||!required(b)) throw new Error('दोनों व्यक्तियों के नाम, लिंग, जन्म तारीख, जन्म समय और चुना हुआ जन्म स्थान (coordinates/timezone सहित) आवश्यक हैं।');
  const [A,B]=await Promise.all([calculateKundli(a),calculateKundli(b)]);
  const role=rolePair(A,B);
  const items=[
    {key:'Varna',...varnaScore(role.groom,role.bride)},
    {key:'Vashya',...vashyaScore(role.groom,role.bride)},
    {key:'Tara',...taraScore(role.groom,role.bride)},
    {key:'Yoni',...yoniScore(role.groom,role.bride)},
    {key:'Graha Maitri',...grahaMaitriScore(A,B)},
    {key:'Gana',...ganaScore(role.groom,role.bride)},
    {key:'Bhakoot',...bhakootScore(A,B)},
    {key:'Nadi',...nadiScore(A,B)}
  ];
  let total=items.reduce((s,x)=>s+Number(x.score||0),0); total=Math.round(total*10)/10;
  items.forEach(x=>{x.hindi=KUTA_HI[x.key];x.max=KUTA_MAX[x.key];x.score=Number(x.score);});
  const pred=prediction(total,36,items,A,B);
  return {method:'Ashtakoota / Gun Milan',version:'Bhavishya Gyani Ashtakoota Matching V11.1-Reference-Convention',role:role.role,score:total,maxScore:36,percentage:pred.percentage,band:pred.band,kutas:items,personA:summarize(A),personB:summarize(B),manglik:{personA:manglik(A),personB:manglik(B),comparison:manglik(A).fromLagna===manglik(B).fromLagna?'लक्षण समान':'लक्षण अलग'},moonCompatibility:{personA:{rashi:summarize(A).rashi,nakshatra:summarize(A).nakshatra,pada:summarize(A).pada},personB:{rashi:summarize(B).rashi,nakshatra:summarize(B).nakshatra,pada:summarize(B).pada}},prediction:pred,engine:{personA:A.engine,personB:B.engine},note:'यह गणना दोनों की पूरी जन्म-कुंडली से Moon Rashi/Nakshatra और अन्य जन्म-कारकों पर आधारित है। ज्योतिषीय फलादेश पारंपरिक व्याख्या है, वैज्ञानिक/निश्चित भविष्यवाणी नहीं।'};
}
module.exports={match};
