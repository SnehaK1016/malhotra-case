import "server-only";
import { tables, inr } from "./datasets";
import type { Result, Row } from "./engine";
import type { R2 } from "./store";
const targets = ['ACC9001','ACC9002','ACC9003','ACC9004'];
const all = () => tables().transactions.rows;
const quoted = (x: string) => `"${x}"`;
const accountBlanks = targets.map(quoted);
export const TASKS = [
 {id:'q1',title:'Inspect the evidence',question:'The transaction file has just arrived. Inspect the dataframe dimensions, then record the number of rows and columns as two numbers, for example 100, 5.',template:'df.____',answer:['shape'],observe:{label:'Rows, columns',kind:'shape'},hint:'The dataframe attribute that describes its dimensions returns a pair: rows first, columns second.'},
 {id:'q2',title:'Find the large payments',question:'Filter payments strictly greater than ₹10,00,000. Count the matching transactions. A payment equal to the threshold does not qualify.',template:'df[df[____] ____ ____]',answer:['"amount"','>','1000000'],observe:{label:'Number of payments greater than ₹10,00,000',kind:'count'},hint:'Use the payment-value column, a strict greater-than operator and a numeric rupee threshold without quotes.'},
 {id:'q3',title:'Investigate late-night payments',question:'Filter transactions at or after 20:00 (8 PM). Record the number of matching payments, including any separate evening release.',template:'df[df[____] ____ ____]',answer:['"hour"','>=','20'],observe:{label:'Number of transactions at or after 20:00',kind:'count'},hint:'The hour column contains whole hours. “At or after” includes the boundary.'},
 {id:'q4',title:'Trace the treasury payments',question:'Select only transactions whose initiated_by value equals TREASURY_BATCH. Count the records in this batch.',template:'df[df[____] ____ ____]',answer:['"initiated_by"','==','"TREASURY_BATCH"'],observe:{label:'Number of treasury-batch transactions',kind:'count'},hint:'Compare the initiating-label column with the quoted text TREASURY_BATCH using equality.'},
 {id:'q5',title:'Find the destination account',question:'Select payments whose receiver_account equals ACC9001. Count all payments to this account.',template:'df[df[____] ____ ____]',answer:['"receiver_account"','==','"ACC9001"'],observe:{label:'Number of payments to ACC9001',kind:'count'},hint:'Use the destination-account column. Account IDs are text and need quotes.'},
 {id:'q6',title:'Find the largest treasury payment',question:'Select TREASURY_BATCH records and sort by amount from highest to lowest. Record the first row’s amount and receiving account. If amounts tie, preserve the original ledger order; the first tied record is used.',template:'batch = df[df[____] ____ ____]\nresult = batch.sort_values(by=____, ascending=____)\nprint(result.head(1))',answer:['"initiated_by"','==','"TREASURY_BATCH"','"amount"','False'],observe:{label:'Largest amount and first receiving account (for example 100000 ACC1234)',kind:'largest'},hint:'Sort the filtered batch, not the whole ledger. Descending order uses the Boolean False, without quotes.'},
 {id:'q7',title:'Trace the four-account money trail',question:'Filter payments sent by ACC0001 to ACC9001, ACC9002, ACC9003 and ACC9004. Display reference. Record every distinct reference shown, separated by semicolons.',template:'targets = [____, ____, ____, ____]\nresult = df[\n    (df[____] ____ ____) &\n    (df[____].isin(____))\n]\nprint(result[____])',answer:[...accountBlanks,'"sender_account"','==','"ACC0001"','"receiver_account"','targets','"reference"'],observe:{label:'Distinct reference texts, separated by semicolons',kind:'references'},hint:'Combine sender equality with receiver membership. isin() takes the list variable; the print selection takes the quoted reference column.'},
 {id:'q8',title:'Identify the largest target-account payment',question:'Filter payments received by the four target accounts. Sort by amount descending, then display the reference of the first row. Preserve original ledger order when amounts tie. Record that first reference exactly.',template:'targets = [____, ____, ____, ____]\nresult = df[df[____].isin(____)]\nresult = result.sort_values(by=____, ascending=____)\nprint(result.head(1)[____])',answer:[...accountBlanks,'"receiver_account"','targets','"amount"','False','"reference"'],observe:{label:'Reference of the first largest matching payment',kind:'reference'},hint:'Filter the recipients first. Then sort descending, take head(1) and select reference. The separate payment to another recipient does not belong in this result.'}
];
const text = (x: unknown) => String(x ?? '').trim();
const normalize = (x: unknown) => {const t=text(x);if(/^(['"]).*\1$/.test(t))return 'str:'+t.slice(1,-1);if(/^\d[\d_]*$/.test(t))return 'num:'+Number(t.replace(/_/g,''));return t;};
export function build(id: string, blanks: unknown[]): {code:string}|{error:string} {
 const t=TASKS.find(t=>t.id===id);if(!t)return {error:'Unknown question'};
 if(blanks.length!==t.answer.length)return {error:'Complete every blank.'};
 const v=blanks.map(text);if(v.some(v=>!v))return {error:'Complete every blank.'};
 // Compare parsed literals and operators, never execute submitted Python.
 const valuesOK=t.answer.every((a,i)=>normalize(a)===normalize(v[i]));
 // The four target account literals may appear in any order.
 const targetOK=!['q7','q8'].includes(id)||JSON.stringify(v.slice(0,4).map(normalize).sort())===JSON.stringify(accountBlanks.map(normalize).sort());
 const restOK=['q7','q8'].includes(id)?t.answer.slice(4).every((a,i)=>normalize(a)===normalize(v[i+4])):valuesOK;
 if(!targetOK||!restOK)return {error:'Check the column names, quotes, operator and values. Text needs quotes; variables and Booleans do not.'};
 let k=0;return {code:t.template.replace(/____/g,()=>v[k++])};
}
function subset(id:string):Row[]{const r=all();switch(id){case'q2':return r.filter(r=>Number(r.amount)>1000000);case'q3':return r.filter(r=>Number(r.hour)>=20);case'q4':case'q6':return r.filter(r=>r.initiated_by==='TREASURY_BATCH');case'q5':return r.filter(r=>r.receiver_account==='ACC9001');case'q7':return r.filter(r=>r.sender_account==='ACC0001'&&targets.includes(String(r.receiver_account)));case'q8':return r.filter(r=>targets.includes(String(r.receiver_account)));default:return r;}}
// ES stable sort preserves the original ledger order for equal payment amounts.
const sorted = (rows:Row[]) => [...rows].sort((a,b)=>Number(b.amount)-Number(a.amount));
export function analysis(id:string){
 const rows=subset(id);const first=sorted(rows)[0];
 const columns=tables().transactions.columns;
 const displayed=id==='q6'?[first]:id==='q8'?[first]:rows;
 const cols=id==='q7'?['transaction_id','reference']:id==='q8'?['transaction_id','amount','receiver_account','reference']:columns;
 const results:Result[]=id==='q1'?[{kind:'text',text:`(${all().length}, ${columns.length})`}]:[{kind:'table',columns:cols,rows:displayed.slice(0,60).map(r=>cols.map(c=>r[c])),total:displayed.length}];
 const refs=[...new Set(rows.map(r=>String(r.reference)))].sort();
 const record=id==='q1'?`${all().length}, ${columns.length}`:id==='q6'?`${first.amount} ${first.receiver_account}`:id==='q7'?refs.join('; '):id==='q8'?String(first.reference):String(rows.length);
 const notes:Record<string,string>={q1:`Evidence loaded: ${all().length} rows and ${columns.length} columns.`,q2:`Strict threshold > ₹10,00,000 isolates ${rows.length} payments.`,q3:`${rows.length} payments occurred at or after 20:00.`,q4:`${rows.length} records belong to TREASURY_BATCH.`,q5:`ACC9001 received ${rows.length} payments.`,q6:`Largest batch payment: ${inr(Number(first.amount))}, ${first.transaction_id} → ${first.receiver_account}. Equal amounts retain ledger order.`,q7:`ACC0001 funded ${rows.length} matching transfers to the four targets. Recovered references: ${refs.join('; ')}.`,q8:`First largest target payment: ${first.transaction_id}, ${inr(Number(first.amount))} → ${first.receiver_account}; reference: ${first.reference}.`};
 return {results,record,note:notes[id],count:rows.length,rows:displayed.slice(0,12),columns:cols, flowPreview:id==="q7"?flowData():null, sortPreview:["q6","q8"].includes(id)?rows.filter(r=>sorted(rows).slice(0,5).includes(r)):null, filterPreview:["q2","q3","q4"].includes(id)?[...rows.slice(0,4).map(r=>({...r,matched:true})),...all().filter(r=>!rows.includes(r)).slice(0,3).map(r=>({...r,matched:false}))]:null};
}
export function run(id:string,blanks:unknown[]): {code:string;results:Result[]}|{error:string}{const b=build(id,blanks);return 'error'in b?b:{code:b.code,results:analysis(id).results};}
export function check(id:string,blanks:unknown[],obs:unknown){const b=build(id,blanks);if('error'in b)return {ok:false,message:b.error};const a=analysis(id),v=text(obs);let ok=false;
 if(id==='q1')ok=JSON.stringify(v.match(/\d+/g)?.map(Number))===JSON.stringify([all().length,tables().transactions.columns.length]);
 else if(id==='q6')ok=v.replace(/[₹,]/g,'').toUpperCase().replace(/\s+/g,' ').trim()===a.record.toUpperCase();
 else if(id==='q7')ok=JSON.stringify([...new Set(v.split(';').map(x=>x.trim().toLowerCase()).filter(Boolean))].sort())===JSON.stringify(a.record.toLowerCase().split('; ').sort());
 else if(id==='q8')ok=v.toLowerCase()===a.record.toLowerCase();
 else ok=/^\d+$/.test(v)&&Number(v)===a.count;
 return {ok,message:ok?'Evidence verified. Review the result, then continue to the next clue.':'The code is complete. Read its output and check your observation.'};
}
export const tasksDone=(r:R2|undefined)=>TASKS.every(t=>r?.tasks?.[t.id]?.done);
export function flowData(){const rows=subset('q7');return {source:'ACC0001',accounts:targets,counts:Object.fromEntries(targets.map(id=>[id,rows.filter(r=>r.receiver_account===id).length])),links:targets.map(id=>{const rr=rows.filter(r=>r.receiver_account===id);return {id,count:rr.length,total:rr.reduce((s,r)=>s+Number(r.amount),0),reference:[...new Set(rr.map(r=>String(r.reference)))].join('; ')};}),total:rows.length,amount:rows.reduce((s,r)=>s+Number(r.amount),0)};}
export function round2View(r:R2|undefined,complete:boolean){const st=r?.tasks??{};return {tasks:TASKS.map((t,i)=>({id:t.id,title:t.title,question:t.question,template:t.template,blanks:t.answer.length,observe:t.observe,hint:st[t.id]?.hinted?t.hint:null,draft:st[t.id]?.blanks??[],obs:st[t.id]?.obs??'',done:complete||!!st[t.id]?.done,open:complete||i===0||!!st[TASKS[i-1].id]?.done,output:st[t.id]?.output??null,analysis:complete||st[t.id]?.done?analysis(t.id):null})),notes:TASKS.filter(t=>complete||st[t.id]?.done).map(t=>analysis(t.id).note),complete:complete||tasksDone(r),flow:complete||tasksDone(r)?flowData():null};}
export const round2Guide=()=>TASKS.map(t=>{let i=0;return {task:t.title,code:t.template.replace(/____/g,()=>t.answer[i++]),record:analysis(t.id).record};});
