"""Production HTTP rehearsal. Uses temporary test data and never changes event team codes."""
import concurrent.futures, http.cookiejar, json, os, secrets, subprocess, tempfile, time, urllib.request, urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks=0
def expect(ok,msg):
 global checks
 assert ok,msg
 checks+=1
class Client:
 def __init__(self):
  self.jar=http.cookiejar.CookieJar(); self.o=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
 def call(self,path,data=None):
  req=urllib.request.Request('http://127.0.0.1:3049'+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
  try:
   with self.o.open(req,timeout=30) as r:
    for cookie in self.jar: cookie.secure=False # Local HTTP test transport only; app still emits Secure cookies.
    return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def post(self,path,data):
  status,d=self.call(path,data);expect(status==200,f'{path}: {status} {d}');return d
with tempfile.TemporaryDirectory(prefix='malhotra-rehearsal-') as tmp:
 env={**os.environ,'SESSION_SECRET':secrets.token_hex(32),'ADMIN_PASSWORD':secrets.token_urlsafe(24),'DATA_DIR':tmp,'SUPABASE_URL':'','SUPABASE_SERVICE_ROLE_KEY':''}
 with open(Path(tmp)/'server.log','w') as log:
  server=subprocess.Popen(['npm','run','start','--','-p','3049'],cwd=root,env=env,stdout=log,stderr=log)
  try:
   admin=Client()
   for i in range(100):
    try:admin.call('/api/state');break
    except Exception:time.sleep(.2)
   admin.post('/api/admin/login',{'password':env['ADMIN_PASSWORD']})
   _,codes=admin.call('/api/admin/codes');expect(codes['rooms']==['C4','Lab','B2','B1','B3'],'route')
   c=Client();second=Client();entry=codes['rows'][0]['codes']
   expect(c.call('/api/login',{'code':entry[1]})[0]==403,'future entry gate')
   c.post('/api/login',{'code':entry[0]});second.post('/api/login',{'code':codes['rows'][1]['codes'][0]})
   expect(c.call('/api/round/2')[0]==403,'locked round')
   expect(c.call('/api/submit',{'round':1,'answer':{'file':'5','reason':'index'}})[0]==403,'warmup gate')
   answers=['05 7 int','file 05','False\nTrue\n2','[18,20]',"['F05','F09']\n['F12']",'4 1 3','REVIEW','10','3 4 False',"['F05','F09']"]
   initial=c.call('/api/round/1')[1]['r1']
   expect(all('answer' not in q for q in initial['questions']),'student question payload has no answer keys')
   expect(not c.post('/api/r1',{'action':'answer','q':1,'answer':'wrong'})['correct'],'wrong warmup retry')
   recover=Client();recover.post('/api/login',{'code':entry[0]})
   expect(recover.call('/api/round/1')[1]['r1']['state'][0]['last']=='wrong','wrong submitted answer restores')
   for i,a in enumerate(answers,1):
    expect(c.post('/api/r1',{'action':'answer','q':i,'answer':a})['correct'],'warmup '+str(i))
    if i==7:
     expect(c.call('/api/r1',{'action':'audit','result':'5'})[0]==403,'seven correct audit locked')
     expect(c.call('/api/analysis',{'round':1,'kind':'openfile','file':5})[0]==403,'seven correct file locked')
    if i==8:
     expect(recover.call('/api/round/1')[1]['r1']['unlocked'],'eight correct cross-session unlock')
     expect(c.call('/api/state')[1]['clock']['running'],'warmup does not pause clock')
     expect(c.call('/api/analysis',{'round':1,'kind':'openfile','file':5})[0]==403,'file requires audit result')
   repeated=c.post('/api/r1',{'action':'answer','q':1,'answer':'05 7 int'})
   expect(repeated['view']['correct']==10,'no duplicate points')
   expect(c.post('/api/r1',{'action':'audit','result':'5'})['correct'],'audit')
   expect(c.call('/api/submit',{'round':1,'answer':{'file':'5','reason':'index'}})[0]==403,'file inspection prerequisite')
   c.post('/api/analysis',{'round':1,'kind':'openfile','file':5})
   inspect=recover.call('/api/round/1')[1]['r1']['inspection']
   expect(inspect['lastFile']==5 and inspect['hasRelevant'] and inspect['lastView']['relevant'],'file inspection restores across sessions')
   def finish(n,a,nav):
    r=c.post('/api/submit',{'round':n,'answer':a});expect(r['correct'],'final finding');expect(not r['state']['clock']['running'],'paused clock')
    expect(not c.post('/api/clue',{'round':n,'input':{}})['correct'],'wrong navigation')
    r=c.post('/api/clue',{'round':n,'input':nav});expect(r['correct'],'navigation');expect(not r['state']['clock']['running'],'navigation paused')
    c.post('/api/login',{'code':entry[n]});expect(c.call('/api/state')[1]['clock']['running'],'resumed')
   finish(1,{'file':'5','reason':'index'},{'cup':'right'})
   _,guide=admin.call('/api/admin/guide')
   expect(len(guide['round2'])==8,'eight organizer answers')
   target=['"ACC9001"','"ACC9002"','"ACC9003"','"ACC9004"']
   question_blanks=[['shape'],['"amount"','>','1000000'],['"hour"','>=','20'],['"initiated_by"','==','"TREASURY_BATCH"'],['"receiver_account"','==','"ACC9001"'],['"initiated_by"','==','"TREASURY_BATCH"','"amount"','False'],target+['"sender_account"','==','"ACC0001"','"receiver_account"','targets','"reference"'],target+['"receiver_account"','targets','"amount"','False','"reference"']]
   expect(c.call('/api/r2',{'action':'check','task':'q8','blanks':question_blanks[7],'obs':'wrong'})[0]==403,'question 8 locked')
   for i,blanks in enumerate(question_blanks):
    task='q'+str(i+1)
    expect(not c.post('/api/r2',{'action':'check','task':task,'blanks':blanks,'obs':'wrong'})['ok'],'wrong observation '+task)
    run=c.post('/api/r2',{'action':'run','task':task,'blanks':blanks});expect(run['ok'],'run '+task)
    if i==0:
     expect(run['results'][0]['text']=='(1000, 10)','actual shape')
     hint=c.post('/api/r2',{'action':'hint','task':task});expect(hint['confirm'],'hint cost disclosure')
     paid=c.post('/api/r2',{'action':'hint','task':task,'confirm':True});expect(paid['state']['progress']['hints_used']==1,'hint charged once')
     again=c.post('/api/r2',{'action':'hint','task':task,'confirm':True});expect(again['state']['progress']['hints_used']==1,'hint no double charge')
    out=c.post('/api/r2',{'action':'check','task':task,'blanks':blanks,'obs':guide['round2'][i]['record']});expect(out['ok'],task)
    print(task+': '+guide['round2'][i]['record'])
    expect(bool(out['view']['flow'])==(i==7),'flow only after eight')
   expect(out['view']['flow']['total']==501 and out['view']['flow']['amount']==500000000,'verified financial trail')
   finish(2,{'count':'501','accounts':'ACC9001 ACC9002 ACC9003 ACC9004'},{'op':'flip-h'})
   queries={
    'q1':"SELECT account_id, account_holder, branch FROM account_registry WHERE account_id IN ('ACC9001','ACC9002','ACC9003','ACC9004') ORDER BY account_id ASC",
    'q2':"SELECT company_name, person_name, role FROM company_connections WHERE company_name IN ('RK Holdings Pvt Ltd','Iyer Traders') ORDER BY company_name ASC",
    'q3a':"SELECT SUM(amount) AS total_received FROM transactions WHERE receiver_account IN ('ACC9001','ACC9002')",
    'q3b':"SELECT SUM(amount) AS total_received FROM transactions WHERE receiver_account IN ('ACC9003','ACC9004')"}
   expect(c.call('/api/round/3')[1]['r3']['visuals'] is None,'SQL visuals locked')
   for q,sql in queries.items():expect(c.post('/api/r3',{'action':'check','q':q,'sql':sql})['ok'],q)
   expect(c.call('/api/round/3')[1]['r3']['visuals'] is not None,'SQL visuals unlock before finding')
   expect(c.call('/api/state')[1]['clock']['running'],'review clock runs')
   finish(3,{'ranveer':'450000000','meera':'50000000','conclusion':'BOTH'},{'cell':'B1'})
   expect(c.call('/api/r4',{'q':4,'blanks':['"amount"','2500000']})[0]==403,'r4 sequential gate')
   for n,b in enumerate([['"hour"','20'],['"log_date"','"2026-03-14"'],['"access_point"','"TRSY-T07"'],['"amount"','2500000']],1):
    r=c.post('/api/r4',{'q':n,'blanks':b});expect(r['correct'] and r['result']['total']>0,'r4 query '+str(n))
   finish(4,{'employee':'EMP_002','time':'21:47','amount':'2500000','related':'EMP_001'},{'symbol':'triangle'})
   expect(c.call('/api/finale',{'action':'unlock','input':{'code':'021'}})[0]==403,'finale gate')
   for action,input in [('open',{}),('restore',{'arrangement':{'tl':'F3','tr':'F1','bl':'F4','br':'F2'}}),('inspect',{}),('reference',{'ref':'R-01'}),('comparison',{}),('statement',{}),('verdict',{'murderer':'RANVEER','fraud':'MEERA','ranveer':'450000000','meera':'50000000','total':'500000000','evidence':'comparison','meera_role':'financial'})]:
    expect(c.post('/api/finale',{'action':action,'input':input})['ok'],'finale '+action)
   expect(c.call('/api/state')[1]['clock']['running'],'verdict does not stop timer')
   expect(not c.post('/api/finale',{'action':'unlock','input':{'code':'21'}})['ok'],'leading zero required')
   # Parallel draft writes must preserve both keys and must not alter earned activity state.
   with concurrent.futures.ThreadPoolExecutor() as pool:
    list(pool.map(lambda k:c.post('/api/draft',{'round':5,'key':k,'value':{'saved':k}}),['finding','arrangement']))
   fresh=Client();fresh.post('/api/login',{'code':entry[4]});draft=fresh.call('/api/round/5')[1]['drafts'];expect('finding' in draft and 'arrangement' in draft,'cross-session drafts')
   expect(second.call('/api/state')[1]['progress']['current_round']==1,'team isolation')
   c.post('/api/finale',{'action':'unlock','input':{'code':'021'}})
   before=c.call('/api/state')[1];expect(before['progress']['final_complete'] and not before['clock']['running'],'case completed')
   time.sleep(.2);after=c.call('/api/state')[1];expect(before['clock']['elapsed_ms']==after['clock']['elapsed_ms'],'timer frozen')
   expect(c.call('/api/round/5')[1]['finale']['final']['room']=='B3','same-room finish')
   _,again=admin.call('/api/admin/codes');expect(again==codes,'codes unchanged')
   print(f'PASS: {checks} checks; all five rounds, navigation, gates, SQL outputs, cross-session drafts, team isolation, frozen clock and stable codes.')
  finally:
   server.terminate();server.wait(timeout=15)
