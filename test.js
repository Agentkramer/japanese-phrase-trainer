const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.split('<script>')[1].split('</script>')[0];
const ctx={};vm.createContext(ctx);
vm.runInContext(code+';this.t={convert,checkAnswer,bestAlternative,WEEKS,allPhrases,audioId,weekPhrases,resolveProfile,fillPhrase,nameToKana,isKana,COUNTRIES,JOBS,EXAMPLE}',ctx);
const {convert,checkAnswer,bestAlternative,WEEKS,allPhrases,audioId,weekPhrases,resolveProfile,fillPhrase,nameToKana,isKana,COUNTRIES,JOBS,EXAMPLE}=ctx.t;
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
for(const p of allPhrases()){
 need(p.k&&p.r&&p.e,'phrase needs k, r and e: '+JSON.stringify(p));
 need(checkAnswer(p,p.k).status==='ok','model phrase fails its own check: '+p.k);
 need(checkAnswer(p,convert(p.r,true)).status==='ok','typing the romaji does not pass: '+p.k+' <- '+p.r);
 for(const a of (p.alt||[]).concat(p.soft||[]))need(checkAnswer(p,a).status==='ok','alt/soft spelling does not pass: '+a);
 const id=audioId(p);
 need(!ids.has(id)||ids.get(id)===p.k,'two different phrases share the audio id '+id);
 ids.set(id,p.k);
}
console.log((errs.length?'FAIL':'ok  ')+' course:',WEEKS.length+' weeks,',allPhrases().length+' phrases,',kanjiTotal+' signs');
errs.forEach(e=>console.log('  - '+e));
if(errs.length)process.exitCode=1;
console.log(convert('konnichiwa',true),convert('san',false),convert('sann',true),convert('kitte',true),convert('matcha',true),convert('RA-MEN',true));
