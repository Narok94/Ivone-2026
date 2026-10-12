import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if ((specifier === './db.js' && context.parentURL?.includes('/api/')) || specifier.endsWith('/api/db.js')) return { url: new URL('./fixtures/auth-database.ts', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { pool } = await import('./fixtures/auth-database.js');
const auth = await import('../server/lib/session.js');
const { allowLogin } = await import('../server/lib/login-limit.js');
const { cleanupExpiredAuth } = await import('../server/lib/auth-store.js');
const { default: login } = await import('../api/login.js');
const { default: logout } = await import('../api/logout.js');
const { pin } = await import('./fixtures/financial-database.js');
const { verifyAuthAndFinancialSchema } = await import('../scripts/auth-schema.mjs');
const res = () => ({ code: 200, body: null as any, headers: {} as Record<string,string>, setHeader(k: string,v: string) { this.headers[k.toLowerCase()] = v; }, status(n: number) { this.code = n; return this; }, json(v: any) { this.body = v; } });
const request = (cookie = '', csrf = ''): any => ({ method: 'GET', headers: { host: 'app.test', origin: 'https://app.test', cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: {}, query: {} });
test('Neon production authentication with prepared SQL, without real connections', async t => {
  process.env.NODE_ENV = 'production'; delete process.env.VERCEL; delete process.env.AUTH_APP_ORIGIN;
  process.env.AUTH_REDIS_REST_URL = 'https://forbidden.invalid'; process.env.AUTH_REDIS_REST_TOKEN = 'obsolete-and-unused';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('External network forbidden'); };
  try {
    await t.test('SQL 001/002 match release schema and preserve business fixtures', async () => {
      await verifyAuthAndFinancialSchema(pool);
      await assert.rejects(verifyAuthAndFinancialSchema({ query: (sql: string, args: any[]) => sql.includes('has_table_privilege') ? Promise.resolve({ rows: [{ allowed: false }] }) : pool.query(sql, args) }), /Permissão/);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM vendas')).rows[0].n, 0);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM clientes')).rows[0].n, 3);
    });
    await t.test('login, hashed session, Secure cookie, replica reload, CSRF, rotation and logout', async () => {
      const req = request(); req.method = 'POST'; req.body = { username: 'Ivone', pin };
      const result = res(); await login(req, result as any); assert.equal(result.code, 200);
      const cookie = result.headers['set-cookie'].split(';')[0];
      assert.match(result.headers['set-cookie'], /^__Host-ivone_session=.*HttpOnly; SameSite=Strict; Max-Age=28800; Secure$/);
      const token = cookie.split('=')[1];
      const row = (await pool.query('SELECT * FROM public.auth_sessions')).rows[0];
      assert.equal(row.token_hash, createHash('sha256').update(token).digest('hex')); assert.notEqual(row.token_hash, token);
      assert.equal('pin' in result.body.user, false);
      const replicaPath = '../server/lib/session.ts?neon-replica';
      const replica = await import(replicaPath);
      assert.equal((await replica.readSession(request(cookie)))?.user.id, '99');
      const blocked = res(); const write = request(cookie, 'f'.repeat(64)); write.method = 'POST';
      assert.equal(await auth.requireSession(write, blocked), null); assert.equal(blocked.code, 403);
      write.headers['x-csrf-token'] = result.body.csrfToken; write.headers.origin = 'https://attacker.test';
      const cross = res(); assert.equal(await auth.requireSession(write, cross), null); assert.equal(cross.code, 403);
      const rotated = res(); await auth.createSession(request(cookie), rotated, { id: 99, username: 'Ivone' });
      assert.equal(await replica.readSession(request(cookie)), null);
      const newCookie = rotated.headers['set-cookie'].split(';')[0];
      const exit = request(newCookie, (await auth.readSession(request(newCookie)))!.csrfToken); exit.method='POST';
      const exited = res(); await logout(exit, exited as any); assert.equal(exited.code, 200); assert.match(exited.headers['set-cookie'], /Max-Age=0/);
      assert.equal(await auth.readSession(request(newCookie)), null);
    });
    await t.test('absolute expiry is enforced before cleanup; reads never extend it', async () => {
      const result=res(); await auth.createSession(request(),result,{id:99,username:'Ivone'}); const cookie=result.headers['set-cookie'].split(';')[0];
      const before=await auth.readSession(request(cookie)); assert.equal((await auth.readSession(request(cookie)))!.expiresAt,before!.expiresAt);
      await pool.query("UPDATE auth_sessions SET created_at=now()-interval '9 hours',expires_at=now()-interval '1 hour'");
      assert.equal(await auth.readSession(request(cookie)),null);
    });
    await t.test('Vercel always uses PostgreSQL even with development NODE_ENV', async () => {
      process.env.NODE_ENV='development'; process.env.VERCEL='1';
      try {
        const result=res(); await auth.createSession(request(),result,{id:99,username:'Ivone'});
        assert.match(result.headers['set-cookie'], /^__Host-ivone_session=/);
        const cookie=result.headers['set-cookie'].split(';')[0];
        assert.equal((await auth.readSession(request(cookie)))!.user.id,'99');
        await auth.revokeSession(request(cookie));
      } finally { process.env.NODE_ENV='production'; delete process.env.VERCEL; }
    });
    await t.test('unconfigured environment cannot authorize via memory or issue a cookie', async () => {
      delete process.env.NODE_ENV;
      try {
        const result=res(); await assert.rejects(auth.createSession(request(),result,{id:99,username:'Ivone'}), /environment unavailable/);
        assert.equal(result.headers['set-cookie'],undefined);
        await assert.rejects(allowLogin({headers:{}},randomUUID()), /environment unavailable/);
      } finally { process.env.NODE_ENV='production'; }
    });
    await t.test('concurrent device/account limits, fixed window reset and integer saturation', async () => {
      const name=randomUUID(); const req={headers:{'x-forwarded-for':'192.0.2.1'}};
      const values=await Promise.all(Array.from({length:12},()=>allowLogin(req,name)));
      assert.equal(values.filter(Boolean).length,10);
      const account=createHash('sha256').update(name).digest('hex');
      const before=(await pool.query("SELECT expires_at FROM auth_login_attempts WHERE scope='account' AND key_hash=$1",[account])).rows[0].expires_at;
      await allowLogin(req,name);
      assert.deepEqual((await pool.query("SELECT expires_at FROM auth_login_attempts WHERE scope='account' AND key_hash=$1",[account])).rows[0].expires_at,before);
      await pool.query("UPDATE auth_login_attempts SET window_started_at=now()-interval '10 minutes',expires_at=now()-interval '5 minutes'");
      assert.equal(await allowLogin(req,name),true);
      const other=randomUUID(); for(let i=0;i<30;i++) assert.equal(await allowLogin({headers:{'x-forwarded-for':`192.0.2.${i}`}},other),true);
      assert.equal(await allowLogin({headers:{'x-forwarded-for':'192.0.2.99'}},other),false);
      await pool.query('UPDATE auth_login_attempts SET attempts=2147483647');
      assert.equal(await allowLogin(req,name),false);
    });
    await t.test('bounded cleanup removes only expired authentication rows', async () => {
      await pool.query("INSERT INTO auth_sessions (token_hash,user_id,username,csrf_token,created_at,expires_at) SELECT lpad(to_hex(n),64,'0'),'99','Ivone',repeat('a',64),now()-interval '9 hours',now()-interval '1 hour' FROM generate_series(1,150) n");
      const count=(await pool.query('SELECT count(*)::int AS n FROM auth_sessions')).rows[0].n;
      const now=Date.now; Date.now=()=>now()+601000;
      try { await cleanupExpiredAuth(); } finally { Date.now=now; }
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM auth_sessions')).rows[0].n,count-100);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM clientes')).rows[0].n,3);
    });
    await t.test('partial counter failure rolls back; outages and missing schema fail closed', async () => {
      const name=randomUUID(); pool.fail='device'; await assert.rejects(allowLogin({headers:{}},name)); pool.fail=null;
      const account=createHash('sha256').update(name).digest('hex'); assert.equal((await pool.query("SELECT count(*)::int AS n FROM auth_login_attempts WHERE key_hash=$1",[account])).rows[0].n,0);
      pool.fail='auth_sessions'; const denied=res(); await auth.requireSession(request('__Host-ivone_session='+'a'.repeat(64)),denied); assert.equal(denied.code,503);
      await assert.rejects(auth.createSession(request(),res(),{id:99,username:'Ivone'}));
      await assert.rejects(auth.revokeSession(request('__Host-ivone_session='+'a'.repeat(64)))); pool.fail=null;
      // Missing migration simulated only in the disposable in-memory fixture.
      await pool.query('ALTER TABLE auth_login_attempts RENAME TO unavailable_attempts');
      const req=request(); req.method='POST'; req.body={username:'Ivone',pin}; const rejected=res(); await login(req,rejected as any);
      assert.equal(rejected.code,503); assert.equal(rejected.headers['set-cookie'],undefined);
      await assert.rejects(verifyAuthAndFinancialSchema(pool));
    });
  } finally { pool.fail=null; globalThis.fetch=originalFetch; await pool.end(); }
});
