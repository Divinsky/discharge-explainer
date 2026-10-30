# Devpost Submission Draft

**Title:** Discharge Instructions Explainer
**Tagline:** Turn confusing hospital discharge papers into clear steps, a medicine schedule, and warning signs — in plain English or Spanish, powered by NVIDIA Nemotron on Nebius.
**Track:** Best Apps and Agents
**Live demo:** https://discharge-explainer.irina-divinsky.workers.dev
**Repo:** https://github.com/Divinsky/discharge-explainer

## Inspiration
I'm Ira Divinsky, founder of IntelliGene AI. I've spent about 20 years in federal healthcare IT, including work with HHS. Again and again I've seen the same gap: patients leave the hospital with pages of dense, jargon-filled discharge instructions ("furosemide 40 mg PO BID", "call if >2 lb gain") at the most stressful moment of their lives. Many patients and caregivers can't act on them, and misunderstood instructions contribute to medication errors, missed warning signs, and avoidable readmissions. I wanted a simple tool any family member could use at the bedside or kitchen table.

## What it does
Paste discharge papers and get:
- A short plain-language summary and numbered home-care steps (~6th-grade reading level)
- A medication schedule table (name, dose, when, what it's for, notes)
- Red-flag warning signs split into "Call 911" vs. "Call your doctor"
- Questions to ask at the follow-up visit
- Optional Spanish translation
Two synthetic sample discharges (heart failure, gallbladder surgery) are built in. A prominent "not medical advice" disclaimer is always shown, and nothing is stored.

## How we built it
- **NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`)** — open model doing the rewriting, structuring, and translation.
- **Nebius Token Factory** — OpenAI-compatible inference API serving Nemotron; we use JSON-mode output with a strict system prompt (no new advice, no dose changes, "ask your care team" when unclear).
- **Cloudflare Workers** — a single Worker serves the HTML UI and the `/api/explain` endpoint; the Nebius key is a Worker secret, never exposed to the browser.
- Plain HTML/JS front end, no framework, no database.

## Challenges we ran into
- Getting reliably structured output (tables + lists) from free-text clinical notes; solved with a JSON schema in the prompt, JSON mode, and tolerant parsing (stripping any reasoning text).
- Keeping simplification faithful: the model must never change doses or invent instructions.
- Balancing reading level against medical accuracy, and safely separating 911-level emergencies from "call your doctor" signs.
- Shipping in a very short hackathon window.

## Accomplishments that we're proud of
- An end-to-end, deployable app built in hours with a tiny, auditable codebase.
- Bilingual output for one of the largest underserved patient groups in the US.
- Privacy by design: stateless, no storage, synthetic-only samples.

## What we learned
Open models like Nemotron, served through an OpenAI-compatible API, make it trivial to swap model sizes (Nano for speed, Super for quality) without code changes.

## What's next
- Read-aloud (text-to-speech) and more languages
- Upload a photo/PDF of discharge papers (vision model OCR)
- Printable one-page "fridge sheet" and calendar/reminder export for medications
- Patient feedback loop: after using the app, patients and families rate how clear their instructions were and flag confusing parts, and the tool rolls this up into a short summary for hospital leadership and board members, so the voice of the customer reaches the people who set priorities
- Evaluation against readability scores and clinician review; pilot with a health system's patient-education team

## Built with
NVIDIA Nemotron 3 Super, Nebius Token Factory, Cloudflare Workers, Wrangler, JavaScript, HTML/CSS, OpenAI-compatible Chat Completions API

## Feedback on Nebius / NVIDIA tools
- The OpenAI-compatible endpoint made integration a drop-in change; one base URL + model ID.
- The model catalog with per-model pricing and context windows made choosing between Nemotron Nano and Super easy.
- Wishes: a no-card free tier for hackathon participants (billing setup is required at onboarding), clearer docs on which regional endpoint hosts which model, and documented guidance for turning off/stripping reasoning traces when using JSON mode.

## Demo video script (< 3 minutes)
**0:00–0:20 — Problem.** "Patients leave the hospital with papers like this." Show the synthetic heart-failure discharge text. "Jargon like 'PO BID' and '2 g sodium diet' is hard to follow, and misunderstandings lead to readmissions."
**0:20–0:40 — App intro.** Show the live URL. Point out the not-medical-advice banner and the sample buttons.
**0:40–1:30 — Demo 1.** Click "Load sample: heart failure", tick Spanish, click Explain. Walk through the plain summary, numbered steps, medication table (furosemide twice a day, etc.), red "Call 911 / Call your doctor" box (weight gain >2 lb), follow-up questions, then the Spanish section.
**1:30–2:00 — Demo 2.** Load the gallbladder surgery sample; highlight pain-med schedule, "no driving on oxycodone", and fever warning.
**2:00–2:40 — How it's built.** Show the Worker code: `/api/explain` calls Nebius Token Factory's OpenAI-compatible endpoint with model `nvidia/nemotron-3-super-120b-a12b`, JSON-mode output, key stored as a Cloudflare secret. Show `/api/health` and the architecture diagram in the README.
**2:40–3:00 — Close.** "Open source under MIT, no data stored, built with NVIDIA Nemotron on Nebius. Next: photo upload, read-aloud, more languages."
