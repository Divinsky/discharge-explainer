export const SAMPLE1 = `DISCHARGE SUMMARY (SYNTHETIC SAMPLE - NOT A REAL PATIENT)
Patient: Jane Example, 67F. Admitted 10/20 for acute decompensated heart failure (HFrEF, EF 30%). Diuresed with IV furosemide, net -4.2L. Discharge weight 172 lb.
Discharge medications: Furosemide 40 mg PO BID. Metoprolol succinate 25 mg PO daily. Lisinopril 5 mg PO daily. Spironolactone 12.5 mg PO daily. Potassium chloride 20 mEq PO daily. Aspirin 81 mg PO daily. HOLD ibuprofen/NSAIDs.
Instructions: 2 g sodium diet, fluid restriction 1.5 L/day. Daily weights each AM; call if gain >2 lb in 1 day or >5 lb in 1 week. BMP in 1 week. Follow up with cardiology (Dr. Sample) in 7 days. Return to ED for chest pain, SOB at rest, syncope.`;
export const SAMPLE2 = `DISCHARGE INSTRUCTIONS (SYNTHETIC SAMPLE - NOT A REAL PATIENT)
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
<p class="tag">Explore synthetic discharge examples with plain-language steps, medication schedules, and warning signs. Built with <b>NVIDIA Nemotron 3 Super</b> and <b>Nebius Token Factory</b>.</p>
<p class="disc"><b>Synthetic-data prototype. Not approved for protected health information.</b> Only the two built-in fictional examples are accepted. Custom patient documents and free-text comments are disabled.</p>
<p class="disc"><b>Not medical advice.</b> This tool only rewrites your papers in simpler words and can make mistakes. Always follow your doctor's and pharmacist's instructions. <b>In an emergency, call 911.</b> Do not paste real names or ID numbers.</p>
<button id="sample1">Load sample: heart failure</button><button id="sample2">Load sample: gallbladder surgery</button>
<p><small>These are prepared, edited synthetic examples, not live inference or clinical guidance. Nebius receives only aggregate ratings when an authorized staff member generates a leadership briefing.</small></p>
<label for="t">Synthetic discharge example (read-only)</label><textarea id="t" readonly placeholder="Choose one of the synthetic sample buttons above."></textarea>
<label for="lang">Also translate to:</label> <select id="lang"><option value="">English only</option><option value="es">Spanish (Español)</option><option value="zh">Mandarin (简体中文)</option><option value="ar">Arabic (العربية)</option><option value="ru">Russian (Русский)</option></select><br>
<button id="go">Explain synthetic example</button> <span id="st" role="status" aria-live="polite"></span>
<div id="out" aria-live="polite"></div>
<section id=fb style="display:none;background:#f4fbe8"><h2>How clear was this synthetic example?</h2><p><small>Optional ratings and listed section flags are saved for 30 days. Only authorized staff can see aggregates. No patient details or free-text comments are accepted.</small></p>
<div id=stars>${[1,2,3,4,5].map(n=>`<label><input type=radio name=r value=${n}> ${"★".repeat(n)}</label> `).join("")}</div>
<p>Anything confusing? ${["summary","steps","medications","warning signs","questions","translation"].map(s=>`<label><input type=checkbox name=sec value="${s}"> ${s}</label> `).join("")}</p>
<button id=send-feedback>Submit synthetic-example rating</button> <span id=fbs role=status></span> <a href="/leadership">Staff leadership (sign-in) &rarr;</a></section>
<footer><a href="/leadership">Staff leadership (sign-in)</a> · No patient-record storage is provided. New structured feedback expires after 30 days. Existing legacy comments are excluded from the app and model requests. Vendor agreements and a security/privacy assessment are required before real patient use. This prototype is not represented as HIPAA compliant. Open source (MIT).</footer>
<script>
const S={1:${JSON.stringify(SAMPLE1)},2:${JSON.stringify(SAMPLE2)}};
let displayedSample=null;
function hideFeedback(){displayedSample=null;document.getElementById('fb').style.display='none';document.getElementById('fbs').textContent='';document.querySelectorAll('input[name=r],input[name=sec]').forEach(x=>x.checked=false)}
function s(n){t.value=S[n];out.innerHTML='';hideFeedback()}
function changeLanguage(){if(Object.values(S).includes(t.value)&&out.innerHTML)explainPapers()}
const e=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const arr=a=>Array.isArray(a)?a:[];
const li=a=>"<ul>"+arr(a).map(x=>"<li>"+e(x)+"</li>").join("")+"</ul>";
const labels={
en:["English","What to do at home","Medicine schedule","Warning signs","Questions to ask","Call 911 if","Call your doctor if","Medicine","Dose","When","What it's for","Notes"],
es:["En español","Qué hacer","Horario de medicamentos","Señales de alarma","Preguntas","Llame al 911 si","Llame a su médico si","Medicamento","Dosis","Cuándo","Para qué sirve","Notas"],
zh:["中文说明","在家要做的事","用药时间表","危险信号","复诊时要问的问题","出现以下情况请拨打911","出现以下情况请联系医生","药物","剂量","服用时间","用途","注意事项"],
ar:["بالعربية","ما يجب فعله في المنزل","جدول الأدوية","علامات الخطر","أسئلة للمتابعة","اتصل بـ 911 في الحالات التالية","اتصل بطبيبك في الحالات التالية","الدواء","الجرعة","متى يؤخذ","الغرض","ملاحظات"],
ru:["На русском","Что делать дома","Расписание лекарств","Тревожные признаки","Вопросы на приёме","Звоните 911, если","Позвоните врачу, если","Лекарство","Доза","Когда принимать","Для чего","Примечания"]};
const medicines=(items,L="en")=>"<div class=table-wrap><table><caption>"+labels[L][2]+"</caption><tr>"+labels[L].slice(7).map(v=>"<th scope=col>"+v+"</th>").join("")+"</tr>"+arr(items).map(m=>"<tr>"+[m.name,m.dose,m.when,m.purpose,m.notes].map(v=>"<td>"+e(v)+"</td>").join("")+"</tr>").join("")+"</table></div>";
const warnings=(rf,L="en")=>"<h3>"+labels[L][5]+"</h3>"+li(rf.call_911)+"<h3>"+labels[L][6]+"</h3>"+li(rf.call_doctor);
async function explainPapers(){const button=document.getElementById("go"),menu=document.getElementById('lang');if(button.disabled)return;const sampleId=Object.keys(S).find(k=>S[k]===t.value);out.innerHTML='';hideFeedback();if(!sampleId){st.textContent='Choose a built-in synthetic example. Custom patient text is disabled.';return}button.disabled=true;menu.disabled=true;st.textContent="Loading synthetic example...";
try{const language=menu.value;const r=await fetch("/api/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sampleId,language}),cache:'no-store'});
const d=await r.json();st.textContent="";if(d.error){out.innerHTML="<p class=red>"+e(d.error)+"</p>";return}
if(!r.ok||!d.result){out.innerHTML="<p class=red>Could not load a verified explanation. Please try again.</p>";return}const x=d.result;
let h="<section><h2>In short</h2><p>"+e(x.summary)+"</p></section><section><h2>What to do at home</h2><ol>"+arr(x.steps).map(v=>"<li>"+e(v)+"</li>").join("")+"</ol></section>";
h+="<section><h2>Medicine schedule</h2>"+medicines(x.medications)+"</section>";
const rf=x.red_flags||{};h+="<section class=red><h2>Warning signs</h2>"+warnings(rf)+"</section>";
h+="<section><h2>Questions to ask at your follow-up</h2>"+li(x.questions)+"</section>";
if(x.translation&&labels[language]){const p=x.translation,L=language,T=labels[L];h+="<section lang="+L+(L==="ar"?" dir=rtl":"")+"><h2>"+T[0]+"</h2><p>"+e(p.summary)+"</p><h3>"+T[1]+"</h3>"+li(p.steps)+"<h3>"+T[2]+"</h3>"+medicines(p.medications,L)+"<h3>"+T[3]+"</h3>"+warnings(p.red_flags||{},L)+"<h3>"+T[4]+"</h3>"+li(p.questions)+"</section>"}
displayedSample={sampleId,language};document.getElementById('fb').style.display='block';
if(typeof d!=="undefined"&&d.resources&&d.resources.length){const q=x=>String(x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);h+="<h3>Learn more (found live with Tavily search)</h3><ul>"+d.resources.map(x=>"<li><a href=\""+q(x.url)+"\" target=\"_blank\" rel=\"noopener\">"+q(x.title)+"</a></li>").join("")+"</ul>"}out.innerHTML=h+"<p><small>"+((typeof d!=="undefined"&&d.prepared)?"Saved NVIDIA Nemotron output (live model was unavailable).":"Live output from NVIDIA Nemotron 3 Super via Nebius Token Factory, checked against the source papers.")+" Not medical advice.</small></p>"}catch{st.textContent="Unable to reach the explanation service. Please try again."}finally{button.disabled=false;menu.disabled=false}}
async function sendfb(){const status=document.getElementById("fbs"),button=document.getElementById("send-feedback");const rating=document.querySelector("input[name=r]:checked");if(!rating){status.textContent="Please pick a rating.";return}if(button.disabled)return;button.disabled=true;
try{if(!displayedSample){status.textContent='Explain a synthetic example before rating it.';return}const sections=[...document.querySelectorAll("input[name=sec]:checked")].map(x=>x.value);const response=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating:rating.value,sections,...displayedSample}),cache:'no-store'});const d=await response.json();status.textContent=response.ok&&d.ok?"Thank you! Your structured rating was saved for 30 days.":(d.error||"Could not save feedback. Please try again.")}catch{status.textContent="Could not save feedback. Please try again."}finally{button.disabled=false}}
document.getElementById('sample1').addEventListener('click',()=>s(1));document.getElementById('sample2').addEventListener('click',()=>s(2));document.getElementById('lang').addEventListener('change',changeLanguage);document.getElementById('go').addEventListener('click',explainPapers);document.getElementById('send-feedback').addEventListener('click',sendfb);
</script></body></html>`;
