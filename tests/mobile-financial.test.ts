import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import { today } from '../src/lib/finance';
import type { DebtorPage, FinancialOverview } from '../src/lib/mobile-financial';
import { readMobileFinancial } from '../server/lib/mobile-financial';
import { executeFinancial } from '../server/lib/financial';
registerHooks({ resolve(specifier, context, next) { if (specifier === './db.js' && context.parentURL?.includes('/api/')) return { url: new URL('./fixtures/financial-database.ts', import.meta.url).href, shortCircuit: true }; return next(specifier, context); } });
const { pool, clientIds } = await import('./fixtures/financial-database');
const { default: operations } = await import('../api/operations');
const { createSession } = await import('../server/lib/session');
const response = () => ({ code: 200, body: null as any, headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v; }, status(n: number) { this.code = n; return this; }, json(v: any) { this.body = v; } });

test('mobile financial totals, authenticated bounded debtor queries and updates use exact cents', async () => {
  process.env.NODE_ENV = 'test'; for (const key of ['VERCEL', 'AUTH_REDIS_REST_URL', 'AUTH_REDIS_REST_TOKEN', 'AUTH_APP_ORIGIN']) delete process.env[key];
  const date = today(); const start = date.slice(0, 7) + '-01';
  const previous = new Date(start + 'T12:00:00Z'); previous.setUTCDate(previous.getUTCDate() - 1); const old = previous.toISOString().slice(0, 10);
  const overview = () => readMobileFinancial(pool, 'overview', '', 0, date) as Promise<FinancialOverview>;
  const debtors = (q = '', offset = 0) => readMobileFinancial(pool, 'debtors', q, offset, date) as Promise<DebtorPage>;
  const sale = async (client: string, amount: string, day: string) => (await pool.query('INSERT INTO vendas(client_id,sale_date,product_name,quantity,unit_price,total) VALUES ($1,$2,\'Fictício\',1,$3,$3) RETURNING id', [client, day, amount])).rows[0].id;
  const payment = (client: string, amount: string, day: string) => pool.query('INSERT INTO pagamentos(client_id,payment_date,amount) VALUES ($1,$2,$3)', [client, day, amount]);
  try {
    await pool.reset();
    for (const mode of ['overview', 'debtors']) { const denied = response(); await operations({ method: 'GET', headers: { host: 'app.test' }, query: { mode } }, denied); assert.equal(denied.code, 401); }
    await sale(clientIds[0], '100.11', old); const removable = await sale(clientIds[0], '50.22', date); await sale(clientIds[0], '25.33', date);
    await payment(clientIds[0], '20.01', old); await payment(clientIds[0], '10.02', date); await payment(clientIds[0], '5.03', date);
    await sale(clientIds[1], '10.00', date); await payment(clientIds[1], '20.00', date);
    await sale(clientIds[2], '5.00', date); await payment(clientIds[2], '5.00', date);
    assert.deepEqual(await overview(), { month: date.slice(0, 7), salesCents: 9055, receivedCents: 4005, pendingCents: 14060 });
    assert.deepEqual((await debtors()).clients.map(c => [c.id, c.balanceCents]), [[clientIds[0], 14060]]);
    await executeFinancial(pool, '99', { operationId: randomUUID(), confirmed: true, kind: 'delete_sale', clientId: clientIds[0], targetId: removable, date, observation: '' });
    assert.deepEqual(await overview(), { month: date.slice(0, 7), salesCents: 4033, receivedCents: 4005, pendingCents: 9038 });
    const received = await executeFinancial(pool, '99', { operationId: randomUUID(), confirmed: true, kind: 'payment', clientId: clientIds[0], amountCents: 1000, date, observation: '' });
    assert.equal((await overview()).pendingCents, 8038);
    await executeFinancial(pool, '99', { operationId: randomUUID(), confirmed: true, kind: 'edit_payment', targetId: received.paymentIds![0], clientId: clientIds[0], amountCents: 1500, date, observation: '' });
    assert.deepEqual(await overview(), { month: date.slice(0, 7), salesCents: 4033, receivedCents: 5505, pendingCents: 7538 });
    await pool.query("UPDATE clientes SET full_name='Jessica' WHERE id=$1", [clientIds[2]]); await sale(clientIds[2], '1.01', old);
    assert.equal((await debtors('Jéssica')).clients.length, 2); assert.equal(new Set((await debtors('Jessica')).clients.map(c => c.id)).size, 2);
    for (let i = 0; i < 45; i++) { const person = (await pool.query("INSERT INTO clientes(full_name) VALUES ('Fictícia ' || $1) RETURNING id", [String(i).padStart(2, '0')])).rows[0]; await sale(person.id, '0.01', old); }
    const pages = await Promise.all([debtors('', 0), debtors('', 20), debtors('', 40)]);
    assert.deepEqual(pages.map(p => p.clients.length), [20, 20, 7]); assert.equal(pages[0].hasMore, true); assert.equal(pages[2].hasMore, false);
    assert.equal(new Set(pages.flatMap(p => p.clients.map(c => c.id))).size, 47); assert.equal(pages[0].clients[0].id, clientIds[0]);
    assert.equal((await debtors('%')).clients.length, 0); await assert.rejects(debtors('', -1));
    const auth = response(); const req: any = { method: 'GET', headers: { host: 'app.test' }, query: { mode: 'overview' } }; await createSession(req, auth, { id: '99', username: 'Ivone' }); req.headers.cookie = auth.headers['Set-Cookie'].split(';')[0];
    const result = response(); await operations(req, result); assert.equal(result.code, 200); assert.equal(result.body.pendingCents, 7684);
  } finally { await pool.end(); }
});
