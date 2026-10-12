// Shared PostgreSQL authentication storage. Never provisions schema at startup.
export function localAuth() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return false;
  if (['development', 'test'].includes(process.env.NODE_ENV ?? '')) return true;
  throw new Error('Authentication environment unavailable');
}
export async function authPool() { return (await import('../../api/db.js')).pool; }
let cleanedAt = 0;
let cleaning: Promise<void> | null = null;
export async function cleanupExpiredAuth() {
  if (Date.now() - cleanedAt < 600000) return;
  cleaning ??= (async () => {
    const pool = await authPool();
    for (const [table, keys] of [['auth_sessions', 'token_hash'], ['auth_login_attempts', 'scope,key_hash']] as const) {
      await pool.query(`DELETE FROM public.${table} WHERE (${keys}) IN (SELECT ${keys} FROM public.${table} WHERE expires_at <= now() ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED)`);
    }
    cleanedAt = Date.now();
  })().finally(() => { cleaning = null; });
  await cleaning;
}
