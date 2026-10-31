import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import worker from '../src/index.js';
import { HTML, SAMPLE1, SAMPLE2 } from '../src/page.js';
import { staffIdentity } from '../src/auth.js';
import { saveFeedback, loadAll, boardSummary, RETENTION_SECONDS } from '../src/feedback.js';

const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;});
const issuer='https://test-team.cloudflareaccess.com';
const env={ACCESS_TEAM_DOMAIN:issuer,ACCESS_AUD:'test-audience',STAFF_EMAILS:'owner@example.test',NEBIUS_API_KEY:'unit-test-secret',NEBIUS_BASE_URL:'https://inference.invalid/v1',NEBIUS_MODEL:'test-model'};
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'test-signing-key',alg:'RS256',use:'sig'};
const keys=createLocalJWKSet({keys:[jwk]});
const mint=(claims={},options={})=>new SignJWT({email:'owner@example.test',type:'app',...claims}).setProtectedHeader({alg:'RS256',kid:'test-signing-key'}).setSubject('opaque-staff-subject').setIssuer(options.issuer||issuer).setAudience(options.audience||env.ACCESS_AUD).setIssuedAt(options.iat??Math.floor(Date.now()/1000)).setExpirationTime(options.exp??'1h').sign(privateKey);
const req=(path,body,headers={})=>new Request('https://app.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
function memoryKV(){
 const records=new Map(), writes=[],lists=[];
 return {records,writes,lists,async put(key,value,options){writes.push({key,value,...options});records.set(key,{value,metadata:options?.metadata});},async list(options){lists.push(options);return {keys:[...records].filter(([key])=>key.startsWith(options.prefix)).map(([name,r])=>({name,metadata:r.metadata})),list_complete:true};}};
}

test('all ten prepared combinations work without model inference or patient storage',async()=>{
 globalThis.fetch=()=>{throw Error('Unexpected inference');};
 for(const sampleId of ['1','2'])for(const language of ['','es','zh','ar','ru']){
  const response=await worker.fetch(req('/api/explain',{sampleId,language}),{});const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.prepared,true);assert.ok(body.result.medications.length>=4);
  if(language){assert.equal(body.result.translation.language,language);assert.deepEqual(body.result.medications.map(m=>m.dose),body.result.translation.medications.map(m=>m.dose));}
 }
});
test('legacy clients can submit only exact allowlisted sample text',async()=>{
 for(const text of [SAMPLE1,SAMPLE2])assert.equal((await worker.fetch(req('/api/explain',{text}),{})).status,200);
 for(const text of ['SYNTHETIC: Patient Jane Real, ID 12345. Take medicine A.',SAMPLE1.replace('40 mg','20 mg'),'x'.repeat(20000)]){
  globalThis.fetch=()=>{throw Error('Patient data must not leave the Worker');};
  const response=await worker.fetch(req('/api/explain',{text,language:'es'}),{});assert.equal(response.status,400);assert.equal((await response.json()).result,undefined);
 }
});
test('invalid JSON, unsupported fields, cross-site writes and oversized bodies fail before storage',async()=>{
 const kv=memoryKV();
 for(const body of [null,[],{sampleId:'3'},{sampleId:'1',language:'toString'},{sampleId:'1',patientName:'real'},{sampleId:'1',text:'real patient text'}]) assert.equal((await worker.fetch(req('/api/explain',body),{FEEDBACK:kv})).status,400);
 assert.equal((await worker.fetch(req('/api/explain',{sampleId:'1'},{Origin:'https://other.invalid'}),{})).status,403);
 assert.equal((await worker.fetch(new Request('https://app.test/api/explain',{method:'POST',body:'{}'}),{})).status,415);
 assert.equal((await worker.fetch(new Request('https://app.test/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}),{})).status,400);
 assert.equal((await worker.fetch(req('/api/feedback',{rating:4,comment:'x'.repeat(3000)}),{FEEDBACK:kv})).status,413);
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(25000));c.close();}});
 assert.equal((await worker.fetch(new Request('https://app.test/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'}),{})).status,413);
 assert.equal(kv.writes.length,0);
});
test('feedback rejects free text, identifiers, invalid enums, and invalid ratings',async()=>{
 const kv=memoryKV();const base={rating:4,sections:[],sampleId:'1',language:'es'};
 for(const change of [{comment:'Patient details'},{patientId:'123'},{rating:true},{rating:'4 stars'},{rating:6},{sampleId:'patient-123'},{language:'patient-name'},{sections:['patient details']},{sections:'summary'}]){
  assert.equal((await worker.fetch(req('/api/feedback',{...base,...change}),{FEEDBACK:kv})).status,400);
 }
 assert.equal(kv.writes.length,0);
});
test('new feedback stores structured fields only with a 30-day TTL',async()=>{
 const kv=memoryKV();const response=await worker.fetch(req('/api/feedback',{rating:'4',sections:['translation','translation'],sampleId:'2',language:'ar'}),{FEEDBACK:kv});
 assert.equal(response.status,200);assert.equal((await response.json()).retentionDays,30);
 assert.equal(kv.writes.length,1);const w=kv.writes[0];assert.equal(w.expirationTtl,RETENTION_SECONDS);assert.match(w.key,/^feedback:v2:[0-9a-f-]{36}$/);
 assert.deepEqual(Object.keys(w.metadata).sort(),['language','r','s','sample','t','v']);assert.deepEqual(w.metadata.s,['translation']);
});
test('aggregates never read legacy comments and exclude expired metadata',async()=>{
 const kv=memoryKV();kv.records.set('fb:legacy',{metadata:{r:1,s:['medications'],c:'PRIVATE LEGACY PATIENT DATA',t:Date.now()}});
 kv.records.set('feedback:v2:expired',{metadata:{v:2,r:1,s:['medications'],t:Date.now()-(RETENTION_SECONDS+1)*1000}});
 await saveFeedback({FEEDBACK:kv},{rating:4,sections:['translation'],sampleId:'1',language:''});
 const out=await loadAll({FEEDBACK:kv});assert.equal(out.count,7);assert.equal(out.demoCount,6);assert.equal(out.recent,undefined);
 assert.ok(kv.lists.every(x=>x.prefix==='feedback:v2:'));assert.doesNotMatch(JSON.stringify(out),/PRIVATE|LEGACY|comment|patient|expired/);
});
test('private routes fail closed before reading KV or making inference requests',async()=>{
 const kv={list(){throw Error('Must not read private data');}};globalThis.fetch=()=>{throw Error('Must not make inference requests');};
 for(const path of ['/leadership','/api/feedback/summary','/api/leadership/summary']){
  const response=await worker.fetch(path.includes('/api/leadership')?req(path,{}):new Request('https://app.test'+path),{FEEDBACK:kv});
  assert.equal(response.status,403);assert.match(await response.text(),/Staff sign-in/);
 }
});
test('Access authorization verifies signature, issuer, audience, expiry, age and staff email',async()=>{
 const valid=await mint();assert.deepEqual(await staffIdentity(new Request('https://app.test',{headers:{'Cf-Access-Jwt-Assertion':valid}}),env,keys),{subject:'opaque-staff-subject'});
 const invalid=[await mint({email:'outsider@example.test'}),await mint({type:'service'}),await mint({}, {issuer:'https://attacker.invalid'}),await mint({}, {audience:'another-app'}),await mint({}, {exp:1}),await mint({}, {iat:Math.floor(Date.now()/1000)-7200}),valid.slice(0,-12)+'invalidtoken'];
 for(const token of invalid)assert.equal(await staffIdentity(new Request('https://app.test',{headers:{'Cf-Access-Jwt-Assertion':token}}),env,keys),null);
 assert.equal(await staffIdentity(new Request('https://app.test',{headers:{'Cf-Access-Jwt-Assertion':valid}}),{...env,ACCESS_AUD:''},keys),null);
});
test('a signed staff session can read aggregates and generate a counts-only briefing',async()=>{
 const kv=memoryKV();kv.records.set('fb:legacy',{metadata:{r:1,c:'PRIVATE LEGACY PATIENT DATA'}});const sent=[];
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/cdn-cgi/access/certs'))return Response.json({keys:[jwk]});
  sent.push(JSON.parse(options.body));return Response.json({choices:[{finish_reason:'stop',message:{content:'Synthetic aggregate briefing.'}}]});
 };
 const token=await mint();const headers={'Cf-Access-Jwt-Assertion':token};
 const response=await worker.fetch(new Request('https://app.test/api/feedback/summary',{headers}),{...env,FEEDBACK:kv});assert.equal(response.status,200);assert.equal((await response.json()).count,6);
 const brief=await worker.fetch(req('/api/leadership/summary',{},headers),{...env,FEEDBACK:kv});assert.equal(brief.status,200);assert.equal((await brief.json()).summary,'Synthetic aggregate briefing.');
 assert.equal(sent.length,1);assert.doesNotMatch(JSON.stringify(sent),/PRIVATE|LEGACY|Patient Jane/);assert.deepEqual(Object.keys(JSON.parse(sent[0].messages[1].content)).sort(),['average','count','demoCount','retentionDays','topFlags']);
});
test('all response classes prevent caching and HTML has hash-based script CSP',async()=>{
 for(const request of [new Request('https://app.test/'),new Request('https://app.test/api/health'),new Request('https://app.test/leadership'),req('/api/explain',{text:'real input'})]){
  const response=await worker.fetch(request,{});assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  if(request.url==='https://app.test/'){const csp=response.headers.get('Content-Security-Policy');assert.match(csp,/script-src 'self' 'sha256-/);assert.doesNotMatch(csp.split('script-src')[1].split(';')[0],/unsafe-inline/);const html=await response.text();const script=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.ok(csp.includes("'sha256-"+createHash('sha256').update(script).digest('base64')+"'"));new vm.Script(script);assert.match(html,/<textarea[^>]*readonly/);}
 }
 assert.doesNotMatch(HTML,/\sonclick=|\sonchange=|id=fc|name=comment/);
});
test('the browser sends sample IDs rather than text, renders RTL, and clears stale feedback',async()=>{
 const nodes={go:{disabled:false},lang:{value:'ar',disabled:false},fb:{style:{display:'none'}},fbs:{textContent:''},sample1:{},sample2:{},'send-feedback':{}};
 for(const node of Object.values(nodes))node.addEventListener=()=>{};
 const context=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]},t:{value:SAMPLE1},st:{},out:{innerHTML:''},fetch:async(url,options)=>{
  const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['language','sampleId']);assert.equal(body.sampleId,'1');
  const response=await worker.fetch(req('/api/explain',body),{});return {ok:response.ok,json:()=>response.json()};
 }});
 vm.runInContext(HTML.match(/<script>([\s\S]*)<\/script>/)[1],context);await vm.runInContext('explainPapers()',context);
 assert.match(context.out.innerHTML,/<section lang=ar dir=rtl>/);assert.equal(nodes.fb.style.display,'block');
 context.t.value='UNAPPROVED PATIENT CONTENT';await vm.runInContext('explainPapers()',context);assert.equal(nodes.fb.style.display,'none');assert.equal(context.out.innerHTML,'');assert.match(context.st.textContent,/Custom patient text is disabled/);
});
test('temporary storage/model failures return generic errors without content leakage',async()=>{
 const kv={put(){throw Error('PRIVATE CONTENT from upstream');}};
 const response=await worker.fetch(req('/api/feedback',{rating:4,sections:[],sampleId:'1'}),{FEEDBACK:kv});assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/PRIVATE|upstream/);
 globalThis.fetch=()=>{throw Error('PRIVATE CONTENT');};assert.deepEqual(await boardSummary({...env,FEEDBACK:memoryKV()}),{error:'The briefing service is temporarily unavailable.'});
});
test('browser feedback contains only sample context and structured fields',async()=>{
 const nodes={go:{disabled:false},lang:{value:'es'},fb:{style:{}},fbs:{textContent:''},sample1:{},sample2:{},'send-feedback':{disabled:false}};for(const n of Object.values(nodes))n.addEventListener=()=>{};
 const sent=[];const radio={value:'5',checked:true},flag={value:'translation',checked:true};
 const context=vm.createContext({document:{getElementById:id=>nodes[id],querySelector:()=>radio,querySelectorAll:selector=>selector.includes(':checked')?[flag]:[radio,flag]},t:{value:SAMPLE2},out:{innerHTML:''},st:{},fetch:async(url,options)=>{const body=JSON.parse(options.body);sent.push({url,body});if(url==='/api/feedback')return {ok:true,json:async()=>({ok:true})};const r=await worker.fetch(req(url,body),{});return {ok:r.ok,json:()=>r.json()};}});
 vm.runInContext(HTML.match(/<script>([\s\S]*)<\/script>/)[1],context);await vm.runInContext('explainPapers()',context);await vm.runInContext('sendfb()',context);
 assert.deepEqual(sent[1],{url:'/api/feedback',body:{rating:'5',sections:['translation'],sampleId:'2',language:'es'}});assert.match(nodes.fbs.textContent,/30 days/);assert.equal(nodes['send-feedback'].disabled,false);
});
