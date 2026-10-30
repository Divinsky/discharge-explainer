# Devpost Submission

**Title:** Discharge Instructions Explainer
**Tagline:** Turn confusing hospital discharge papers into clear steps, a medicine schedule, and warning signs — in plain English, Spanish, Mandarin, Arabic, or Russian, powered by NVIDIA Nemotron on Nebius.
**Track:** Best Apps and Agents
**Live demo:** https://discharge-explainer.irina-divinsky.workers.dev
**Leadership summary (demo):** https://discharge-explainer.irina-divinsky.workers.dev/leadership
**Repo:** https://github.com/Divinsky/discharge-explainer

## Inspiration
I'm Ira Divinsky, founder of IntelliGene AI. I've spent about 20 years in federal healthcare IT, including work with HHS. Again and again I've seen the same gap: patients leave the hospital with pages of dense, jargon-filled discharge instructions ("furosemide 40 mg PO BID", "call if >2 lb gain") at the most stressful moment of their lives. Many patients and caregivers can't act on them, and misunderstood instructions contribute to medication errors, missed warning signs, and avoidable readmissions. I wanted a simple tool any family member could use at the bedside or kitchen table.

## What it does
Paste discharge papers and get:
- A short plain-language summary and numbered home-care steps (reading level has not been formally measured)
- A medication schedule table (name, dose, when, what it's for, notes)
- Red-flag warning signs split into "Call 911" vs. "Call your doctor"
- Questions to ask at the follow-up visit
- Optional translation via a language dropdown: Spanish, Mandarin (Simplified Chinese), Arabic (right-to-left), or Russian
- **Patient feedback loop:** after each explanation, patients rate clarity (1–5 stars), flag confusing sections and add an optional comment — no names or health details collected. A **Leadership summary** page (https://discharge-explainer.irina-divinsky.workers.dev/leadership) shows average clarity, response count, most-flagged sections and recent comments, and a "Generate board summary" button has Nemotron write a plain-language briefing for hospital leaders and board members (what confuses patients + top 3 fixes). Seeded entries are labeled demo data.

Two synthetic sample discharges (heart failure, gallbladder surgery) are built in. A prominent "not medical advice" disclaimer is always shown. The app has no database and does not deliberately persist input; text is sent to Nebius, whose retention practices are separate.

## How we built it
- **NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`)** — open model doing the rewriting, structuring, and translation.
- **Nebius Token Factory** — OpenAI-compatible inference API serving Nemotron; JSON-mode output with a strict source-only system prompt (no new advice, no dose changes, "ask your care team" when unclear).
- **Cloudflare Workers KV** (free tier) — stores anonymous feedback.
- **Cloudflare Workers** — a single Worker serves the HTML UI and the `/api/explain` endpoint; the Nebius key is a Worker secret, never exposed to the browser.
- Plain HTML/JS front end, no framework, no database.

## Challenges we ran into
- Getting reliably structured output (tables + lists) from free-text clinical notes; solved with a JSON schema in the prompt, JSON mode, and tolerant parsing (stripping any reasoning text).
- Keeping simplification faithful: the model must never change doses or invent instructions.
- Balancing reading level against medical accuracy, and safely separating 911-level emergencies from "call your doctor" signs.
- Shipping in a very short hackathon window.

## Accomplishments that we're proud of
- An end-to-end, deployable app built in hours with a tiny, auditable codebase.
- Multilingual output (Spanish, Mandarin, Arabic RTL, Russian) for patients with limited English proficiency.
- Stateless app with no database and synthetic-only built-in samples; input is processed by Nebius.

## Results
Live API testing with both synthetic samples returned structured explanations. Before adding the source-checking pass, one retest took about 10 seconds for English and 20 seconds with Spanish. The current version adds a second inference call, so latency must be measured again and is not guaranteed. Spanish includes medication schedules and separate 911/doctor warnings. Historical output in `sample-output.json` predates these safeguards and is not a correctness benchmark.

## What we learned
Open models like Nemotron, served through an OpenAI-compatible API, make it trivial to swap model sizes (Nano for speed, Super for quality) without code changes.

## What's next
- Read-aloud (text-to-speech) and more languages
- Upload a photo/PDF of discharge papers (vision model OCR)
- Printable one-page "fridge sheet" and calendar/reminder export for medications
- A second-pass model check that verifies every section against the original papers
- Evaluation against readability scores and clinician review; pilot with a health system's patient-education team

## Built with
NVIDIA Nemotron 3 Super, Nebius Token Factory, Cloudflare Workers, Cloudflare Workers KV, Wrangler, JavaScript, HTML/CSS, OpenAI-compatible Chat Completions API

## Feedback on Nebius / NVIDIA tools
- The OpenAI-compatible endpoint made integration a drop-in change; one base URL + model ID.
- The model catalog with per-model pricing and context windows made choosing between Nemotron Nano and Super easy.
- Wishes: a no-card free tier for hackathon participants (billing setup is required at onboarding), clearer docs on which regional endpoint hosts which model, and documented guidance for turning off/stripping reasoning traces when using JSON mode.

## Demo video script (< 3 minutes)
**0:00–0:20 — Problem.** "Patients leave the hospital with papers like this." Show the synthetic heart-failure discharge text. "Jargon like 'PO BID' and '2 g sodium diet' is hard to follow, and misunderstandings lead to readmissions."
**0:20–0:40 — App intro.** Show the live URL. Point out the not-medical-advice banner and the sample buttons.
**0:40–1:30 — Demo 1.** Click "Load sample: heart failure", select Spanish, click Explain. Walk through the summary, steps, medication table, separate 911/doctor warnings, and Spanish section. Mention Mandarin, Arabic (right-to-left), and Russian. To show another language, select it and click Explain again.
**1:30–1:50 — Demo 2.** Load the gallbladder surgery sample; highlight pain-med schedule, "no driving on oxycodone", and fever warning.
**1:50–2:20 — Feedback loop.** Give 2 stars, flag "medications", submit. Open /leadership: average score, most-flagged sections, recent comments (labeled demo data). Click "Generate board summary" — Nemotron writes a briefing with the top 3 fixes.
**2:20–2:45 — How it's built.** Show the Worker code: `/api/explain` calls Nebius Token Factory's OpenAI-compatible endpoint with model `nvidia/nemotron-3-super-120b-a12b`, JSON-mode output, key stored as a Cloudflare secret. Show `/api/health` and the architecture diagram in the README.
**2:45–3:00 — Close.** "Open source under MIT, no app database, built with NVIDIA Nemotron on Nebius. Next: photo upload, read-aloud, more languages."
