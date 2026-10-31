# Security and HIPAA readiness boundaries

This is an engineering status record, not legal certification. Updated October 31, 2026.

## Implemented safeguards

| Area | Current boundary |
|---|---|
| Patient intake | Disabled. Only exact built-in fictional examples are accepted. Browser requests send sample IDs. No real-patient document upload or paste flow exists. |
| Feedback | Structured values only; unknown fields and free-text comments rejected. |
| Storage | New structured feedback in KV expires in 30 days. No patient-record storage is provided. |
| Legacy data | Previous `fb:*` records are inaccessible through the application and excluded from model requests. They are retained pending an explicit disposition decision. |
| Leadership | Owner-only Access policy, MFA, one-hour sessions, and independent signed-JWT/allowlist verification at the Worker. |
| Model requests | Authenticated board generation receives aggregate numerical counts and fixed section names only. |
| Browser | No-store responses, no-referrer policy, framing denied, restricted permissions, and hash-based script CSP. |
| Older versions | Public Worker preview URLs are disabled to prevent access to older deployment versions through alternate hosts. |
| Input boundaries | Bounded JSON streaming reads, strict property/enum validation, and cross-site write rejection. |
| Logging | No request bodies, raw feedback, JWTs, API keys, or model content logged by application code. Staff access emits an opaque staff subject and action. |
| Verification | Automated tests cover these boundaries. Live checks establish anonymous denial and synthetic sample behavior. Interactive MFA completion requires the owner. |

## Outstanding before any real patient pilot

1. Determine the legal role and intended workflows with healthcare privacy counsel; sign the required BAA with the healthcare organization.
2. Obtain vendor BAAs/contractual confirmation covering the exact Cloudflare products, Nebius endpoint/model, subprocessors, support access, and operational settings. Marketing claims or encryption do not establish coverage for this account.
3. Confirm provider training, retention, log, backup, incident-notification, and deletion practices. No zero-retention claim has been established here.
4. Inventory data flows/assets and conduct a documented security risk analysis and independent security assessment.
5. Design any future patient storage separately: encryption at rest/in transit, managed encryption keys, least-privilege service accounts, patient authentication, hospital tenant isolation, approved roles, and backups/restoration/deletion policies. Do not repurpose the demo KV namespace for patient records.
6. Review legacy comments and approve appropriate deletion/retention. New TTLs do not automatically delete old records or establish provider backup deletion.
7. Configure and review centralized audit retention/access, alerting, incident and breach response, disaster recovery, staff training, and access reviews.
8. Establish privacy notices, contractual responsibilities, support procedures, and legally appropriate consent/authorization workflows. A checkbox cannot make an unsuitable processor acceptable.
9. Validate clinical fidelity, emergency-warning completeness, translation accuracy, readability, and usability with appropriate professionals. The earlier custom-text model failures are not solved by a privacy control; custom processing is disabled.
10. Assess applicable consumer-health, state, and other requirements where HIPAA does not apply.

There is no environment toggle that authorizes patient intake. Enabling it requires a new reviewed implementation after these prerequisites. Do not describe this prototype as HIPAA compliant.

References: [HHS cloud-computing guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html), [HHS health-app resources](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-apps/index.html), and [HIPAA Security Rule summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html).
