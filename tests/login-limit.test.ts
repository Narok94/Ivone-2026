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
