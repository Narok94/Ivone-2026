import { createSession, noCache, readSession } from '../lib/session.js';
import { pool } from './database.js';
import { randomUUID } from 'node:crypto';
const user = { id: `local-${randomUUID()}`, username: 'Teste local fictício' };
export async function bootstrapSession(req: any, res: any) {
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL) return res.status(404).end();
  // No cross-site session bootstrap. Mutations still require the normal CSRF token.
  if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) return res.status(403).end();
  await pool.query('SELECT 1');
  const session = await readSession(req) ?? await createSession(req, res, user);
  noCache(res);
  return res.json({ user: session.user, csrfToken: session.csrfToken, localSandbox: true });
}
