'use strict';
const assert = require('assert');
const path = require('path');

const enginePath = path.resolve(__dirname, '../lib/astrology-engine.js');
const matchingPath = path.resolve(__dirname, '../lib/matching.js');

const charts = new Map();
require.cache[enginePath] = {
  id: enginePath,
  filename: enginePath,
  loaded: true,
  exports: { calculateKundli: async input => charts.get(input.name) }
};

const after = (name, chart) => charts.set(name, chart);
function chart(name, gender, rashi, nakshatra, pada, degreeInSign=10) {
  const signs=['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
  const naks=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
  return { input:{name,gender}, birthDetails:{person:{name,gender}}, birthChart:{rashi,nakshatra,pada}, planets:{Moon:{sign:signs.indexOf(rashi)+1,signName:rashi,degreeInSign,nakshatra:{index:naks.indexOf(nakshatra)+1,pada}}, Mars:{sign:1,house:1}, Venus:{sign:1}}, engine:{} };
}


(async()=>{
  const {match}=require(matchingPath);
  after('A', chart('A','male','Mesha','Krittika',1));
  after('B', chart('B','female','Mesha','Krittika',2));
  let r=await match({name:'A',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'B',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Nadi').score,8,'same Nadi + same Rashi/different Nakshatra cancellation must work when applicable');

  after('C', chart('C','female','Vrischika','Mula',1));
  r=await match({name:'A',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'C',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Nadi').score,8,'Adi/Adi should cancel when same Nakshatra lord is applicable');

  after('D', chart('D','female','Mesha','Ashwini',1));
  r=await match({name:'A',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'D',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Nadi').score,8,'Ashwini/Krittika must be Adi/Antya and score 8');

  after('E', chart('E','female','Mesha','Krittika',2));
  after('F', chart('F','male','Taurus','Krittika',4));
  r=await match({name:'F',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'E',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Nadi').score,8,'same Nakshatra across different Rashis must cancel');

  after('G', chart('G','male','Mesha','Ashwini',1));
  after('H', chart('H','female','Scorpio','Mula',1));
  r=await match({name:'G',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'H',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Nadi').score,8,'same Nadi with same Nakshatra lord must cancel');

  after('I', chart('I','male','Mesha','Krittika',1));
  after('J', chart('J','female','Dhanu','Purva Ashadha',1,10));
  r=await match({name:'I',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'J',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Yoni').score,0,'Sheep-Monkey must use the hostile Yoni cell');

  after('K', chart('K','male','Dhanu','Purva Ashadha',1,20));
  after('L', chart('L','female','Makara','Uttara Ashadha',1,20));
  r=await match({name:'K',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'L',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Vashya').score,1,'Split Sagittarius/Capricorn Vashya classification must be degree-aware');

  // Regression: mixed Vashya cells must use the standard 5x5 table,
  // including the 1.5-point Chatushpada↔Vanachara and Manava↔Jalachara cells.
  after('V1', chart('V1','male','Simha','Ashwini',1));
  after('V2', chart('V2','female','Mesha','Krittika',1));
  r=await match({name:'V1',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'V2',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Vashya').score,1.5,'Chatushpada bride + Vanachara groom must score 1.5');

  after('V3', chart('V3','male','Mithuna','Ashwini',1));
  after('V4', chart('V4','female','Karka','Krittika',1));
  r=await match({name:'V3',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'V4',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Vashya').score,1.5,'Manava bride + Jalachara groom must score 1.5');


  after('M', chart('M','female','Mesha','Ashwini',1));
  after('N', chart('N','male','Mesha','Krittika',1));
  r=await match({name:'N',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'M',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Yoni').score,2,'Krittika must map to Sheep/Mesha Yoni, not an unknown Goat key');

  after('O', chart('O','male','Simha','Magha',1));
  after('P', chart('P','female','Mithuna','Ardra',1));
  r=await match({name:'O',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'P',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Graha Maitri').score,4,'Sun-Mercury must be Friend/Neutral = 4, not Neutral/Neutral = 3');

  after('Q', chart('Q','male','Mesha','Ashwini',1));
  after('R', chart('R','female','Vrishabha','Rohini',1));
  r=await match({name:'Q',gender:'male',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'}, {name:'R',gender:'female',dob:'2000-01-01',time:'12:00',place:'x',latitude:'1',longitude:'2',timezone:'5.5'});
  assert.equal(r.kutas.find(x=>x.key==='Gana').score,5,'Deva-Manushya must score 5/6');

  console.log('PASS: Ashtakoota matching regression tests');
})().catch(err=>{ console.error(err); process.exit(1); });
