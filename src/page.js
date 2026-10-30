const SAMPLE1 = `DISCHARGE SUMMARY (SYNTHETIC SAMPLE - NOT A REAL PATIENT)
Patient: Jane Example, 67F. Admitted 10/20 for acute decompensated heart failure (HFrEF, EF 30%). Diuresed with IV furosemide, net -4.2L. Discharge weight 172 lb.
Discharge medications: Furosemide 40 mg PO BID. Metoprolol succinate 25 mg PO daily. Lisinopril 5 mg PO daily. Spironolactone 12.5 mg PO daily. Potassium chloride 20 mEq PO daily. Aspirin 81 mg PO daily. HOLD ibuprofen/NSAIDs.
Instructions: 2 g sodium diet, fluid restriction 1.5 L/day. Daily weights each AM; call if gain >2 lb in 1 day or >5 lb in 1 week. BMP in 1 week. Follow up with cardiology (Dr. Sample) in 7 days. Return to ED for chest pain, SOB at rest, syncope.`;
const SAMPLE2 = `DISCHARGE INSTRUCTIONS (SYNTHETIC SAMPLE - NOT A REAL PATIENT)
Patient: Luis Demo, 54M. s/p laparoscopic cholecystectomy 10/27, uncomplicated.
Meds: Oxycodone 5 mg PO q6h PRN severe pain (max 4/day), acetaminophen 650 mg PO q6h scheduled x5 days (max 3 g/day), docusate 100 mg PO BID while on opioids. Resume home metformin 500 mg BID with meals.
Wound care: may shower in 48h, no tub/swimming x2 wks, steri-strips fall off on own. No lifting >10 lb x 2 wks. No driving while taking oxycodone.
F/u general surgery clinic in 2 wks. Call for T>101.5F, wound redness/drainage, jaundice, persistent N/V, inability to tolerate PO.`;

export const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Discharge Instructions Explainer</title>
<style>
body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;line-height:1.5;color:#1b1b1b}
h1{margin-bottom:0}.tag{color:#555;margin-top:4px}
.disc{background:#fff4e5;border:1px solid #f0a020;padding:10px;border-radius:8px}
textarea{width:100%;min-height:200px;font:inherit;padding:8px;box-sizing:border-box}
button{font-size:1rem;padding:8px 14px;margin:6px 6px 6px 0;cursor:pointer;border-radius:6px;border:1px solid #888}
#go{background:#76b900;color:#fff;border:none}
section{border:1px solid #ddd;border-radius:8px;padding:10px 14px;margin:12px 0}
.red{border-color:#c00;background:#fff0f0}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}
footer{color:#666;font-size:.85rem;margin-top:24px}
</style></head><body>
<h1>Discharge Instructions Explainer</h1>
<p class="tag">Paste hospital discharge papers. Get plain-language steps, a medicine schedule, warning signs, and questions for your follow-up visit. Powered by NVIDIA Nemotron on Nebius Token Factory.</p>
<p class="disc"><b>Not medical advice.</b> This tool only rewrites your papers in simpler words and can make mistakes. Always follow your doctor's and pharmacist's instructions. <b>In an emergency, call 911.</b> Do not paste real names or ID numbers.</p>
<button onclick="s(1)">Load sample: heart failure</button><button onclick="s(2)">Load sample: gallbladder surgery</button>
<textarea id="t" placeholder="Paste discharge instructions here..."></textarea>
<label><input type="checkbox" id="es"> Also give me Spanish (Español)</label><br>
<button id="go" onclick="go()">Explain my discharge papers</button> <span id="st"></span>
<div id="out"></div>
<footer>Uses synthetic sample data only. Open source (MIT).</footer>
<script>
const S={1:${JSON.stringify(SAMPLE1)},2:${JSON.stringify(SAMPLE2)}};
function s(n){t.value=S[n]}
const e=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const li=a=>"<ul>"+(a||[]).map(x=>"<li>"+e(x)+"</li>").join("")+"</ul>";
async function go(){st.textContent="Reading your papers... (can take ~20-60s)";out.innerHTML="";
try{const r=await fetch("/api/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t.value,spanish:es.checked})});
const d=await r.json();st.textContent="";if(d.error){out.innerHTML="<p class=red>"+e(d.error)+"</p>";return}
if(!d.result){out.innerHTML="<pre>"+e(d.raw)+"</pre>";return}const x=d.result;
let h="<section><h2>In short</h2><p>"+e(x.summary)+"</p></section><section><h2>What to do at home</h2><ol>"+(x.steps||[]).map(v=>"<li>"+e(v)+"</li>").join("")+"</ol></section>";
h+="<section><h2>Medicine schedule</h2><table><tr><th>Medicine</th><th>Dose</th><th>When</th><th>What it's for</th><th>Notes</th></tr>"+(x.medications||[]).map(m=>"<tr><td>"+e(m.name)+"</td><td>"+e(m.dose)+"</td><td>"+e(m.when)+"</td><td>"+e(m.purpose)+"</td><td>"+e(m.notes)+"</td></tr>").join("")+"</table></section>";
const rf=x.red_flags||{};h+="<section class=red><h2>Call 911 if</h2>"+li(rf.call_911)+"<h2>Call your doctor if</h2>"+li(rf.call_doctor)+"</section>";
h+="<section><h2>Questions to ask at your follow-up</h2>"+li(x.questions)+"</section>";
if(x.spanish){const p=x.spanish;h+="<section lang=es><h2>En español</h2><p>"+e(p.summary)+"</p><h3>Qué hacer</h3>"+li(p.steps)+"<h3>Señales de alarma</h3>"+li(p.red_flags)+"<h3>Preguntas</h3>"+li(p.questions)+"</section>"}
out.innerHTML=h+"<p><small>Model: "+e(d.model)+" via Nebius Token Factory. Not medical advice.</small></p>"}catch(err){st.textContent="Error: "+err}}
</script></body></html>`;
