import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balance, demoRequested, initialEntries, money, parseEntry } from '../src/demo/chat';

test('demo parses fictitious sales/payments with exact cents and rejects ambiguous entries', () => {
  assert.deepEqual(parseEntry('Venda Ana perfume 85,90'), { kind: 'sale', client: 'Ana', description: 'perfume', cents: 8590 });
  assert.equal(parseEntry('Recebimento bia pagamento 95')?.cents, 9500);
  for (const value of ['Venda Cliente perfume 85', 'Venda Ana perfume -5', 'Venda Ana perfume 0', 'Venda Ana perfume 1,999', 'Venda Ana perfume 999999999999']) assert.equal(parseEntry(value), null);
  assert.equal(balance(initialEntries, 'Ana'), 8000);
  assert.equal(balance([...initialEntries, { kind: 'payment', client: 'Ana', description: 'Total', cents: 8000 }], 'Ana'), 0);
  assert.equal(balance([...initialEntries, { kind: 'payment', client: 'Ana', description: 'Parcial', cents: 2000 }], 'Ana'), 6000);
  assert.equal(money(8590), 'R$ 85,90');
});
test('desktop management and explicit mobile management retain the authenticated application', () => {
  assert.equal(demoRequested('/', '', false), false);
  assert.equal(demoRequested('/', '', true), true);
  assert.equal(demoRequested('/', '?modo=gestao', true), false);
  assert.equal(demoRequested('/demo', '', false), true);
});
