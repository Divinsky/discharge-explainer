# Devpost Submission

> **Historical hackathon description (October 30, 2026).** After the hackathon, the app was restricted to built-in synthetic samples, free-text feedback was removed, and leadership access was made private. The script and original feature descriptions below describe the earlier demonstration. See README.md and docs/SECURITY_READINESS.md for the current privacy boundaries. This prototype is not represented as HIPAA compliant.

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
- **Patient feedback loop:** users rate clarity, flag confusing sections, and optionally leave a comment. A public demo leadership page shows clarity scores, response counts, flagged sections, and recent comments. NVIDIA Nemotron 3 Super, served through Nebius Token Factory, generates a board briefing from this feedback. Seeded synthetic entries are labeled demo data. Users are asked not to include names or health details.
Two synthetic sample discharges (heart failure, gallbladder surgery) are built in, with prepared, edited multilingual examples for instant demonstrations. These are labeled as prepared; custom text runs live on Nemotron. A prominent "not medical advice" disclaimer is always shown. The app does not deliberately persist discharge text. Optional ratings, flagged sections, and comments are saved in Cloudflare KV for a public demo leadership page; feedback must not contain identifying or health details.

## How we built it
- **NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`)** — open model doing the rewriting, structuring, and translation.
- **Nebius Token Factory** — OpenAI-compatible inference API serving Nemotron; JSON-mode output uses a source-only prompt, runtime structure checks, and a separate model pass to check the explanation against the papers. Failed checks withhold the explanation. This reduces risk but does not guarantee correctness.
- **Cloudflare Workers** — a single Worker serves the HTML UI and the `/api/explain` endpoint; the Nebius key is a Worker secret, never exposed to the browser.
- Plain HTML/JS front end with Cloudflare Workers KV for optional feedback storage.

## Challenges we ran into
- Getting reliably structured output (tables + lists) from free-text clinical notes; solved with a JSON schema in the prompt, JSON mode, and tolerant parsing (stripping any reasoning text).
- Keeping simplification faithful: the model must never change doses or invent instructions.
- Balancing reading level against medical accuracy, and safely separating 911-level emergencies from "call your doctor" signs.
- Shipping in a very short hackathon window.

## Accomplishments that we're proud of
- An end-to-end, deployable app built in hours with a tiny, auditable codebase.
- Multilingual output (Spanish, Mandarin, Arabic RTL, Russian) for patients with limited English proficiency.
- Synthetic-only built-in examples; custom discharge text is processed by Nebius. Optional feedback is saved in KV for leadership summaries.

## Results
All ten combinations of the two unchanged synthetic samples and five menu languages returned prepared examples in approximately 0.19–0.27 seconds in one live test. These are prepared, editorially corrected examples, not live inference timings. Custom text uses live generation and a separate source-checking pass, with one repair attempt; latency varies and failed checks can withhold an explanation. Feedback submission, leadership aggregation, and live Nemotron board-briefing generation were also tested successfully. Historical output in `sample-output.json` predates these safeguards and is not a correctness benchmark.

## What we learned
Open models like Nemotron, served through an OpenAI-compatible API, make it trivial to swap model sizes (Nano for speed, Super for quality) without code changes.

## What's next
- Read-aloud (text-to-speech) and more languages
- Upload a photo/PDF of discharge papers (vision model OCR)
- Printable one-page "fridge sheet" and calendar/reminder export for medications
- Evaluation against readability scores and clinician review; pilot with a health system's patient-education team

## Built with
NVIDIA Nemotron 3 Super, Nebius Token Factory, Cloudflare Workers, Cloudflare Workers KV, Wrangler, JavaScript, HTML/CSS, OpenAI-compatible Chat Completions API

## Feedback on Nebius / NVIDIA tools
- The OpenAI-compatible endpoint made integration a drop-in change; one base URL + model ID.
- The model catalog with per-model pricing and context windows made choosing between Nemotron Nano and Super easy.
- Wishes: a no-card free tier for hackathon participants (billing setup is required at onboarding), clearer docs on which regional endpoint hosts which model, and documented guidance for turning off/stripping reasoning traces when using JSON mode.

## Demo video script (< 3 minutes)
**0:00–0:20 — Problem.** "Patients leave the hospital with papers like this." Show the synthetic heart-failure discharge text. "Jargon like 'PO BID' and '2 g sodium diet' is hard to follow, and misunderstandings lead to readmissions."
**0:20–0:40 — App intro.** "This is Discharge Instructions Explainer, powered by NVIDIA Nemotron 3 Super through Nebius Token Factory. NVIDIA provides the model; Nebius serves the inference API." Show the disclaimer and sample buttons.
**0:40–1:25 — Patient demo.** "These are prepared, edited synthetic examples for this walkthrough. Custom text uses live inference." Load heart failure, select Spanish, click Explain. Show steps, doses, and separate emergency/doctor warnings. Switch to Arabic to show automatic refresh and right-to-left layout. Mention Mandarin and Russian.
**1:25–2:05 — Feedback loop.** Submit a clearly labeled demo rating/comment without patient details. Open `/leadership` and show clarity scores, flagged sections, and comments. Click Generate board summary. "The same NVIDIA Nemotron model, served by Nebius, turns feedback into a briefing for hospital leadership."
**2:05–2:35 — Architecture.** "Cloudflare Workers serves the app, Nebius Token Factory handles model requests, and NVIDIA Nemotron produces live explanations and leadership briefings. Optional feedback is stored in Cloudflare KV." Show the model ID and API call. Explain that model-based source checks reduce risk but do not guarantee correctness.
**2:35–2:55 — Close.** "This is a hackathon prototype, not medical advice. Next are clinician review, readability evaluation, and read-aloud support. Built with NVIDIA Nemotron on Nebius Token Factory—helping patients understand their instructions and helping leaders hear what remains confusing."
