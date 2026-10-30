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
.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}
footer{color:#666;font-size:.85rem;margin-top:24px}
</style></head><body>
<h1>Discharge Instructions Explainer</h1>
<p class="tag">Paste hospital discharge papers. Get plain-language steps, a medicine schedule, warning signs, and questions for your follow-up visit. Powered by NVIDIA Nemotron on Nebius Token Factory.</p>
<p class="disc"><b>Not medical advice.</b> This tool only rewrites your papers in simpler words and can make mistakes. Always follow your doctor's and pharmacist's instructions. <b>In an emergency, call 911.</b> Do not paste real names or ID numbers.</p>
<button onclick="s(1)">Load sample: heart failure</button><button onclick="s(2)">Load sample: gallbladder surgery</button>
<label for="t">Discharge instructions</label><textarea id="t" maxlength="20000" placeholder="Paste discharge instructions here..."></textarea>
<label><input type="checkbox" id="es"> Also give me Spanish (Español)</label><br>
<button id="go" onclick="explainPapers()">Explain my discharge papers</button> <span id="st" role="status" aria-live="polite"></span>
<div id="out" aria-live="polite"></div>
<footer>Built-in examples use synthetic data. Text is sent to Nebius for processing. This app has no database. Open source (MIT).</footer>
<script>
const S={1:${JSON.stringify(SAMPLE1)},2:${JSON.stringify(SAMPLE2)}};
function s(n){t.value=S[n]}
const e=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const arr=a=>Array.isArray(a)?a:[];
const li=a=>"<ul>"+arr(a).map(x=>"<li>"+e(x)+"</li>").join("")+"</ul>";
const medicines=(items,spanish=false)=>"<div class=table-wrap><table><caption>"+(spanish?"Horario de medicamentos":"Medicine schedule")+"</caption><tr>"+(spanish?["Medicamento","Dosis","Cuándo","Para qué sirve","Notas"]:["Medicine","Dose","When","What it's for","Notes"]).map(v=>"<th scope=col>"+v+"</th>").join("")+"</tr>"+arr(items).map(m=>"<tr>"+[m.name,m.dose,m.when,m.purpose,m.notes].map(v=>"<td>"+e(v)+"</td>").join("")+"</tr>").join("")+"</table></div>";
const warnings=(rf,spanish=false)=>"<h3>"+(spanish?"Llame al 911 si":"Call 911 if")+"</h3>"+li(rf.call_911)+"<h3>"+(spanish?"Llame a su médico si":"Call your doctor if")+"</h3>"+li(rf.call_doctor);
async function explainPapers(){const button=document.getElementById("go");if(button.disabled)return;button.disabled=true;st.textContent="Reading and checking your papers... Response time varies.";out.innerHTML="";
try{const r=await fetch("/api/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t.value,spanish:es.checked})});
const d=await r.json();st.textContent="";if(d.error){out.innerHTML="<p class=red>"+e(d.error)+"</p>";return}
if(!r.ok||!d.result){out.innerHTML="<p class=red>Could not load a verified explanation. Please try again.</p>";return}const x=d.result;
let h="<section><h2>In short</h2><p>"+e(x.summary)+"</p></section><section><h2>What to do at home</h2><ol>"+arr(x.steps).map(v=>"<li>"+e(v)+"</li>").join("")+"</ol></section>";
h+="<section><h2>Medicine schedule</h2>"+medicines(x.medications)+"</section>";
const rf=x.red_flags||{};h+="<section class=red><h2>Warning signs</h2>"+warnings(rf)+"</section>";
h+="<section><h2>Questions to ask at your follow-up</h2>"+li(x.questions)+"</section>";
if(x.spanish){const p=x.spanish;h+="<section lang=es><h2>En español</h2><p>"+e(p.summary)+"</p><h3>Qué hacer</h3>"+li(p.steps)+"<h3>Horario de medicamentos</h3>"+medicines(p.medications,true)+"<h3>Señales de alarma</h3>"+warnings(p.red_flags||{},true)+"<h3>Preguntas</h3>"+li(p.questions)+"</section>"}
out.innerHTML=h+"<p><small>Model: "+e(d.model)+" via Nebius Token Factory. Not medical advice.</small></p>"}catch{st.textContent="Unable to reach the explanation service. Please try again."}finally{button.disabled=false}}
</script></body></html>`;
