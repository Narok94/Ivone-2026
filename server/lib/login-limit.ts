import { createHash } from 'node:crypto';
import { authPool, cleanupExpiredAuth, localAuth } from './auth-store.js';
const local = new Map<string, { count: number; until: number }>();
async function attempt(key: string) {
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
  let accountAttempts: number; let deviceAttempts: number;
  if (localAuth()) {
    accountAttempts = await attempt(`account:${account}`); deviceAttempts = await attempt(`device:${device}`);
  } else {
    await cleanupExpiredAuth();
    const db = await (await authPool()).connect();
    let failed = false;
    try {
      await db.query('BEGIN');
      const counts: number[] = [];
      for (const [scope, hash] of [['account', account], ['device', device]]) {
        const row = (await db.query(`INSERT INTO public.auth_login_attempts (scope,key_hash) VALUES ($1,$2)
          ON CONFLICT (scope,key_hash) DO UPDATE SET
          attempts=CASE WHEN auth_login_attempts.expires_at<=now() THEN 1 ELSE least(auth_login_attempts.attempts,2147483646)+1 END,
          window_started_at=CASE WHEN auth_login_attempts.expires_at<=now() THEN now() ELSE auth_login_attempts.window_started_at END,
          expires_at=CASE WHEN auth_login_attempts.expires_at<=now() THEN now()+interval '5 minutes' ELSE auth_login_attempts.expires_at END
          RETURNING attempts`, [scope, hash])).rows[0];
        if (!row || !Number.isSafeInteger(row.attempts) || row.attempts < 1) throw new Error('Login protection unavailable');
        counts.push(row.attempts);
      }
      await db.query('COMMIT'); [accountAttempts, deviceAttempts] = counts;
    } catch (error) { failed = true; try { await db.query('ROLLBACK'); } catch {} throw error; }
    finally { db.release(failed ? new Error('Authentication transaction failed') : undefined); }
  }
  return accountAttempts <= 30 && deviceAttempts <= 10;
}
