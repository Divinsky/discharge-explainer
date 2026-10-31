# Discharge Instructions Explainer

A synthetic-data demonstration built with NVIDIA Nemotron 3 Super, Nebius Token Factory, and Cloudflare Workers for the Nebius × NVIDIA hackathon.

**Synthetic-data prototype. Not approved for protected health information. This is not a HIPAA-compliance claim or a clinical product.**

Live demo: https://discharge-explainer.irina-divinsky.workers.dev/

## What is available

- Two immutable fictional discharge examples, in English, Spanish, Mandarin, Arabic, and Russian.
- Prepared, editorially corrected summaries, home-care steps, medication tables, separate emergency/doctor warnings, and questions. These examples are labeled as prepared, not live inference; they have not had clinical or professional translation review.
- Optional structured ratings and section flags for a displayed synthetic example. There is no comment box.
- A private staff leadership dashboard and a Nemotron board briefing based only on aggregate counts.

## Privacy boundaries

The browser sends a sample ID and language, not discharge text. The textarea is read-only. `/api/explain` accepts only the two sample IDs; older clients can send only the exact built-in sample text. Edited examples, arbitrary text, and extra fields are rejected without inference or storage. No flag can enable patient-record intake.

New feedback accepts only enumerated fields: a 1–5 rating, allowlisted section flags, sample ID, and supported language. It is stored under `feedback:v2:*` in the existing KV namespace with a 30-day expiration. No names, patient IDs, comments, discharge papers, or generated patient explanations are stored. The API also enforces body-size and cross-origin checks.

Legacy `fb:*` records from the hackathon remain in KV and are quarantined: the application never reads, displays, aggregates, or sends those records to Nebius. They have **not** been deleted or retroactively given expiration dates. Review and approve their disposition separately before a patient pilot.

The staff dashboard exposes aggregate counts only, including six fixed synthetic demo ratings. It does not expose individual feedback records or comments. Board generation sends only these counts to Nebius. Provider retention, backups, contractual terms, and vendor product eligibility still require review.

## Staff access

Cloudflare Access protects `/leadership`, `/api/feedback/summary`, and `/api/leadership/summary`. The deployed policy allows only the owner's Cloudflare account email, requires MFA, and uses one-hour sessions. Public examples remain accessible.

The Worker independently verifies Access JWT signatures, issuer, audience, expiry, token age, token type, and an explicit `STAFF_EMAILS` allowlist. Missing configuration, missing tokens, and invalid identities fail closed. Access configuration is documented in [docs/ACCESS_SETUP.md](docs/ACCESS_SETUP.md).

Responses disable caching and framing and set referrer and browser-permission restrictions. Inline scripts use SHA-256 CSP hashes; inline event handlers are removed. Staff actions emit audit metadata containing an opaque staff subject and action, never tokens, request bodies, feedback, or health text. Central log retention/access policies remain an operational prerequisite for any patient deployment.

## Setup and checks

```sh
npm ci
npm test
npx wrangler deploy --dry-run
npm run dev
```

The synthetic examples require no model key. The existing `NEBIUS_API_KEY` Worker secret is needed only for authenticated counts-only board generation. Local credentials belong in ignored `.dev.vars`, never source control. `STAFF_EMAILS` is configured on the deployed Worker; `keep_vars = true` preserves it during Wrangler deployments. Set your own team domain/audience/allowlist for another deployment. Never bypass JWT validation for local convenience.

The tests cover all ten prepared examples, arbitrary-input rejection, body limits, strict feedback validation, expiration metadata, isolation from legacy records, signed/forged JWTs, private routes, counts-only model requests, CSP/security headers, RTL rendering, and hiding stale feedback. Authenticated unit tests use local test signing keys; a real owner's interactive Access/MFA sign-in must also be validated.

## Before patient use

See [docs/SECURITY_READINESS.md](docs/SECURITY_READINESS.md). Signed BAAs covering the actual products/endpoints, vendor retention/training terms, risk analysis, clinical evaluation, operational procedures, and a separately reviewed patient-storage design are outstanding. This implementation deliberately provides **no patient storage** while those requirements are unresolved.

## License

MIT.
