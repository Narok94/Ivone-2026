import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { registerHooks } from 'node:module';
import express from 'express';
import { createServer } from 'node:http';

// Redirect the DB module before importing any handler: tests cannot reach Neon,
// load dotenv, read database credentials or run initialization.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './db.js' && context.parentURL?.includes('/api/')) {
    return { url: new URL('./fixtures/database.mjs', import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
const { pool } = await import('./fixtures/database.mjs');
const { default: login } = await import('../api/login.ts');
const { default: sessionHandler } = await import('../api/session.ts');
const { default: logout } = await import('../api/logout.ts');
const handlers = await Promise.all(['clients', 'sales', 'payments', 'backup'].map(async name => (await import(`../api/${name}.ts`)).default));
const auth = await import('../server/lib/session.ts');

function response() {
  return { code: 200, body: null as any, headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; return this; },
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}
function request(method = 'GET', cookie = '', csrf = '') {
  return { method, headers: { host: 'localhost:3000', origin: 'http://localhost:3000', cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: {}, query: {} } as any;
}

test('authentication, API authorization, CSRF, expiration and server-side logout without a database', async t => {
  process.env.NODE_ENV = 'test';
  delete process.env.VERCEL;
  delete process.env.AUTH_REDIS_REST_URL;
  delete process.env.AUTH_REDIS_REST_TOKEN;
  delete process.env.AUTH_APP_ORIGIN;
  const pin = String(randomBytes(4).readUInt32BE() % 10000).padStart(4, '0');
  const user = { id: randomBytes(16).toString('hex'), username: 'Test User', pin };
  let cookie = '';
  let csrf = '';

  await t.test('all business APIs reject every supported method before touching the database', async () => {
    pool.calls = [];
    for (const handler of handlers) for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      const res = response();
      await handler(request(method), res);
      assert.equal(res.code, 401);
      assert.equal(res.headers['cache-control'], 'no-store');
    }
    assert.equal(pool.calls.length, 0);
  });
  await t.test('login rejects wrong origin and malformed PIN before querying', async () => {
    pool.calls = [];
    const req = request('POST');
    req.body = { username: user.username, pin };
    req.headers.origin = 'https://attacker.invalid';
    const res = response();
    await login(req, res as any);
    assert.equal(res.code, 403);
    req.headers.origin = 'http://localhost:3000';
    req.body.pin = 'invalid';
    await login(req, res as any);
    assert.equal(res.code, 400);
    assert.equal(pool.calls.length, 0);
  });
  await t.test('unknown user and incorrect PIN have identical public errors', async () => {
    const req = request('POST');
    req.body = { username: user.username, pin };
    pool.rows = [];
    const missing = response();
    await login(req, missing as any);
    pool.rows = [{ ...user, pin: 'not a PIN' }];
    const wrong = response();
    await login(req, wrong as any);
    assert.equal(missing.code, 401);
    assert.deepEqual(missing.body, wrong.body);
  });
  await t.test('successful PIN login issues opaque HttpOnly cookie and no authentication data in JSON', async () => {
    pool.rows = [user];
    const req = request('POST');
    req.body = { username: user.username, pin };
    const res = response();
    await login(req, res as any);
    assert.equal(res.code, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.user, { id: user.id, username: user.username });
    assert.equal('pin' in res.body.user, false);
    assert.match(res.headers['set-cookie'], /HttpOnly; SameSite=Strict; Max-Age=28800/);
    cookie = res.headers['set-cookie'].split(';')[0];
    csrf = res.body.csrfToken;
    assert.match(csrf, /^[a-f0-9]{64}$/);
  });
  await t.test('session survives reload and authenticated GETs retain existing data shapes', async () => {
    for (let reload = 0; reload < 2; reload++) {
      const res = response();
      await sessionHandler(request('GET', cookie), res as any);
      assert.equal(res.code, 200);
      assert.equal(res.body.csrfToken, csrf);
    }
    pool.rows = [];
    for (const handler of handlers) {
      const res = response();
      await handler(request('GET', cookie), res);
      assert.equal(res.code, 200);
      assert.ok(Array.isArray(res.body) || res.body.version === '1.0');
    }
  });
  await t.test('all write APIs reject missing/wrong CSRF and cross-site origins before database calls', async () => {
    pool.calls = [];
    for (const handler of [...handlers, logout]) for (const method of ['POST', 'PUT', 'DELETE']) {
      if (handler === logout && method !== 'POST') continue;
      for (const token of ['', 'a'.repeat(64)]) {
        const res = response();
        await handler(request(method, cookie, token), res as any);
        assert.equal(res.code, 403);
      }
      const req = request(method, cookie, csrf);
      req.headers.origin = 'https://attacker.invalid';
      const res = response();
      await handler(req, res as any);
      assert.equal(res.code, 403);
    }
    assert.equal(pool.calls.length, 0);
    assert.ok(await auth.requireSession(request('POST', cookie, csrf), response()));
  });
  await t.test('tampered and duplicate session cookies are rejected', async () => {
    for (const value of [cookie + 'x', `${cookie}; ${cookie}`, 'ivone_session=' + 'f'.repeat(64)]) {
      const res = response();
      await sessionHandler(request('GET', value), res as any);
      assert.equal(res.code, 401);
    }
  });
  await t.test('logout revokes the session and a copied cookie no longer authorizes any API', async () => {
    const res = response();
    await logout(request('POST', cookie, csrf), res as any);
    assert.equal(res.body.success, true);
    assert.match(res.headers['set-cookie'], /Max-Age=0/);
    for (const handler of [sessionHandler, ...handlers]) {
      const blocked = response();
      await handler(request('GET', cookie), blocked as any);
      assert.equal(blocked.code, 401);
    }
  });
  await t.test('expired sessions cannot be reused', async () => {
    const res = response();
    await auth.createSession(request(), res, { id: user.id, username: user.username });
    const originalNow = Date.now;
    Date.now = () => originalNow() + 9 * 60 * 60 * 1000;
    try { assert.equal(await auth.readSession(request('GET', res.headers['set-cookie'].split(';')[0])), null); }
    finally { Date.now = originalNow; }
  });
  await t.test('same handlers work over local Express HTTP: login, reload, CSRF and revocation', async () => {
    const app = express();
    app.use(express.json());
    app.all('/api/login', login as any);
    app.all('/api/session', sessionHandler as any);
    app.all('/api/logout', logout as any);
    for (const [i, name] of ['clients', 'sales', 'payments', 'backup'].entries()) app.all(`/api/${name}`, handlers[i]);
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      pool.rows = [user];
      const loggedIn = await fetch(`${origin}/api/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, pin }) });
      assert.equal(loggedIn.status, 200);
      const cookie = loggedIn.headers.get('set-cookie')!.split(';')[0];
      const { csrfToken } = await loggedIn.json();
      const reload = await fetch(`${origin}/api/session`, { headers: { Cookie: cookie } });
      assert.equal(reload.status, 200);
      assert.equal((await reload.json()).csrfToken, csrfToken);
      pool.calls = [];
      const denied = await fetch(`${origin}/api/backup`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(denied.status, 403);
      assert.equal(pool.calls.length, 0);
      const loggedOut = await fetch(`${origin}/api/logout`, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-CSRF-Token': csrfToken } });
      assert.equal(loggedOut.status, 200);
      for (const name of ['clients', 'sales', 'payments', 'backup']) {
        assert.equal((await fetch(`${origin}/api/${name}`, { headers: { Cookie: cookie } })).status, 401);
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
  await t.test('production never falls back to memory when shared storage is absent', async () => {
    process.env.NODE_ENV = 'production';
    const req = request('POST');
    req.headers.host = 'app.invalid';
    req.headers.origin = 'https://app.invalid';
    req.body = { username: user.username, pin };
    pool.rows = [user];
    const res = response();
    await login(req, res as any);
    assert.equal(res.code, 503);
    assert.equal(res.headers['set-cookie'], undefined);
  });
  await t.test('shared REST storage: Secure cookies, independent function instance, revocation, failure closed', async () => {
    process.env.AUTH_REDIS_REST_URL = 'https://session-store.invalid';
    process.env.AUTH_REDIS_REST_TOKEN = randomBytes(32).toString('hex');
    const shared = new Map<string, string>();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, options) => {
      const [op, key, value, expiry, ttl, nx] = JSON.parse(options!.body as string);
      let result: unknown;
      if (op === 'SET') {
        assert.equal(expiry, 'EX'); assert.equal(ttl, 28800); assert.equal(nx, 'NX');
        shared.set(key, value); result = 'OK';
      } else if (op === 'GET') result = shared.get(key) || null;
      else if (op === 'DEL') result = Number(shared.delete(key));
      else throw new Error('Unexpected command');
      return Response.json({ result });
    };
    try {
      const req = request();
      req.headers.host = 'app.invalid'; req.headers.origin = 'https://app.invalid';
      const res = response();
      await auth.createSession(req, res, { id: user.id, username: user.username });
      assert.match(res.headers['set-cookie'], /^__Host-ivone_session=/);
      assert.match(res.headers['set-cookie'], /; Secure$/);
      req.headers.cookie = res.headers['set-cookie'].split(';')[0];
      const replicaPath = '../server/lib/session.ts?replica';
      const replica = await import(replicaPath);
      assert.equal((await replica.readSession(req))?.user.id, user.id);
      await replica.revokeSession(req);
      assert.equal(await auth.readSession(req), null);
      globalThis.fetch = async () => { throw new Error('private provider failure'); };
      const failed = response();
      await auth.requireSession(req, failed);
      assert.equal(failed.code, 503);
      assert.ok(!JSON.stringify(failed.body).includes('private'));
      globalThis.fetch = async () => Response.json({ result: null });
      await assert.rejects(auth.revokeSession(req), /Session storage unavailable/);
    } finally { globalThis.fetch = originalFetch; }
  });
});
