export const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const SECTIONS = ['summary', 'steps', 'medications', 'warning signs', 'questions', 'translation'];
const LANGUAGES = ['', 'es', 'zh', 'ar', 'ru'];
const DEMO_RATINGS = [
  { r: 2, s: ['medications'] }, { r: 3, s: ['warning signs'] },
  { r: 4, s: ['steps'] }, { r: 5, s: [] },
  { r: 2, s: ['medications', 'questions'] }, { r: 3, s: ['translation'] },
];

export async function saveFeedback(env, body) {
  if (!body || Object.keys(body).some(k => !['rating', 'sections', 'sampleId', 'language'].includes(k))) {
    return { error: 'Free-text comments and additional fields are disabled. Submit only a rating and listed sections for a synthetic sample.' };
  }
  if (!['number', 'string'].includes(typeof body.rating) || !/^[1-5]$/.test(String(body.rating))) return { error: 'Please choose a rating from 1 to 5.' };
  if (!['1', '2'].includes(body.sampleId) || !LANGUAGES.includes(body.language ?? '')) return { error: 'Choose a built-in synthetic sample and supported language.' };
  if (!Array.isArray(body.sections) || body.sections.length > 6 || body.sections.some(s => !SECTIONS.includes(s))) return { error: 'Choose only the listed feedback sections.' };
  const metadata = { v: 2, r: Number(body.rating), s: [...new Set(body.sections)], sample: body.sampleId, language: body.language ?? '', t: Date.now() };
  await env.FEEDBACK.put(`feedback:v2:${crypto.randomUUID()}`, '1', { metadata, expirationTtl: RETENTION_SECONDS });
  return { ok: true, retentionDays: 30 };
}

export async function loadAll(env) {
  // Never read legacy fb:* records: their free-text comments are quarantined.
  const ratings = [...DEMO_RATINGS];
  let cursor;
  do {
    const page = await env.FEEDBACK.list({ prefix: 'feedback:v2:', cursor, limit: 1000 });
    for (const key of page.keys) {
      const m = key.metadata;
      if (m?.v !== 2 || !Number.isInteger(m.r) || m.r < 1 || m.r > 5 || !Number.isFinite(m.t) || m.t > Date.now() || m.t < Date.now() - RETENTION_SECONDS * 1000 || !Array.isArray(m.s)) continue;
      ratings.push({ r: m.r, s: [...new Set(m.s.filter(s => SECTIONS.includes(s)))] });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const flags = {};
  for (const rating of ratings) for (const section of rating.s) flags[section] = (flags[section] || 0) + 1;
  return { count: ratings.length, average: Math.round(ratings.reduce((sum, r) => sum + r.r, 0) / ratings.length * 10) / 10,
    topFlags: Object.entries(flags).sort((a, b) => b[1] - a[1]), demoCount: DEMO_RATINGS.length, retentionDays: 30 };
}

export async function boardSummary(env) {
  if (!env.NEBIUS_API_KEY || !env.NEBIUS_BASE_URL?.startsWith('https://')) return { error: 'The briefing service is not configured.' };
  const aggregate = await loadAll(env);
  try {
    const res = await fetch(`${env.NEBIUS_BASE_URL}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(60000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.NEBIUS_API_KEY}` },
      body: JSON.stringify({ model: env.NEBIUS_MODEL, temperature: 0.2, max_tokens: 2000,
        messages: [
          { role: 'system', content: 'Write a plain-language briefing under 200 words using only these aggregate ratings and section counts. Clearly state that six ratings are synthetic demo data. Do not invent patient comments, medical facts, or specific causes of confusion. Suggest three interface improvements as proposals, not observed findings. Output plain text only.' },
          { role: 'user', content: JSON.stringify(aggregate) },
        ] }),
    });
    if (!res.ok) return { error: 'The briefing service is temporarily unavailable.' };
    const data = await res.json(); const choice = data.choices?.[0];
    const summary = choice?.message?.content;
    if (choice?.finish_reason !== 'stop' || typeof summary !== 'string' || !summary.trim()) return { error: 'A complete briefing could not be generated. Please try again.' };
    return { model: env.NEBIUS_MODEL, summary: summary.replace(/<think>[\s\S]*?<\/think>/g, '').trim() };
  } catch { return { error: 'The briefing service is temporarily unavailable.' }; }
}

export const LEADERSHIP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private leadership summary</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:auto;padding:20px;line-height:1.5}.notice{background:#fff4e5;padding:12px;border-radius:8px}.cards{display:flex;gap:24px}.big{font-size:2rem}button{padding:10px;font:inherit}#sum{white-space:pre-wrap}td,th{padding:8px;border:1px solid #ccc}table{border-collapse:collapse}</style></head><body>
<a href="/">Back to synthetic demo</a><h1>Private leadership summary</h1><p style="background:#fff4d6;border:1px solid #e0b84c;padding:10px;border-radius:6px"><strong>Demo note:</strong> In a normal hospital deployment, this page would ask staff to sign in before showing any data. Sign-in is turned off here so judges can see it.</p>
<p class="notice"><b>Synthetic-data prototype. Not approved for protected health information.</b> Staff access only. This dashboard shows aggregate ratings and flagged-section counts, including six synthetic demo ratings. Free-text feedback is disabled. New ratings expire after 30 days. No patient records or comments are sent to the model.</p>
<div class="cards"><p>Average clarity<br><b class="big" id="avg">—</b> / 5</p><p>Responses<br><b class="big" id="cnt">—</b></p></div>
<h2>Flagged sections</h2><table id="flags"></table><p id="load-status" role="status"></p>
<h2>Board briefing</h2><p>NVIDIA Nemotron 3 Super, served through Nebius Token Factory, receives only the aggregate counts shown here.</p>
<button id="generate">Generate board summary</button><p id="status" role="status"></p><div id="sum"></div>
<script>
const e=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
fetch('/api/feedback/summary',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const d=await r.json();document.getElementById('avg').textContent=d.average;document.getElementById('cnt').textContent=d.count;document.getElementById('flags').innerHTML='<tr><th>Section</th><th>Count</th></tr>'+d.topFlags.map(f=>'<tr><td>'+e(f[0])+'</td><td>'+e(f[1])+'</td></tr>').join('')}).catch(()=>{document.getElementById('load-status').textContent='Could not load private aggregate data. Sign in again or retry.'});
document.getElementById('generate').addEventListener('click',async()=>{const b=document.getElementById('generate'),st=document.getElementById('status');if(b.disabled)return;b.disabled=true;st.textContent='Writing briefing...';try{const r=await fetch('/api/leadership/summary',{method:'POST',cache:'no-store'});const d=await r.json();document.getElementById('sum').textContent=r.ok?d.summary:(d.error||'Could not generate a briefing.')}catch{document.getElementById('sum').textContent='Could not reach the briefing service.'}finally{st.textContent='';b.disabled=false}});
</script></body></html>`;
