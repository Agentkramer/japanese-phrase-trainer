const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.split('<script>')[1].split('</script>')[0];
const ctx={};vm.createContext(ctx);
vm.runInContext(code+';this.t={convert,checkAnswer,bestAlternative,WEEKS,VOICES,allPhrases,hearPhrases,audioId,weekPhrases,reviewCards,deckSize,resolveProfile,fillPhrase,nameToKana,isKana,COUNTRIES,JOBS,EXAMPLE,numberReading,priceItem,PRICES,parseYen,priceHint,strip}',ctx);
const {convert,checkAnswer,bestAlternative,WEEKS,VOICES,allPhrases,hearPhrases,audioId,weekPhrases,reviewCards,deckSize,resolveProfile,fillPhrase,nameToKana,isKana,COUNTRIES,JOBS,EXAMPLE,numberReading,priceItem,PRICES,parseYen,priceHint,strip}=ctx.t;
/* Week 1 is built from the learner's profile. Daniel's own must reproduce his original cards. */
const DANIEL=resolveProfile({name:{e:'Daniel',r:'DANIERU'},country:{id:'de'},job:{id:'teacher'}});
const PHRASES=weekPhrases(WEEKS[0],DANIEL);
const cases=[
 ['hajimemashite',0],['watashi ha DANIERU desu',1],['watashi wa DANIERU desu',1],['DOITSU jin desu',2],['doitsujin desu',2],['doitsu jin desu',2],
 ['DOITSU kara desu',3],['hai, hajimete desu',4],['watashi ha kyoushi desu',5],['yoroshiku onegaishimasu',6],
 ['nihongo ha sukoshi dake desu',7],['sumimasen',8],['gomennasai',9],['arigatou gozaimasu',10],
 ['日本語は少しだけです',7],['私は教師です',5],['わたしは きょしつです',5],['nihongo ha sugoshiitakedesu',7]];
for(const [inp,i] of cases){const k=convert(inp,true);const r=checkAnswer(PHRASES[i],k);console.log(inp.padEnd(34),k.padEnd(18),r.status,r.note||'',r.marks?r.marks.map(b=>b?1:0).join(''):'');}
/* Speech: bestAlternative picks the first passing candidate, else the top one. */
const speech=[
 [1,['わたしは ダニエルです'],'わたしは ダニエルです','ok'],
 [1,['私はダニエルです。'],'私はダニエルです。','ok'],
 [1,['私は谷エルです','私はダニエルです','わたしはだにえるです'],'私はダニエルです','ok'],
 [7,['日本語は少しだけです','にほんごわすこしだけです'],'日本語は少しだけです','ok'],
 [7,['にほんごわすこしだけです'],'にほんごわすこしだけです','ok'],
 [8,['すみません','済みません'],'すみません','ok'],
 [8,['すいません','すみませ'],'すいません','miss'],
 [3,[],'','empty'],
 [3,['','  '],'','empty']];
let bad=0;
for(const [i,alts,want,status] of speech){const got=bestAlternative(PHRASES[i],alts);const s=checkAnswer(PHRASES[i],got).status;const pass=got===want&&s===status;if(!pass)bad++;console.log((pass?'ok  ':'FAIL')+' speech',JSON.stringify(alts).padEnd(44),'->',JSON.stringify(got),s);}
if(bad){console.log(bad+' speech case(s) failed');process.exitCode=1;}
const errs=[];
const need=(ok,msg)=>{if(!ok)errs.push(msg);};

/* The learner's details: templates, profiles, name-to-kana. */
const eq=(got,want,what)=>need(got===want,what+': got '+JSON.stringify(got)+', want '+JSON.stringify(want));
eq(PHRASES.length,11,'week 1 phrase count for a full profile');
eq(PHRASES[1].k,'わたしは ダニエルです','name card');
eq(PHRASES[1].r,'watashi wa DANIERU desu','name card romaji');
eq(PHRASES[1].s,'私は ダニエルです','name card speech spelling');
eq(PHRASES[1].tip,'Type the particle は as “ha”: watashi ha DANIERU desu.','name card tip');
eq(PHRASES[2].k,'ドイツじんです','nationality card');
eq(PHRASES[2].e,'I’m German','nationality card english');
eq(PHRASES[3].k,'ドイツからです','from card');
eq(PHRASES[3].e,'I’m from Germany','from card english');
eq(PHRASES[5].k,'わたしは きょうしです','job card');
eq(PHRASES[5].s,'私は 教師です','job card speech spelling');
need(/せんせい/.test(PHRASES[5].tip),'teacher keeps its note about せんせい');
need(PHRASES[1].live===true&&!PHRASES[2].live,'only the name card is read live');
need(PHRASES.every(p=>!('slot' in p)),'a filled card keeps no slot');
eq(weekPhrases(WEEKS[0],null).length,7,'week 1 without a profile keeps only the fixed cards');
eq(resolveProfile(null),null,'no profile');
eq(resolveProfile({example:true}),EXAMPLE,'example profile');
eq(resolveProfile({name:{e:'X',r:'A'},country:{id:'zz'},job:{id:'teacher'}}),null,'unknown country id');
eq(resolveProfile({name:{e:'',r:'A'},country:{id:'de'},job:{id:'teacher'}}),null,'empty name');
eq(resolveProfile({name:{e:'X',r:'A'}}),null,'missing country');
const custom=resolveProfile({name:{e:'Ana',r:'Ana'},country:{custom:true,e:'Peru',nat:'Peruvian',r:'PERU-'},job:{custom:true,e:'a vet',r:'juui'}});
eq(custom&&custom.name.k,'アナ','name typed in mixed case');
eq(custom&&custom.country.k,'ペルー','custom country kana comes from the converter');
eq(custom&&custom.job.k,'じゅうい','custom job is hiragana when typed in lower case');
const cc=custom&&fillPhrase(WEEKS[0].phrases[2],{country:custom.country});
need(cc&&cc.live===true&&cc.e==='I’m Peruvian','a typed-in country is read live and uses the nationality');
eq(nameToKana('DANIERU'),'ダニエル','nameToKana');
eq(nameToKana('Anna'),'アンナ','nameToKana mixed case');
eq(nameToKana('jon'),'ジョン','nameToKana lower case still gives katakana');
eq(nameToKana('SA-RA'),'サーラ','nameToKana long vowel');
need(!isKana(nameToKana('Daniel')),'"Daniel" leaves a latin letter, which the form must reject');
need(isKana('ダニエル')&&isKana('ちゅうごく')&&isKana('ミュージ シャン'),'isKana accepts kana');
need(!isKana('')&&!isKana('ダニエl')&&!isKana('日本'),'isKana rejects empty, latin and kanji');
/* Every country and job must be typable: the romaji has to convert to exactly its kana. */
const seen=new Set();
for(const [kind,list] of [['country',COUNTRIES],['job',JOBS]])for(const x of list){
 const key=kind+':'+x.id;
 need(!seen.has(key),'duplicate id '+key);seen.add(key);
 need(x.id&&x.k&&x.r&&x.e,key+' needs id, k, r and e');
 if(kind==='country')need(x.nat,key+' needs a nationality');
 eq(convert(x.r,true),x.k,key+' romaji '+x.r+' does not type its kana');
}

/* Course data: the shape the page relies on, and that every phrase can actually be answered. */
need(WEEKS.length===8,'expected 8 weeks, got '+WEEKS.length);
WEEKS.forEach((w,i)=>{
 const at='week '+(i+1);
 need(w.n===i+1,at+': n is '+w.n);
 need(w.title&&w.summary,at+': title or summary missing');
 need(Array.isArray(w.goals)&&w.goals.length>=3,at+': needs at least 3 goals');
 need(w.scenario&&w.scenario.title&&w.scenario.text,at+': scenario missing');
 need(Array.isArray(w.kanji)&&w.kanji.every(k=>k.k&&k.e),at+': kanji entries need k and e');
 need((w.phrases&&w.phrases.length)||(w.preview&&w.preview.length),at+': needs phrases or a preview');
 (w.preview||[]).forEach(p=>need(p.k&&p.e,at+': preview entry needs k and e'));
});
const kanjiTotal=WEEKS.reduce((n,w)=>n+w.kanji.length,0);
need(kanjiTotal<=40,'signage kanji should stay recognition-sized, got '+kanjiTotal);
const ids=new Map();
for(const p of allPhrases().concat(hearPhrases())){
 need(p.k&&p.r&&p.e,'phrase needs k, r and e: '+JSON.stringify(p));
 need(checkAnswer(p,p.k).status==='ok','model phrase fails its own check: '+p.k);
 need(checkAnswer(p,convert(p.r,true)).status==='ok','typing the romaji does not pass: '+p.k+' <- '+p.r);
 for(const a of (p.alt||[]).concat(p.soft||[]))need(checkAnswer(p,a).status==='ok','alt/soft spelling does not pass: '+a);
 const id=audioId(p);
 need(!ids.has(id)||ids.get(id)===p.k,'two different phrases share the audio id '+id);
 ids.set(id,p.k);
}
/* Numbers: the readings are generated, so the irregular ones are checked by value. */
const reading={100:'ひゃく',300:'さんびゃく',380:'さんびゃく はちじゅう',198:'ひゃく きゅうじゅう はち',600:'ろっぴゃく',800:'はっぴゃく',
 1000:'せん',3000:'さんぜん',8000:'はっせん',8800:'はっせん はっぴゃく',10000:'いちまん',12000:'いちまん にせん',15000:'いちまん ごせん',
 1280:'せん にひゃく はちじゅう',12:'じゅう に',404:'よんひゃく よん'};
for(const n in reading)eq(numberReading(+n).k,reading[n],'reading of '+n);
eq(numberReading(380).r,'sanbyaku hachijuu','romaji of 380');
eq(priceItem(380).k,'さんびゃく はちじゅう えんです','price item');
eq(priceItem(1280).e,'1,280 yen','price item english');
eq(PRICES.length,42,'number of prices');
need(PRICES.every((n,i)=>i===0||n>PRICES[i-1]),'prices are ascending and unique');
for(const irr of ['さんびゃく','ろっぴゃく','はっぴゃく','さんぜん','はっせん','いちまん'])
 need(PRICES.filter(n=>numberReading(n).k.split(' ').includes(irr)).length>=2,'irregular '+irr+' appears in at least two prices');
for(const [s,want] of [['1,280',1280],['¥380',380],['380円',380],['３８０',380],['380 yen',380],[' 100 ',100],['abc',null],['',null],['12.5',null],['1234567',null],['-5',null]])
 eq(parseYen(s),want,'parseYen '+JSON.stringify(s));
need(/hundreds/.test(priceHint(380,480)),'hint points at the hundreds');
need(/irregular/.test(priceHint(300,400)),'hint warns that 300 is irregular');
need(/irregular/.test(priceHint(8000,7000)),'hint warns that 8,000 is irregular');
need(!/irregular/.test(priceHint(500,400)),'no irregular warning for 500');
need(/different size/.test(priceHint(380,38)),'hint notices a different size');
eq(priceHint(380,380),'','no hint for a right answer');
for(const c of PRICES)for(const g of [c+10,c-10,c+100,c*10])
 need(!priceHint(c,g).includes(String(c))&&!priceHint(c,g).includes(c.toLocaleString('en-US')),'a hint contains the answer: '+c+' given '+g);

/* Week 2: review cards, understand-only items, the dialogue, the signs. */
const w2=WEEKS[1];
eq(deckSize(w2),16,'week 2 deck size');
eq(weekPhrases(w2,null).length,16,'week 2 deck without a profile');
eq(deckSize(WEEKS[0]),11,'week 1 deck size');
const rv=reviewCards(w2);
need(rv.length===3&&rv.every(p=>p.review===true),'week 2 opens with 3 review cards');
need(rv.map(p=>p.k).join('|')==='すみません|ありがとうございます|にほんごは すこしだけです','the review cards are the week 1 cards they name');
need(weekPhrases(w2,null).slice(3).every(p=>!p.review),'own cards are not marked as review');
for(const w of WEEKS)for(const [n,i] of w.review||[]){
 need(n<w.n,'week '+w.n+': a review card must come from an earlier week');
 need(WEEKS[n-1].phrases[i]&&!WEEKS[n-1].phrases[i].slot,'week '+w.n+': review '+n+'/'+i+' must exist and not be a template');
}
const hearK=new Set((w2.hear||[]).map(h=>h.k));
for(const h of w2.hear){
 need(h.k&&h.r&&h.e&&h.note,'hear item needs k, r, e and a note: '+h.k);
 need(VOICES.some(v=>v.id===h.v),'hear item has an unknown voice: '+h.k);
 if(h.reply){
  const inRange=i=>Number.isInteger(i)&&i>=0&&i<w2.phrases.length;
  need(h.reply.ok.length>0&&h.reply.ok.every(inRange)&&h.reply.bad.every(inRange),'reply indices out of range: '+h.k);
  need(!h.reply.ok.some(i=>h.reply.bad.includes(i)),'a reply is both good and bad: '+h.k);
 }
}
const deckK=new Set(weekPhrases(w2,null).map(p=>p.k));
w2.scenario.turns.forEach((t,i)=>{
 const at='week 2 scenario turn '+(i+1);
 need(t.who==='clerk'||t.who==='you',at+': who');
 if(t.who==='clerk')need(t.say&&t.say.length&&t.say.every(k=>hearK.has(k)),at+': every clerk line must be a hear item');
 else{
  need(t.options.length>=2&&t.options.some(o=>o.ok),at+': needs at least two options and one good one');
  for(const o of t.options){
   need(typeof o.ok==='boolean'&&o.why&&(o.k||o.label),at+': option needs ok, why and k or label');
   if(o.k&&o.ok&&o.k!=='こんにちは')need(deckK.has(o.k),at+': a good option should be a card the learner has met: '+o.k);
  }
  if(t.price){
   const prev=w2.scenario.turns[i-1];
   need(prev&&prev.say.some(k=>k.includes(numberReading(t.price).k)),at+': the price to type must be the one the clerk says');
  }
 }
});
need(w2.scenario.turns.at(-1).who==='you','the dialogue ends on the learner’s turn');
const allSigns=WEEKS.flatMap(w=>w.kanji.map(k=>k.k));
need(new Set(allSigns).size===allSigns.length,'a sign appears in two weeks: '+allSigns.filter((k,i)=>allSigns.indexOf(k)!==i));
eq(w2.kanji.length,7,'week 2 signs');
need(w2.kanji.every(k=>k.hint&&k.hint.length>10),'every week 2 sign has a memory hook');
need(w2.kanji.every(k=>!/[0-9]{2,}/.test(k.hint)),'a sign hook carries no stray numbers');

console.log((errs.length?'FAIL':'ok  ')+' course:',WEEKS.length+' weeks,',allPhrases().length+' phrases,',hearPhrases().length+' heard items,',kanjiTotal+' signs');
errs.forEach(e=>console.log('  - '+e));
if(errs.length)process.exitCode=1;
console.log(convert('konnichiwa',true),convert('san',false),convert('sann',true),convert('kitte',true),convert('matcha',true),convert('RA-MEN',true));
