import { createHash } from 'node:crypto';
import { redisCommand } from './session.js';
import { LOGIN_ATTEMPT_SCRIPT } from './login-script.mjs';
const local = new Map<string, { count: number; until: number }>();
async function attempt(key: string) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.AUTH_REDIS_REST_URL || process.env.AUTH_REDIS_REST_TOKEN) {
    const value = await redisCommand(['EVAL', LOGIN_ATTEMPT_SCRIPT, 1, key, 300]);
    if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error('Login protection unavailable');
    return value as number;
  }
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? '')) throw new Error('Login protection unavailable');
  for (const [id, row] of local) if (row.until <= Date.now()) local.delete(id);
  const row = local.get(key) ?? { count: 0, until: Date.now() + 300000 };
  row.count++; local.set(key, row); return row.count;
}
export async function allowLogin(req: { headers: Record<string, string | string[] | undefined> }, username: string) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'local';
  const account = createHash('sha256').update(username.trim().toLowerCase()).digest('hex');
  const device = createHash('sha256').update(account + ':' + ip).digest('hex');
  const accountAttempts = await attempt(`ivone:login:account:${account}`);
  const deviceAttempts = await attempt(`ivone:login:device:${device}`);
  return accountAttempts <= 30 && deviceAttempts <= 10;
}
