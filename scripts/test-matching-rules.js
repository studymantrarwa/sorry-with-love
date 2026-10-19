const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './astrology-engine') {
    return {
      calculateKundli: async (input) => ({
        input,
        birthChart: { rashi: input.rashi, nakshatra: input.nakshatra, pada: input.pada || 1 },
        planets: { Moon: { signName: input.rashi, sign: input.rashiIndex, nakshatra: { name: input.nakshatra, index: input.nakIndex, pada: input.pada || 1 } } }
      })
    };
  }
  return originalLoad.apply(this, arguments);
};
const {match} = require('../lib/matching');
Module._load = originalLoad;

const base = {name:'A',dob:'2000-01-01',time:'12:00',place:'Test',latitude:'26',longitude:'80',timezone:'5.5',gender:'male'};
const b = {...base,name:'B',gender:'female'};
const boy = {...base,rashi:'Mesha',nakshatra:'Ashwini',pada:1};
const girl = {...b,rashi:'Simha',nakshatra:'Purva Phalguni',pada:1};

(async()=>{
  const r=await match(boy,girl);
  const scores=Object.fromEntries(r.kutas.map(k=>[k.key,k.score]));
  const expected={Varna:1,Vashya:0,Tara:3,Yoni:3,'Graha Maitri':5,Gana:5,Bhakoot:0,Nadi:8};
  for(const [k,v] of Object.entries(expected)) if(scores[k]!==v) throw new Error(`${k}: expected ${v}, got ${scores[k]}`);
  if(r.score!==25) throw new Error(`Reference total expected 25, got ${r.score}`);
  const maxTotal=r.kutas.reduce((sum,k)=>sum+Number(k.max||0),0);
  if(r.maxScore!==36 || maxTotal!==36) throw new Error(`Ashtakoota maximum must be 36/36, got ${r.maxScore}/${maxTotal}`);
  console.log('PERFECT SCALE CHECK PASS: Ashtakoota 36/36');
  // Maximum-scale validation: every Kuta must expose its canonical maximum,
  // and the eight maxima must sum to exactly 36. This is intentionally separate
  // from any particular couple's real-world score.
  const maxima={Varna:1,Vashya:2,Tara:3,Yoni:4,'Graha Maitri':5,Gana:6,Bhakoot:7,Nadi:8};
  for(const [k,v] of Object.entries(maxima)) if(Number(r.kutas.find(x=>x.key===k)?.max)!==v) throw new Error(`${k}: maximum must be ${v}`);
  if(Object.values(maxima).reduce((a,b)=>a+b,0)!==36) throw new Error('Ashtakoota maximum scale must total 36/36');
  console.log('MAXIMUM SCALE PASS: 1+2+3+4+5+6+7+8 = 36/36');

  if(!r.kutas.find(k=>k.key==='Bhakoot').cancellation) throw new Error('Bhakoot cancellation screening should be true for Mars/Sun');
  console.log('REFERENCE CASE PASS:', scores, r.score+'/36');
  console.log('All 8-koota reference regression checks PASS');
})().catch(e=>{console.error(e);process.exit(1)});
