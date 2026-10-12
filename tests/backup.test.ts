import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { if (specifier === './db.js' && context.parentURL?.includes('/api/')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true }; return next(specifier, context); } });
const { pool, clientIds, pin } = await import('./fixtures/financial-database');
const { default: backup } = await import('../api/backup');
const { createSession } = await import('../server/lib/session');
const { executeFinancial } = await import('../server/lib/financial');
const { validateBackup } = await import('../server/lib/backup');
function response() { return { code: 200, body: null as any, headers: {} as Record<string,string>, setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; return this; }, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } }; }
test('recoverable backups and restores run only on isolated PostgreSQL', async t => {
  process.env.NODE_ENV = 'test'; for (const name of ['VERCEL','AUTH_REDIS_REST_URL','AUTH_REDIS_REST_TOKEN','AUTH_APP_ORIGIN']) delete process.env[name];
  const auth = response(); const req: any = { method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000' }, body: {}, query: {} };
  const session = await createSession(req, auth, { id: '99', username: 'Ivone' });
  req.headers.cookie = auth.headers['set-cookie'].split(';')[0]; req.headers['x-csrf-token'] = session.csrfToken;
  const order = () => ({ operationId: randomUUID(), confirmed: true, kind: 'sale', clientId: clientIds[0], date: '2026-10-11', observation: '', receivedCents: 2000, items: [{ productName: 'Produto fictício', productCode: '', quantity: 2, unitCents: 10000 }] });
  const get = async () => { const result = response(); await backup({ ...req, method: 'GET' }, result); assert.equal(result.code, 200); return result.body; };
  const post = async (body: any) => { const result = response(); await backup({ ...req, body }, result); return result; };
  try {
    await t.test('invalid/incomplete backups and missing confirmation cannot erase any data', async () => {
      await pool.reset(); await executeFinancial(pool, '99', order());
      const before = pool.connectCount;
      assert.equal((await post({})).code, 400);
      assert.equal((await post({ confirmed: true, restoreId: randomUUID(), data: { clients: [] } })).code, 400);
      assert.equal(pool.connectCount, before);
      assert.throws(() => validateBackup({ clients: [], sales: [{ id: randomUUID() }], payments: [] }));
    });
    await t.test('snapshot exports every financial row and receipt with counts, IDs and no authentication secrets', async () => {
      const snapshot = await get(); assert.equal(snapshot.version, '2.0'); assert.equal(snapshot.counts.sales, 1); assert.equal(snapshot.counts.payments, 1); assert.equal(snapshot.counts.operations, 1);
      assert.equal(snapshot.data.sales[0].client_id, clientIds[0]); assert.match(snapshot.fingerprint, /^[a-f\d]{64}$/);
      assert.equal('usuarios' in snapshot.data, false); assert.doesNotMatch(JSON.stringify(snapshot), /"(?:pin|token|csrfToken|password)"/i);
      validateBackup(snapshot);
    });
    await t.test('changes after the pre-restore backup refuse restoration before deleting anything', async () => {
      const snapshot = await get(); await executeFinancial(pool, '99', order());
      const result = await post({ confirmed: true, restoreId: randomUUID(), backupFingerprint: snapshot.fingerprint, data: snapshot.data });
      assert.equal(result.code, 409); assert.equal((await get()).counts.sales, 2);
    });
    await t.test('failure during restore rolls back all rows and preserves users', async () => {
      const snapshot = await get(); const data = JSON.parse(JSON.stringify(snapshot.data)); data.sales[0].product_name = 'Falha-restauracao';
      pool.fail = 'Falha-restauracao'; const result = await post({ confirmed: true, restoreId: randomUUID(), backupFingerprint: snapshot.fingerprint, data }); pool.fail = null;
      assert.equal(result.code, 503); assert.equal((await get()).counts.sales, 2); assert.equal((await pool.query('SELECT pin FROM usuarios WHERE id=99')).rows[0].pin, pin);
    });
    await t.test('restoration preserves original IDs, receipts and login; retries never erase later changes', async () => {
      const original = await get(); const data = JSON.parse(JSON.stringify(original.data)); data.sales = data.sales.slice(0,1); data.payments = data.payments.slice(0,1);
      const restoreId = randomUUID(); const body = { confirmed: true, restoreId, backupFingerprint: original.fingerprint, data };
      const first = await post(body); assert.equal(first.code, 200); const restored = await get(); assert.equal(restored.counts.sales, 1); assert.equal(restored.data.sales[0].id, data.sales[0].id); assert.ok(restored.counts.operations >= original.counts.operations);
      await executeFinancial(pool, '99', order()); const retry = await post(body); assert.equal(retry.code, 200); assert.equal(retry.body.replayed, true); assert.equal((await get()).counts.sales, 2); assert.equal((await pool.query('SELECT pin FROM usuarios WHERE id=99')).rows[0].pin, pin);
    });
  } finally { await pool.end(); }
});
