// Server integration only: a stub database, no Redis or Neon access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if ((specifier === './db.js' && context.parentURL?.includes('/api/')) || specifier.endsWith('/api/db.js')) return { url: new URL('./fixtures/database.mjs', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
test('normal server never bootstraps a fictitious session or permits sandbox with a non-sandbox pool', async () => {
  const saved = { ...process.env };
  const { startServer } = await import('../server.js');
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  try {
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'development';
    await assert.rejects(startServer({ sandbox: true, port: 0 }), /handlers ligados exclusivamente ao banco em memória/);
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_REDIS_REST_URL; delete process.env.AUTH_REDIS_REST_TOKEN;
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No address');
    const base = `http://127.0.0.1:${address.port}`;
    for (const endpoint of ['/api/session', '/api/operations', '/api/clients', '/api/backup']) assert.equal((await fetch(base + endpoint)).status, 401, endpoint);
    const { pool } = await import('./fixtures/database.mjs');
    assert.equal(pool.calls.length, 0); pool.fail = true;
    assert.equal((await fetch(base + '/api/session', { headers: { Cookie: `__Host-ivone_session=${'a'.repeat(64)}` } })).status, 503);
    pool.fail = false;
    assert.ok(pool.calls.every(call => String(call[0]).includes('auth_sessions')));
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
