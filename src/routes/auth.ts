import { Hono } from 'hono';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// Simple JWT-like token: base64(payload).base64(signature)
function createToken(secret: string): string {
  const payload = { admin: true, exp: Date.now() + 24 * 60 * 60 * 1000 }; // 24h
  const payloadB64 = btoa(JSON.stringify(payload));
  const sigData = payloadB64 + '.' + secret;
  // Simple hash for Workers (no crypto.subtle needed for this use case)
  let hash = 0;
  for (let i = 0; i < sigData.length; i++) {
    hash = ((hash << 5) - hash + sigData.charCodeAt(i)) | 0;
  }
  const sigB64 = btoa(String(Math.abs(hash)));
  return payloadB64 + '.' + sigB64;
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const sigData = payloadB64 + '.' + secret;
    let hash = 0;
    for (let i = 0; i < sigData.length; i++) {
      hash = ((hash << 5) - hash + sigData.charCodeAt(i)) | 0;
    }
    const expectedSig = btoa(String(Math.abs(hash)));
    if (sigB64 !== expectedSig) return false;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return false;
    return payload.admin === true;
  } catch {
    return false;
  }
}

auth.post('/login', async (c) => {
  const body = await c.req.json<{ password: string }>();
  const adminPass = c.env.ADMIN_PASSWORD || 'Adiri!';

  if (body.password !== adminPass) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  const token = createToken(c.env.JWT_SECRET || 'soccer-secret-key');
  return c.json({ token });
});

export default auth;
