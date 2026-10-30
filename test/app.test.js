import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../src/index.js';
import { HTML, SAMPLE1, SAMPLE2 } from '../src/page.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = { NEBIUS_API_KEY: 'test-only', NEBIUS_MODEL: 'test-model', NEBIUS_BASE_URL: 'https://example.invalid' };
const section = () => ({ summary: 'Take medicine A.', steps: ['Take medicine A.'], medications: [{ name: 'A', dose: '', when: '', purpose: '', notes: 'Ask your care team' }], red_flags: { call_911: ['Emergency symptom'], call_doctor: ['Doctor symptom'] }, questions: ['What is my dose?'] });
const result = (language = '') => ({ ...section(), translation: language ? { ...section(), language } : null });
const request = body => new Request('https://app.test/api/explain', { method: 'POST', body: JSON.stringify(body) });
function mockModel(outputs) {
  const calls = [];
  globalThis.fetch = async (_, init) => {
    calls.push(JSON.parse(init.body));
    const output = outputs.shift();
    if (output instanceof Error) throw output;
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] });
  };
  return calls;
}
test('rejects invalid input before inference, without silently truncating', async () => {
  const calls = mockModel([]);
  for (const body of [null, {}, { text: 123 }, { text: 'short' }, { text: 'x'.repeat(20001) }, { text: 'x'.repeat(30), spanish: 'false' }, { text: 'x'.repeat(30), language: 'unsupported' }, { text: 'x'.repeat(30), language: 'toString' }]) {
    assert.equal((await worker.fetch(request(body), env)).status, 400);
  }
  const malformed = new Request('https://app.test/api/explain', { method: 'POST', body: '{' });
  assert.equal((await worker.fetch(malformed, env)).status, 400);
  assert.equal(calls.length, 0);
});
test('returns structured result only after a separate source check', async () => {
  const expected = result();
  const calls = mockModel([expected, { supported: true }]);
  const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.' }), env);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result, expected);
  assert.equal(calls.length, 2);
  assert.match(calls[0].messages[0].content, /Do not add general medical knowledge/);
  assert.match(calls[1].messages[0].content, /Reject changed or omitted medicines/);
});
test('withholds a rejected explanation instead of showing added advice', async () => {
  const draft = result(); draft.medications[0].notes = 'Invented side effect advice';
  mockModel([draft, { supported: false }]);
  const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.' }), env);
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.result, undefined);
  assert.doesNotMatch(JSON.stringify(body), /Invented/);
});
test('repairs a rejected draft once, then verifies the corrected result', async () => {
  const draft = result(); draft.medications[0].notes = 'Invented side effect advice';
  const corrected = result();
  const calls = mockModel([draft, { supported: false, issues: ['Remove invented side effect advice.'] }, corrected, { supported: true }]);
  const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.' }), env);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result, corrected);
  assert.equal(calls.length, 4);
  assert.match(calls[2].messages[1].content, /Remove invented side effect advice/);
});
test('stops after one unsuccessful repair without returning either draft', async () => {
  const calls = mockModel([result(), { supported: false, issues: ['Unsupported detail'] }, result(), { supported: false, issues: ['Still unsupported'] }]);
  const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.' }), env);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).result, undefined);
  assert.equal(calls.length, 4);
});
test('fails closed on bad schema, incomplete Spanish, malformed verifier, and network failure', async () => {
  const incomplete = result('es'); delete incomplete.translation.medications;
  for (const [draft, check, language] of [[{}, { supported: true }, ''], [incomplete, { supported: true }, 'es'], [result(), { supported: 'true' }, ''], [result(), new Error('secret upstream error'), '']]) {
    mockModel([draft, check]);
    const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.', language }), env);
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.raw, undefined);
    assert.equal(body.result, undefined);
    assert.doesNotMatch(JSON.stringify(body), /secret upstream/);
  }
});
test('Spanish rendering preserves urgency, includes schedule, escapes text, and prevents duplicate submits', async () => {
  const expected = result('es');
  expected.translation.red_flags = { call_911: ['EMERGENCY_ES'], call_doctor: ['DOCTOR_ES'] };
  expected.translation.medications[0].name = '<script>unsafe</script>';
  const button = { disabled: false };
  let calls = 0, resolve;
  const context = vm.createContext({
    document: { getElementById: id => id === 'go' ? button : { value: 'es' } }, t: { value: 'Synthetic discharge instructions' },
    st: { textContent: '' }, out: { innerHTML: '' },
    fetch: async () => { calls++; await new Promise(r => { resolve = r; }); return { ok: true, json: async () => ({ result: expected, model: 'test' }) }; },
  });
  vm.runInContext(HTML.match(/<script>([\s\S]*)<\/script>/)[1], context);
  const pending = vm.runInContext('explainPapers()', context);
  await vm.runInContext('explainPapers()', context);
  assert.equal(calls, 1); assert.equal(button.disabled, true);
  resolve(); await pending;
  const rendered = context.out.innerHTML;
  assert.match(rendered, /Llame al 911 si<\/h3><ul><li>EMERGENCY_ES/);
  assert.match(rendered, /Llame a su médico si<\/h3><ul><li>DOCTOR_ES/);
  assert.match(rendered, /Horario de medicamentos/);
  assert.match(rendered, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.equal(button.disabled, false);
});
test('validates all supported translations and retains the earlier Spanish API', async () => {
  for (const language of ['es', 'zh', 'ar', 'ru']) {
    mockModel([result(language), { supported: true }]);
    const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.', language }), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.translation.language, language);
  }
  mockModel([result('es'), { supported: true }]);
  const response = await worker.fetch(request({ text: 'Synthetic discharge instructions for medicine A.', spanish: true }), env);
  assert.equal((await response.json()).result.spanish.language, 'es');
});
test('Arabic rendering keeps right-to-left layout and separate warnings', async () => {
  const button = { disabled: false };
  const context = vm.createContext({ document: { getElementById: id => id === 'go' ? button : { value: 'ar' } }, t: { value: 'Synthetic discharge instructions' }, st: {}, out: {}, fetch: async () => ({ ok: true, json: async () => ({ result: result('ar') }) }) });
  vm.runInContext(HTML.match(/<script>([\s\S]*)<\/script>/)[1], context);
  await vm.runInContext('explainPapers()', context);
  assert.match(context.out.innerHTML, /<section lang=ar dir=rtl>/);
  assert.match(context.out.innerHTML, /اتصل بـ 911/);
  assert.match(context.out.innerHTML, /اتصل بطبيبك/);
});
test('all ten prepared sample/language pairs return without inference', async () => {
  const calls = mockModel([]);
  for (const text of [SAMPLE1, SAMPLE2]) for (const language of ['', 'es', 'zh', 'ar', 'ru']) {
    const response = await worker.fetch(request({ text, language }), {});
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.prepared, true);
    assert.ok(body.result.medications.length >= 4);
    if (language) {
      assert.equal(body.result.translation.language, language);
      assert.deepEqual(body.result.translation.medications.map(m => m.dose), body.result.medications.map(m => m.dose));
      assert.equal(body.result.translation.red_flags.call_911.length, body.result.red_flags.call_911.length);
      assert.equal(body.result.translation.red_flags.call_doctor.length, body.result.red_flags.call_doctor.length);
    }
  }
  assert.equal(calls.length, 0);
});
test('edited sample text always takes the live generation/checking path', async () => {
  const calls = mockModel([result(), { supported: true }]);
  const response = await worker.fetch(request({ text: SAMPLE1.replace('40 mg', '20 mg') }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).prepared, undefined);
  assert.equal(calls.length, 2);
});
test('feedback rejects invalid ratings and stores valid feedback for the leadership view', async () => {
  const stored = new Map();
  const kv = { get: async k => stored.get(k)?.value, put: async (k,value,options) => stored.set(k,{ value,metadata:options?.metadata }), list: async () => ({ keys:[...stored].filter(([k])=>k.startsWith('fb:')).map(([name,v])=>({ name,metadata:v.metadata })), list_complete:true }) };
  const feedback = body => new Request('https://app.test/api/feedback',{ method:'POST',body:JSON.stringify(body) });
  for (const body of [null, {}, { rating:0 }, { rating:6 }, { rating:'bad' }, { rating:3.5 }]) assert.equal((await worker.fetch(feedback(body),{FEEDBACK:kv})).status,400);
  assert.equal(stored.size,0);
  const response = await worker.fetch(feedback({ rating:'4', sections:['translation','bogus'], comment:'[TEST] Clear language options.' }),{FEEDBACK:kv});
  assert.equal(response.status,200);
  const summary = await worker.fetch(new Request('https://app.test/api/feedback/summary'),{FEEDBACK:kv});
  const body=await summary.json();
  assert.equal(body.count,7); assert.equal(body.demoCount,6);
  assert.ok(body.recent.some(x=>x.comment==='[TEST] Clear language options.'));
  assert.ok(body.topFlags.every(x=>x[0]!=='bogus'));
});
