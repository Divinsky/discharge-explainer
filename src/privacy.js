export const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};

export async function secureResponse(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(RESPONSE_HEADERS)) headers.set(name, value);
  let body=response.body;
  if ((headers.get('Content-Type') || '').includes('text/html')) {
    body=await response.text();
    const hashes=[];
    for (const match of body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
      hashes.push(`'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`);
    }
    headers.set('Content-Security-Policy',RESPONSE_HEADERS['Content-Security-Policy'].replace("script-src 'self'",`script-src 'self' ${hashes.join(' ')}`));
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

export async function readSmallJSON(req, limit = 24000) {
  if (!(req.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    throw { status: 415, message: 'Use application/json.' };
  }
  const declared = Number(req.headers.get('Content-Length'));
  if (declared > limit) throw { status: 413, message: 'Request is too large.' };
  const reader = req.body?.getReader();
  if (!reader) throw { status: 400, message: 'Invalid JSON.' };
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw { status: 413, message: 'Request is too large.' }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (error) {
    if (error?.status) throw error;
    throw { status: 400, message: 'Invalid JSON.' };
  } finally { reader.releaseLock(); }
}

export function sameOriginWrite(req) {
  const origin = req.headers.get('Origin');
  return (!origin || origin === new URL(req.url).origin) && req.headers.get('Sec-Fetch-Site') !== 'cross-site';
}
