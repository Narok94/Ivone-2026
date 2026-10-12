import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { if (specifier === './db.js' && context.parentURL?.includes('/api/')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true }; return next(specifier, context); } });
const { pool, clientIds } = await import('./fixtures/financial-database');
const { default: clients } = await import('../api/clients');
const { createSession } = await import('../server/lib/session');
const { executeFinancial } = await import('../server/lib/financial');
function response() { return { code: 200, body: null as any, headers: {} as Record<string, string>, setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; return this; }, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } }; }
test('conversational client deletion safeguards financial history without changing desktop contracts', async t => {
  process.env.NODE_ENV = 'test'; for (const name of ['VERCEL', 'AUTH_REDIS_REST_URL', 'AUTH_REDIS_REST_TOKEN', 'AUTH_APP_ORIGIN']) delete process.env[name];
  const auth = response(); const req: any = { method: 'DELETE', headers: { host: 'localhost:3000', origin: 'http://localhost:3000' }, query: {}, body: {} };
  const session = await createSession(req, auth, { id: '99', username: 'Ivone' }); req.headers.cookie = auth.headers['set-cookie'].split(';')[0]; req.headers['x-csrf-token'] = session.csrfToken;
  const remove = async (id: string, body: any) => { const res = response(); await clients({ ...req, query: { id }, body }, res); return res; };
  try {
    await t.test('a sale added after an earlier empty snapshot refuses mobile deletion without losing any rows', async () => {
      await pool.reset(); assert.equal((await pool.query('SELECT count(*)::int AS n FROM vendas WHERE client_id=$1', [clientIds[0]])).rows[0].n, 0);
      await executeFinancial(pool, '99', { operationId: randomUUID(), confirmed: true, kind: 'sale', clientId: clientIds[0], date: '2026-10-11', observation: '', receivedCents: 5000, items: [{ productName: 'Produto fictício', quantity: 1, unitCents: 10000 }] });
      const res = await remove(clientIds[0], { confirmed: true, preserveHistory: true }); assert.equal(res.code, 409);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM clientes WHERE id=$1', [clientIds[0]])).rows[0].n, 1); assert.equal((await pool.query('SELECT count(*)::int AS n FROM vendas')).rows[0].n, 1); assert.equal((await pool.query('SELECT count(*)::int AS n FROM pagamentos')).rows[0].n, 1);
    });
    await t.test('an unlinked client still requires explicit confirmation before deleting', async () => {
      const person = (await pool.query("INSERT INTO clientes (full_name) VALUES ('Sem lançamentos fictícia') RETURNING id")).rows[0];
      assert.equal((await remove(person.id, { preserveHistory: true })).code, 400); assert.equal((await remove(person.id, { confirmed: true, preserveHistory: true })).code, 200); assert.equal((await pool.query('SELECT count(*)::int AS n FROM clientes WHERE id=$1', [person.id])).rows[0].n, 0);
    });
    await t.test('existing desktop deletion request shape is unchanged in an isolated database', async () => {
      const person = (await pool.query("INSERT INTO clientes (full_name) VALUES ('Desktop fictícia') RETURNING id")).rows[0];
      assert.equal((await remove(person.id, { confirmed: true })).code, 200);
    });
  } finally { await pool.end(); }
});
