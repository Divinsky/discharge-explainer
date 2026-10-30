export const SECTIONS = ["summary", "steps", "medications", "warning signs", "questions", "translation"];
const SEED = [
  { rating: 2, sections: ["medications"], comment: "[DEMO DATA] Not sure if 'twice a day' means with meals or 12 hours apart." },
  { rating: 3, sections: ["warning signs"], comment: "[DEMO DATA] Unclear when to call the doctor vs go to the ER for swelling." },
  { rating: 4, sections: ["steps"], comment: "[DEMO DATA] Daily weight step was helpful but what scale time is best?" },
  { rating: 5, sections: [], comment: "[DEMO DATA] Much easier than the hospital printout." },
  { rating: 2, sections: ["medications", "questions"], comment: "[DEMO DATA] Didn't know which old pills to stop taking." },
  { rating: 3, sections: ["translation"], comment: "[DEMO DATA] Spanish version used a word my mom didn't know." },
];
async function put(env, f, demo) {
  const id = `fb:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await env.FEEDBACK.put(id, "1", { metadata: { r: f.rating, s: f.sections, c: f.comment, t: Date.now(), d: demo ? 1 : 0 } });
}
export async function saveFeedback(env, body) {
  if (!body || !body.rating) return { error: "Please choose a rating." };
  const rating = Math.max(1, Math.min(5, parseInt(body.rating, 10) || 1));
  const sections = (Array.isArray(body.sections) ? body.sections : []).filter((s) => SECTIONS.includes(s));
  const comment = String(body.comment || "").replace(/\s+/g, " ").slice(0, 300);
  await put(env, { rating, sections, comment }, false);
  return { ok: true };
}
export async function loadAll(env) {
  if (!(await env.FEEDBACK.get("seeded"))) {
    for (const f of SEED) await put(env, f, true);
    await env.FEEDBACK.put("seeded", "1");
  }
  const items = [];
  let cursor;
  do {
    const l = await env.FEEDBACK.list({ prefix: "fb:", cursor });
    for (const k of l.keys) if (k.metadata) items.push(k.metadata);
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);
  items.sort((a, b) => b.t - a.t);
  const count = items.length;
  const avg = count ? items.reduce((a, b) => a + b.r, 0) / count : 0;
  const flags = {};
  for (const i of items) for (const s of i.s || []) flags[s] = (flags[s] || 0) + 1;
  const topFlags = Object.entries(flags).sort((a, b) => b[1] - a[1]);
  const recent = items.filter((i) => i.c).slice(0, 10).map((i) => ({ rating: i.r, sections: i.s, comment: i.c, demo: !!i.d, at: new Date(i.t).toISOString() }));
  return { count, average: Math.round(avg * 10) / 10, topFlags, recent, demoCount: items.filter((i) => i.d).length };
}
export async function boardSummary(env) {
  const agg = await loadAll(env);
  const res = await fetch(`${env.NEBIUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NEBIUS_API_KEY}` },
    body: JSON.stringify({
      model: env.NEBIUS_MODEL, temperature: 0.3, max_tokens: 1500,
      messages: [
        { role: "system", content: "You write short, plain-language briefings for hospital leaders and board members. No jargon. Under 200 words. Format: a 2-sentence overview, 'What confuses patients' (3 bullets), 'Top 3 recommended fixes' (numbered). Base it only on the data. Note that the data includes synthetic demo entries. Output plain text only." },
        { role: "user", content: "Patient feedback on discharge instruction explanations:\n" + JSON.stringify(agg) },
      ],
    }),
  });
  if (!res.ok) return { error: `Model API error ${res.status}` };
  const d = await res.json();
  const text = (d.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return { model: env.NEBIUS_MODEL, summary: text };
}
export const LEADERSHIP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Leadership summary - Patient feedback</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;line-height:1.5}.demo{background:#eef4ff;border:1px solid #6b8fd6;padding:8px;border-radius:8px}.cards{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #ddd;border-radius:8px;padding:10px 16px;min-width:150px}.big{font-size:2rem;font-weight:700}button{font-size:1rem;padding:8px 14px;background:#76b900;color:#fff;border:none;border-radius:6px;cursor:pointer}#sum{white-space:pre-wrap;border:1px solid #ddd;border-radius:8px;padding:12px;margin-top:10px}td,th{border:1px solid #ccc;padding:5px}table{border-collapse:collapse}</style></head><body>
<p><a href="/">&larr; Back to explainer</a></p><h1>Leadership summary: patient feedback</h1>
<p class="demo"><b>Demo data.</b> Includes synthetic seeded entries marked [DEMO DATA]. No personal or health information is collected.</p>
<div class="cards"><div class="card">Average clarity<div class="big" id="avg">-</div>out of 5</div><div class="card">Responses<div class="big" id="cnt">-</div></div></div>
<h2>Most-flagged sections</h2><table id="flags"></table>
<h2>Recent comments</h2><ul id="recent"></ul>
<h2>Board briefing</h2><button onclick="gen()">Generate board summary</button> <span id="st"></span><div id="sum">Click the button to have NVIDIA Nemotron (via Nebius Token Factory) write a plain-language briefing.</div>
<script>
const e=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
fetch("/api/feedback/summary").then(r=>r.json()).then(d=>{avg.textContent=d.average;cnt.textContent=d.count;
flags.innerHTML="<tr><th>Section</th><th>Times flagged</th></tr>"+d.topFlags.map(f=>"<tr><td>"+e(f[0])+"</td><td>"+f[1]+"</td></tr>").join("");
recent.innerHTML=d.recent.map(r=>"<li>"+"★".repeat(r.rating)+" "+e(r.comment)+(r.sections.length?" <i>("+e(r.sections.join(", "))+")</i>":"")+"</li>").join("")});
async function gen(){st.textContent="Writing briefing...";const r=await fetch("/api/leadership/summary",{method:"POST"});const d=await r.json();st.textContent="";sum.textContent=d.error||d.summary;if(d.model)sum.textContent+="\\n\\n(Generated by "+d.model+" via Nebius Token Factory)"}
</script></body></html>`;
