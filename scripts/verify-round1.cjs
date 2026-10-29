// Safe module-loading test harness for the project's pure validators. No student code is executed.
const ts=require('typescript'),fs=require('fs'),path=require('path');const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const req=id=>id==='server-only'?{}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id);new Function('require','module','exports',source)(req,m,m.exports);return m.exports;}
const r=load(path.join(__dirname,'../lib/server/round1.ts'));let checks=0;function ok(v,msg){if(!v)throw Error(msg);checks++;}
const answers=['05 7 int','file 05','False\nTrue\n2','[18, 20]',"['F05', 'F09']\n['F12']",'4 1 3','REVIEW','10','3 4 False',"['F05', 'F09']"];
answers.forEach((a,i)=>{ok(r.matches(i+1,a),'correct '+(i+1));ok(r.matches(i+1,'  '+a.replace(/\n/g,'\r\n')+'  '),'whitespace '+(i+1));ok(!r.matches(i+1,'not an answer'),'wrong '+(i+1));});
ok(r.matches(1,'"05 7 int"'),'quoted plain output');ok(r.matches(7,"'REVIEW'"),'quoted status');ok(r.matches(5,'["F05","F09"]\n["F12"]'),'list quote normalization');ok(!r.matches(3,'0\n1\n2'),'booleans differ from numbers');ok(!r.matches(3,'True\nFalse\n2'),'line order matters');ok(!r.matches(10,"['F09','F05']"),'list order matters');ok(!r.matches(1,'5 7 int'),'leading zero matters');
ok(r.round1View(undefined,true).unlocked,'legacy completed team bypass');ok(!r.round1View(undefined,false).unlocked,'new team locked');
ok((144/(9-3)+5*(8-2)-4**2)/2-14===5,'hard audit arithmetic');ok(r.AUDIT_EXPRESSION.includes('4²'),'new audit expression');
console.log('PASS: '+checks+' Round 1 validator/legacy checks.');
