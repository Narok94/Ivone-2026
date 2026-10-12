import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { authPool, cleanupExpiredAuth, localAuth } from './auth-store.js';

export interface Session {
  user: { id: string | number; username: string };
  csrfToken: string;
  expiresAt: number;
}
type Request = { method?: string; headers: Record<string, string | string[] | undefined> };
type Response = { setHeader: (name: string, value: string) => unknown; status: (code: number) => Response; json: (body: unknown) => unknown };
const lifetime = 8 * 60 * 60;
const localSessions = new Map<string, Session>();
const production = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const cookieName = () => production() ? '__Host-ivone_session' : 'ivone_session';
const header = (req: Request, name: string) => typeof req.headers[name] === 'string' ? req.headers[name] as string : '';
const keyFor = (token: string) => createHash('sha256').update(token).digest('hex');

function sessionToken(req: Request) {
  const matches = header(req, 'cookie').split(';').map(part => part.trim()).filter(part => part.startsWith(`${cookieName()}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(cookieName().length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function setCookie(res: Response, token: string, age: number) {
  res.setHeader('Set-Cookie', `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production() ? '; Secure' : ''}`);
}
export function noCache(res: Response) { res.setHeader('Cache-Control', 'no-store'); }
export function sameOrigin(req: Request) {
  const origin = header(req, 'origin');
  const host = header(req, 'host');
  const expected = process.env.AUTH_APP_ORIGIN || `${production() ? 'https' : 'http'}://${host}`;
  try {
    if (!host || !origin || new URL(origin).origin !== origin || origin !== new URL(expected).origin) return false;
    const site = header(req, 'sec-fetch-site');
    return !site || site === 'same-origin';
  } catch { return false; }
}
export async function readSession(req: Request): Promise<Session | null> {
  const token = sessionToken(req);
  if (!token) return null;
  const key = keyFor(token);
  let session: Session | undefined;
  if (localAuth()) session = localSessions.get(key);
  else {
    const row = (await (await authPool()).query('SELECT user_id,username,csrf_token,floor(extract(epoch FROM expires_at)*1000)::text AS expires_at_ms FROM public.auth_sessions WHERE token_hash=$1 AND expires_at>now()', [key])).rows[0];
    if (row) session = { user: { id: row.user_id, username: row.username }, csrfToken: row.csrf_token, expiresAt: Number(row.expires_at_ms) };
  }
  const validUser = session?.user && ((typeof session.user.id === 'string' && session.user.id.length > 0 && session.user.id.length <= 100) || (typeof session.user.id === 'number' && Number.isSafeInteger(session.user.id) && session.user.id > 0)) && typeof session.user.username === 'string' && session.user.username.length > 0 && session.user.username.length <= 100;
  if (!session || !validUser || typeof session.csrfToken !== 'string' || !/^[a-f0-9]{64}$/.test(session.csrfToken) || !Number.isSafeInteger(session.expiresAt) || !(session.expiresAt > Date.now())) {
    if (localAuth()) localSessions.delete(key);
    return null;
  }
  return session;
}
export async function revokeSession(req: Request) {
  const token = sessionToken(req);
  if (!token) return;
  const key = keyFor(token);
  if (localAuth()) localSessions.delete(key);
  else await (await authPool()).query('DELETE FROM public.auth_sessions WHERE token_hash=$1', [key]);
}
export async function createSession(req: Request, res: Response, user: Session['user']) {
  const token = randomBytes(32).toString('hex');
  const session: Session = { user, csrfToken: randomBytes(32).toString('hex'), expiresAt: Date.now() + lifetime * 1000 };
  await revokeSession(req);
  const key = keyFor(token);
  if (localAuth()) {
    for (const [id, existing] of localSessions) if (existing.expiresAt <= Date.now()) localSessions.delete(id);
    localSessions.set(key, session);
  } else {
    await cleanupExpiredAuth();
    const row = (await (await authPool()).query('INSERT INTO public.auth_sessions (token_hash,user_id,username,csrf_token) VALUES ($1,$2,$3,$4) RETURNING floor(extract(epoch FROM expires_at)*1000)::text AS expires_at_ms', [key, String(user.id), user.username, session.csrfToken])).rows[0];
    if (!row || !Number.isSafeInteger(Number(row.expires_at_ms))) throw new Error('Session storage unavailable');
    session.expiresAt = Number(row.expires_at_ms);
  }
  setCookie(res, token, lifetime);
  noCache(res);
  return session;
}
export function clearCookie(res: Response) { setCookie(res, '', 0); }
export async function requireSession(req: Request, res: Response): Promise<Session | null> {
  noCache(res);
  try {
    const session = await readSession(req);
    if (!session) {
      clearCookie(res);
      res.status(401).json({ success: false, message: 'Sessão expirada. Entre novamente. 🌸' });
      return null;
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
      const csrf = header(req, 'x-csrf-token');
      if (!sameOrigin(req) || !/^[a-f0-9]{64}$/.test(csrf) || !timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrfToken))) {
        res.status(403).json({ success: false, message: 'Requisição não autorizada.' });
        return null;
      }
    }
    return session;
  } catch {
    res.status(503).json({ success: false, message: 'Autenticação temporariamente indisponível.' });
    return null;
  }
}
