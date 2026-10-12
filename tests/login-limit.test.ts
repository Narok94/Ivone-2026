import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { allowLogin } from '../server/lib/login-limit';
test('PIN attempts are limited per device and account and expire', async () => {
  process.env.NODE_ENV = 'test'; delete process.env.VERCEL; delete process.env.AUTH_REDIS_REST_URL; delete process.env.AUTH_REDIS_REST_TOKEN;
  const username = randomUUID();
  for (let i = 0; i < 10; i++) assert.equal(await allowLogin({ headers: {} }, username), true);
  assert.equal(await allowLogin({ headers: {} }, username), false);
  const now = Date.now; Date.now = () => now() + 301000;
  try { assert.equal(await allowLogin({ headers: {} }, username), true); } finally { Date.now = now; }
});
test('production login limit uses atomic shared Redis and fails closed', async () => {
  const original = globalThis.fetch; process.env.NODE_ENV = 'production'; process.env.AUTH_REDIS_REST_URL = 'https://redis.test.invalid'; process.env.AUTH_REDIS_REST_TOKEN = randomUUID();
  const counts = new Map<string, number>(); let malformed = false;
  globalThis.fetch = async (_url, init) => { const args = JSON.parse(init!.body as string); assert.equal(args[0], 'EVAL'); assert.equal(args[4], 300); const value = (counts.get(args[3]) ?? 0) + 1; counts.set(args[3], value); return Response.json({ result: malformed ? null : value }); };
  try {
    const username = randomUUID();
    for (let i = 0; i < 30; i++) assert.equal(await allowLogin({ headers: { 'x-forwarded-for': `192.0.2.${i}` } }, username), true);
    assert.equal(await allowLogin({ headers: { 'x-forwarded-for': '192.0.2.99' } }, username), false);
    malformed = true; await assert.rejects(allowLogin({ headers: {} }, randomUUID()));
    delete process.env.AUTH_REDIS_REST_TOKEN; await assert.rejects(allowLogin({ headers: {} }, randomUUID()));
  } finally { globalThis.fetch = original; process.env.NODE_ENV = 'test'; delete process.env.AUTH_REDIS_REST_URL; delete process.env.AUTH_REDIS_REST_TOKEN; }
});
