const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.split('<script>')[1].split('</script>')[0];
const ctx={};vm.createContext(ctx);
vm.runInContext(code+';this.t={convert,checkAnswer,PHRASES}',ctx);
const {convert,checkAnswer,PHRASES}=ctx.t;
const cases=[
 ['hajimemashite',0],['watashi ha DANIERU desu',1],['watashi wa DANIERU desu',1],['DOITSU jin desu',2],['doitsujin desu',2],['doitsu jin desu',2],
 ['DOITSU kara desu',3],['hai, hajimete desu',4],['watashi ha kyoushi desu',5],['yoroshiku onegaishimasu',6],
 ['nihongo ha sukoshi dake desu',7],['sumimasen',8],['gomennasai',9],['arigatou gozaimasu',10],
 ['日本語は少しだけです',7],['私は教師です',5],['わたしは きょしつです',5],['nihongo ha sugoshiitakedesu',7]];
for(const [inp,i] of cases){const k=convert(inp,true);const r=checkAnswer(PHRASES[i],k);console.log(inp.padEnd(34),k.padEnd(18),r.status,r.note||'',r.marks?r.marks.map(b=>b?1:0).join(''):'');}
console.log(convert('konnichiwa',true),convert('san',false),convert('sann',true),convert('kitte',true),convert('matcha',true),convert('RA-MEN',true));
