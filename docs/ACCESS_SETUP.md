# Private leadership access

Configured October 31, 2026 for the existing Cloudflare account. No application-wide public access policy or broad email-domain allowance was created.

- Access team: `https://rough-base-f9a0.cloudflareaccess.com`
- Access application: `87b57cda-02b7-4fb9-a157-89f459d943f5`
- Reusable owner-only policy: `68965929-79ce-4664-ba05-3442b3677b1c`
- Audience: `4f34d1f510b794d42de4169b894c8565e19ea9bd2eaeb428412600d8189524b6`
- Protected destinations: the app's `/leadership`, `/api/feedback/summary`, and `/api/leadership/summary` paths.
- Identity provider: the account's existing Cloudflare identity provider.
- Sessions: one hour; MFA required by this application policy. Organization-level allowed authenticators were configured for TOTP, biometrics, and security keys to support that policy. This did not enable an organization-wide MFA requirement for all applications.

The owner opens **Staff leadership (sign-in)** and signs in using the Cloudflare account email. Cloudflare may require initial MFA enrollment. Credentials, one-time codes, MFA enrollment, and recovery actions must be completed by the owner. The worker's private-route guard does not trust an unsigned email header or the presence of a JWT header alone.

Worker variables `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and `STAFF_EMAILS` must match the Access policy. The allowlist email is configured on the Worker, not embedded in public HTML/JavaScript. These variables are not a substitute for a signed token.

For another deployment, provision its own Access application and audience, use the intended staff IdP/groups, and replace these variables. Add each staff member explicitly only after authorization. Hospital group/role and tenant administration are not implemented by this single-owner prototype.

Verify that anonymous requests to all three protected paths redirect to Access sign-in or are denied, while public samples still work. Verify forged/expired tokens cannot retrieve aggregates. Complete an actual owner login and MFA flow before claiming the interactive sign-in path is fully validated.

References: [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) and [Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/).
