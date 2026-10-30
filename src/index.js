import { HTML } from "./page.js";

const SYSTEM = `You help patients and families understand hospital discharge instructions.
Rewrite at about a 6th-grade reading level. Do not add new medical advice, do not change doses, and do not invent facts not in the text. If something is unclear, say "Ask your care team".
Return ONLY valid JSON with this shape:
{"summary":"2-3 sentence plain summary",
 "steps":["short plain-language step", ...],
 "medications":[{"name":"","dose":"","when":"","purpose":"","notes":""}],
 "red_flags":{"call_911":["..."],"call_doctor":["..."]},
 "questions":["question to ask at follow-up", ...],
 "spanish":null or {"summary":"","steps":[],"red_flags":[],"questions":[]}}`;

async function explain(env, text, spanish) {
  if (!env.NEBIUS_API_KEY) return { error: "Server is missing NEBIUS_API_KEY. Set it with: wrangler secret put NEBIUS_API_KEY" };
  const res = await fetch(`${env.NEBIUS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NEBIUS_API_KEY}` },
    body: JSON.stringify({
      model: env.NEBIUS_MODEL,
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Include Spanish translation: ${spanish ? "yes" : "no (set spanish to null)"}.\n\nDISCHARGE PAPERS:\n${text}` },
      ],
    }),
  });
  if (!res.ok) return { error: `Model API error ${res.status}` };
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || "";
  content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const m = content.match(/\{[\s\S]*\}/);
  try { return { model: env.NEBIUS_MODEL, result: JSON.parse(m ? m[0] : content) }; }
  catch { return { model: env.NEBIUS_MODEL, raw: content }; }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/explain" && req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
      const text = String(body.text || "").slice(0, 20000);
      if (text.trim().length < 20) return Response.json({ error: "Please paste discharge text." }, { status: 400 });
      const out = await explain(env, text, !!body.spanish);
      return Response.json(out, { status: out.error ? 502 : 200 });
    }
    if (url.pathname === "/api/health") return Response.json({ ok: true, model: env.NEBIUS_MODEL, keyConfigured: !!env.NEBIUS_API_KEY });
    return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};
