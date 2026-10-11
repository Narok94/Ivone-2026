import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface Session {
  user: { id: string; username: string };
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
const keyFor = (token: string) => `ivone:session:${createHash('sha256').update(token).digest('hex')}`;

async function command(parts: (string | number)[]) {
  const url = process.env.AUTH_REDIS_REST_URL;
  const token = process.env.AUTH_REDIS_REST_TOKEN;
  if (!url || !token || new URL(url).protocol !== 'https:') throw new Error('Session storage unavailable');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts), signal: AbortSignal.timeout(5000), redirect: 'error',
  });
  if (!response.ok) throw new Error('Session storage unavailable');
  const body = await response.json() as { result?: unknown; error?: string };
  if (!body || body.error || !Object.hasOwn(body, 'result')) throw new Error('Session storage unavailable');
  if (parts[0] === 'GET' && body.result !== null && typeof body.result !== 'string') throw new Error('Session storage unavailable');
  if (parts[0] === 'DEL' && body.result !== 0 && body.result !== 1) throw new Error('Session storage unavailable');
  return body.result;
}
function useLocalStore() {
  if (process.env.AUTH_REDIS_REST_URL || process.env.AUTH_REDIS_REST_TOKEN) return false;
  // Memory is restricted to one local development/test process, never Vercel.
  if (production() || !['development', 'test'].includes(process.env.NODE_ENV || '')) throw new Error('Session storage unavailable');
  return true;
}
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
  const raw = useLocalStore() ? localSessions.get(key) : await command(['GET', key]);
  const session: Session | undefined = typeof raw === 'string' ? JSON.parse(raw) : raw as Session | undefined;
  if (!session || !session.user?.id || !session.user?.username || !/^[a-f0-9]{64}$/.test(session.csrfToken) || !(session.expiresAt > Date.now())) {
    if (useLocalStore()) localSessions.delete(key);
    return null;
  }
  return session;
}
export async function revokeSession(req: Request) {
  const token = sessionToken(req);
  if (!token) return;
  const key = keyFor(token);
  if (useLocalStore()) localSessions.delete(key);
  else await command(['DEL', key]);
}
export async function createSession(req: Request, res: Response, user: Session['user']) {
  const token = randomBytes(32).toString('hex');
  const session: Session = { user, csrfToken: randomBytes(32).toString('hex'), expiresAt: Date.now() + lifetime * 1000 };
  await revokeSession(req);
  const key = keyFor(token);
  if (useLocalStore()) {
    for (const [id, existing] of localSessions) if (existing.expiresAt <= Date.now()) localSessions.delete(id);
    localSessions.set(key, session);
  } else {
    if (await command(['SET', key, JSON.stringify(session), 'EX', lifetime, 'NX']) !== 'OK') throw new Error('Session storage unavailable');
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
