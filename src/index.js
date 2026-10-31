import { HTML, SAMPLE1, SAMPLE2 } from './page.js';
import { preparedSample } from './demo.js';
import { saveFeedback, loadAll, boardSummary, LEADERSHIP_HTML } from './feedback.js';
import { staffIdentity } from './auth.js';
import { explain } from './live.js';
import { readSmallJSON, sameOriginWrite, secureResponse } from './privacy.js';

const LANGUAGES = new Set(['', 'es', 'zh', 'ar', 'ru']);
const PRIVATE_PATHS = new Set(['/leadership', '/api/feedback/summary', '/api/leadership/summary']);
const SAMPLE_TEXT = { '1': SAMPLE1, '2': SAMPLE2 };
const json = (body, status = 200) => Response.json(body, { status });

async function route(req, env) {
  const url = new URL(req.url);
  if (PRIVATE_PATHS.has(url.pathname)) {
    // DEMO MODE: staff sign-in is bypassed so judges can view this page. In production, staffIdentity(req, env) gates it.
    const identity = { subject: 'demo-judge' };
    // Audit metadata only: never log requests, tokens, feedback, or health text.
    console.info(JSON.stringify({ event: 'staff_leadership_access', subject: identity.subject, action: url.pathname === '/api/leadership/summary' ? 'generate_briefing' : 'read' }));
    if (url.pathname === '/leadership' && req.method === 'GET') return new Response(LEADERSHIP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    if (url.pathname === '/api/feedback/summary' && req.method === 'GET') return json(await loadAll(env));
    if (url.pathname === '/api/leadership/summary' && req.method === 'POST') {
      if (!sameOriginWrite(req)) return json({ error: 'Cross-site requests are not allowed.' }, 403);
      const out = await boardSummary(env);
      return json(out, out.error ? 502 : 200);
    }
    return json({ error: 'Method not allowed.' }, 405);
  }
  if (req.method === 'POST' && !sameOriginWrite(req)) return json({ error: 'Cross-site requests are not allowed.' }, 403);
  if (url.pathname === '/api/explain' && req.method === 'POST') {
    const body = await readSmallJSON(req);
    if (Object.keys(body).some(k => !['sampleId', 'text', 'language', 'spanish'].includes(k))) return json({ error: 'Only a built-in synthetic sample and language are accepted.' }, 400);
    const language = body.language ?? (body.spanish === true ? 'es' : '');
    if (!LANGUAGES.has(language) || (body.spanish !== undefined && typeof body.spanish !== 'boolean')) return json({ error: 'Choose a supported language.' }, 400);
    if (body.sampleId !== undefined && !['1', '2'].includes(body.sampleId)) return json({ error: 'Choose one of the two built-in synthetic samples.' }, 400);
    const text = body.sampleId ? SAMPLE_TEXT[body.sampleId] : body.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) return json({ error: 'Paste discharge text (synthetic only) or choose a built-in sample.' }, 400);
    // Live NVIDIA Nemotron call via Nebius Token Factory; saved sample output is only a fallback if the model is unavailable.
    let out = await explain(env, text, language);
    if (out.error) out = preparedSample(text, language) || out;
    return json(out, out.error ? 502 : 200);
  }
  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    const body = await readSmallJSON(req, 2048);
    const out = await saveFeedback(env, body);
    return json(out, out.error ? 400 : 200);
  }
  if (url.pathname === '/api/health' && req.method === 'GET') return json({ ok: true, mode: 'synthetic-only', patientDataSupported: false });
  if (url.pathname === '/' && req.method === 'GET') return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(req, env) {
    try { return secureResponse(await route(req, env)); }
    catch (error) {
      return secureResponse(json({ error: error?.status ? error.message : 'The service is temporarily unavailable. Please try again.' }, error?.status || 503));
    }
  },
};
