import { createRemoteJWKSet, jwtVerify } from 'jose';

// Validate signed Access identity at the Worker too, including alternate routes.
export async function staffIdentity(req, env, testKeys) {
  const issuer = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;
  const allowed = (env.STAFF_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') || !audience || !allowed.length) return null;
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16000) return null;
  try {
    const keys = testKeys || createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, keys, {
      issuer, audience, algorithms: ['RS256'], maxTokenAge: '1h',
      requiredClaims: ['exp', 'iat', 'sub', 'email'],
    });
    if (payload.type !== 'app' || !allowed.includes(String(payload.email).toLowerCase())) return null;
    return { subject: payload.sub };
  } catch {
    return null;
  }
}
