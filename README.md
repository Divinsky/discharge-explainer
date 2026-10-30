# Discharge Instructions Explainer

Paste hospital discharge papers and get back, in plain language (~6th-grade reading level):
- step-by-step home care instructions
- a medication schedule table
- red-flag warning signs (call 911 vs. call your doctor)
- questions to ask at your follow-up visit
- optional Spanish translation

Built for the **Nebius x NVIDIA Global AI Hackathon** (track: Best Apps and Agents).

> **Not medical advice.** This tool only rewrites existing instructions in simpler words and may make mistakes. Always follow your care team's instructions. In an emergency call 911. The included samples are fully synthetic; do not paste real patient identifiers.

## How it uses Nebius + Nemotron
The Cloudflare Worker calls **Nebius Token Factory** (OpenAI-compatible API) at
`https://api.tokenfactory.us-central1.nebius.com/v1/chat/completions` with the open NVIDIA model
**`nvidia/nemotron-3-super-120b-a12b`**. A strict system prompt asks for JSON output (summary, steps, medications, red flags, questions, Spanish) with no new advice and no dose changes. The model and base URL can be changed via `NEBIUS_MODEL` / `NEBIUS_BASE_URL` (e.g. `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` for faster, cheaper calls).

## Architecture
```
Browser (static HTML/JS served by Worker)
   └─ POST /api/explain {text, spanish}
        └─ Cloudflare Worker (src/index.js)  -- NEBIUS_API_KEY stored as a Worker secret
             └─ Nebius Token Factory /v1/chat/completions  ->  NVIDIA Nemotron 3 Super
```
No database, no storage: pasted text is never persisted.

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

## License
MIT — see [LICENSE](LICENSE).
