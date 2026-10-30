# Discharge Instructions Explainer

Paste hospital discharge papers and get back, in plain language:
- step-by-step home care instructions
- a medication schedule table
- red-flag warning signs (call 911 vs. call your doctor)
- questions to ask at your follow-up visit
- optional translation: Spanish, Mandarin (Simplified Chinese), Arabic (right-to-left), or Russian

**Live demo:** https://discharge-explainer.irina-divinsky.workers.dev

Built for the **Nebius x NVIDIA Global AI Hackathon** (track: Best Apps and Agents).

> **Not medical advice.** This tool only rewrites existing instructions in simpler words and may make mistakes. Always follow your care team's instructions. In an emergency call 911. The included samples are fully synthetic; do not paste real patient identifiers.

## How it uses Nebius + Nemotron
The Cloudflare Worker calls **Nebius Token Factory** (OpenAI-compatible API) at
`https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions` with the open NVIDIA model
**`nvidia/nemotron-3-super-120b-a12b`**. A strict system prompt asks for JSON output (summary, steps, medications, red flags, questions, translation) with no new advice and no dose changes. The model and base URL can be changed via `NEBIUS_MODEL` / `NEBIUS_BASE_URL` (e.g. `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` for faster, cheaper calls).

## Architecture
```
Browser (static HTML/JS served by Worker)
   └─ POST /api/explain {text, language}
        └─ Cloudflare Worker (src/index.js)  -- NEBIUS_API_KEY stored as a Worker secret
             └─ Nebius Token Factory /v1/chat/completions  ->  NVIDIA Nemotron 3 Super
```
The app does not deliberately persist pasted discharge text. Custom text is sent to Nebius for generation and source checking; provider retention and infrastructure logs are separate. Optional ratings, flagged sections, and comments are saved in Cloudflare KV for the public demo leadership page. Do not enter identifying or health details in feedback.

## Recording demo
The two unchanged synthetic samples have prepared, edited explanations in all five menu languages. These are served instantly and clearly labeled as prepared examples, not live inference. They are based on captured Nemotron output, with editorial corrections and translations; they have not had clinical or professional translation review. Changing a sample's text uses live inference. After displaying a sample, changing the language refreshes the prepared example automatically.

Custom input still runs live generation and verification. Rewriting disables Nemotron reasoning traces to reduce overhead; the separate source-checking pass remains enabled. See [NVIDIA's model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16) for reasoning-mode support.

The feedback form and `/leadership` page use the existing `FEEDBACK` KV binding. The dashboard labels its seeded synthetic data.

## Source checking and limitations
The prompt requires source-only instructions and expanded abbreviations. After validating the response structure, the Worker makes a separate model call to check every section against the papers. Failed checks, incomplete translations, and malformed responses withhold the explanation. Every translation includes a medication schedule and separate 911/doctor warning categories.

One repair attempt is allowed for failed structure/source checks, followed by verification again. Unverified drafts are never displayed. This model-based check reduces risk; it does not guarantee factual or clinical correctness. Reading level has not been formally measured. Generation and verification (plus repair when needed) increase latency; timing varies with input length and translation.

Run `npm test` for input validation, rejection paths, and Spanish rendering checks. Run `npx wrangler deploy --dry-run` to verify Worker packaging. Automated tests use mocked inference and do not establish model reliability.

## Setup / run
```bash
npm install
cp .dev.vars.example .dev.vars   # put your Nebius Token Factory key here
npm run dev                       # http://localhost:8787
# deploy
npx wrangler secret put NEBIUS_API_KEY
npm run deploy
```
Get a key at https://tokenfactory.nebius.com (hackathon promo credits available). `GET /api/health` reports the model and whether a key is configured.

## Roadmap
- Read-aloud, more languages, photo/PDF upload, printable medication sheet
- Patient feedback loop: patients rate clarity and flag confusing parts; summaries go to hospital leadership

## License
MIT — see [LICENSE](LICENSE).
