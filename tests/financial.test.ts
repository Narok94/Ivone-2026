import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool, clientIds } from './fixtures/financial-database';
import { executeFinancial, readFinancialSnapshot, validateOperation } from '../server/lib/financial';
import type { FinancialOperation } from '../src/lib/finance';
const sale = (overrides: Partial<FinancialOperation> = {}): FinancialOperation => ({ operationId: randomUUID(), confirmed: true, kind: 'sale', clientId: clientIds[0], date: '2026-10-11', observation: '', receivedCents: 0, items: [{ productName: 'Perfume', productCode: '', quantity: 1, unitCents: 15000 }, { productName: 'Hidratante', productCode: '', quantity: 2, unitCents: 4000 }], ...overrides });
test('financial transactions on isolated PostgreSQL, never Neon', async t => {
  try {
    await t.test('explicit confirmation and valid values are mandatory before opening a connection', async () => {
      const count = pool.connectCount;
      for (const invalid of [{ ...sale(), confirmed: false }, { ...sale(), date: '2026-02-30' }, { ...sale(), items: [{ productName: '', quantity: 1, unitCents: 15000 }] }, { ...sale(), receivedCents: 23001 }, { ...sale(), items: [{ productName: 'Produto', quantity: 1.5, unitCents: 15000 }] }, { ...sale(), items: [{ productName: 'Produto', quantity: 2, unitCents: NaN }] }]) await assert.rejects(executeFinancial(pool, '99', invalid));
      assert.equal(pool.connectCount, count);
      assert.throws(() => validateOperation({ ...sale(), items: [] }));
    });
    await t.test('multi-product sale saves all items and server-calculated totals', async () => {
      await pool.reset(); const result = await executeFinancial(pool, '99', { ...sale(), total: 1 });
      assert.equal(result.sales.length, 2); assert.equal(result.balanceCents, 23000);
      assert.deepEqual(result.sales.map(s => s.total).sort((a, b) => a - b), [80, 150]);
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM operacoes_financeiras')).rows[0].count, 1);
    });
    await t.test('partial payment saves sale and receipt atomically with exact remaining balance', async () => {
      await pool.reset(); const result = await executeFinancial(pool, '99', sale({ items: [{ productName: 'Pedido', productCode: '', quantity: 1, unitCents: 100000 }], receivedCents: 20000 }));
      assert.equal(result.sales[0].total, 1000); assert.equal(result.payments[0].amount, 200); assert.equal(result.balanceCents, 80000);
    });
    await t.test('full payment and later payment update the same client balance', async () => {
      await pool.reset(); const full = await executeFinancial(pool, '99', sale({ receivedCents: 23000 })); assert.equal(full.balanceCents, 0);
      const unpaid = await executeFinancial(pool, '99', sale()); assert.equal(unpaid.balanceCents, 23000);
      const paid = await executeFinancial(pool, '99', { operationId: randomUUID(), confirmed: true, kind: 'payment', clientId: clientIds[0], date: '2026-10-11', observation: '', amountCents: 5000 }); assert.equal(paid.balanceCents, 18000);
    });
    await t.test('failure in a later item rolls back earlier items, payments and receipt', async () => {
      await pool.reset(); pool.fail = 'Falhar';
      await assert.rejects(executeFinancial(pool, '99', sale({ receivedCents: 2000, items: [{ productName: 'Perfume', productCode: '', quantity: 1, unitCents: 15000 }, { productName: 'Falhar', productCode: '', quantity: 2, unitCents: 4000 }] })));
      pool.fail = null; const snapshot = await readFinancialSnapshot(pool); assert.deepEqual(snapshot.sales, []); assert.deepEqual(snapshot.payments, []);
      assert.equal((await pool.query('SELECT count(*)::int AS count FROM operacoes_financeiras')).rows[0].count, 0);
    });
    await t.test('receipt failure also rolls back the complete order and receipt', async () => {
      await pool.reset(); const discarded = pool.discardedConnections; pool.fail = 'INSERT INTO operacoes_financeiras'; await assert.rejects(executeFinancial(pool, '99', sale({ receivedCents: 2000 })));
      assert.equal(pool.discardedConnections, discarded + 1);
      pool.fail = null; assert.equal((await readFinancialSnapshot(pool)).sales.length, 0);
    });
    await t.test('lost response, double confirmation and concurrent retries create only one order', async () => {
      await pool.reset(); const operation = sale({ receivedCents: 5000 });
      const results = await Promise.all([executeFinancial(pool, '99', operation), executeFinancial(pool, '99', operation), executeFinancial(pool, '99', operation)]);
      assert.equal(results.filter(r => !r.replayed).length, 1);
      const retry = await executeFinancial(pool, '99', operation); assert.equal(retry.replayed, true); assert.equal(retry.sales.length, 2); assert.equal(retry.payments.length, 1); assert.equal(retry.balanceCents, 18000);
      await assert.rejects(executeFinancial(pool, '99', { ...operation, receivedCents: 6000 }), /outros dados/);
      await assert.rejects(executeFinancial(pool, 'another-user', operation), /outros dados/);
    });
    await t.test('edits and deletes do not permit replay to resurrect deleted records', async () => {
      await pool.reset(); const operation = sale(); const saved = await executeFinancial(pool, '99', operation); const targetId = saved.saleIds![0];
      await executeFinancial(pool, '99', sale({ kind: 'edit_sale', targetId, clientId: clientIds[1], items: [{ productName: 'Corrigido', productCode: '', quantity: 2, unitCents: 14556 }] }));
      const removed = await executeFinancial(pool, '99', { ...sale(), kind: 'delete_sale', targetId, clientId: clientIds[1] }); assert.equal(removed.sales.some(s => s.id === targetId), false);
      const retried = await executeFinancial(pool, '99', operation); assert.equal(retried.replayed, true); assert.equal(retried.sales.some(s => s.id === targetId), false);
    });
    await t.test('overpayments require explicit credit confirmation and clients must exist', async () => {
      await pool.reset(); const payment = { ...sale(), kind: 'payment' as const, amountCents: 5000 };
      await assert.rejects(executeFinancial(pool, '99', payment), /crédito/);
      assert.equal((await executeFinancial(pool, '99', { ...payment, allowCredit: true })).balanceCents, -5000);
      await assert.rejects(executeFinancial(pool, '99', sale({ clientId: randomUUID() })), /Cliente não encontrada/);
    });
  } finally { await pool.end(); }
});
