import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpret } from '../src/lib/conversation';
import { brCents, cents, currency, lineTotal, today, validDate } from '../src/lib/finance';
import type { Client } from '../src/types';
const clients = ['Jessica', 'Maria', 'Ana'].map((name, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, fullName: name } as Client));
test('interprets the five requested Brazilian sale examples without brand dependencies', () => {
  const examples = [
    ['Venda Jessica egeo black 145,56', 0, 'egeo black', 1, 14556],
    ['Vendi um perfume Egeo Black para Jessica por 145,56', 0, 'perfume Egeo Black', 1, 14556],
    ['Jessica comprou 2 hidratantes de 35 reais', 0, 'hidratantes', 2, 3500],
    ['Maria levou uma lingerie de 80 reais', 1, 'lingerie', 1, 8000],
    ['Venda Ana 2 perfumes 120 cada', 2, 'perfumes', 2, 12000],
  ] as const;
  for (const [text, index, product, quantity, unitCents] of examples) {
    const result = interpret(text, clients);
    assert.equal(result.kind, 'sale'); assert.equal(result.clientId, clients[index].id);
    assert.equal(result.items[0].productName, product); assert.equal(result.items[0].quantity, quantity); assert.equal(result.items[0].unitCents, unitCents);
    assert.equal(result.question, undefined);
    assert.equal('receivedCents' in result, false, 'payment must never be inferred');
  }
});
test('multiple items retain exact quantities, unit prices and cents', () => {
  const result = interpret('Jessica comprou um perfume de 150 e dois hidratantes de 40 cada', clients);
  assert.equal(result.items.length, 2);
  assert.equal(result.items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unitCents!), 0), 23000);
  const implicit = interpret('Jessica comprou perfume de 150 e hidratante de 40', clients);
  assert.equal(implicit.items.length, 2); assert.equal(implicit.items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unitCents!), 0), 19000);
  const named = interpret('Venda Jessica perfume Ana de 85', clients);
  assert.equal(named.clientId, clients[0].id); assert.equal(named.items[0].productName, 'perfume Ana');
  assert.equal(interpret('Venda Jessica 212 Vip de 85', clients).needsReview, true);
});
test('names, accents, abbreviations and ambiguity require a real registered client', () => {
  assert.equal(interpret('vda Jéssica creme 15,56', clients).clientId, clients[0].id);
  const duplicate = [...clients, { ...clients[0], id: 'other', fullName: 'Jessica Silva' }];
  assert.equal(interpret('Venda Jessica perfume 85', duplicate).clientId, undefined);
  assert.equal(interpret('Venda Jessica Silva perfume 85', duplicate).clientId, 'other');
  assert.equal(interpret('Venda Jessika perfume 85', clients).clientId, undefined);
  assert.equal(interpret('Venda Jessika perfume 85', clients).candidates[0].id, clients[0].id);
  assert.equal(interpret('Venda desconhecida perfume 85', clients).clientId, undefined);
  assert.equal(interpret('Venda Jess perfume 85', clients).clientId, undefined);
});
test('missing prices, ambiguous totals, unsupported text and parcels do not invent values', () => {
  assert.equal(interpret('Venda Ana perfume', clients).items[0].unitCents, null);
  const unclear = interpret('Venda Ana 2 perfumes por 120', clients);
  assert.equal(unclear.items[0].unitCents, null); assert.equal(unclear.items[0].priceQuestion, 12000);
  assert.equal(interpret('Venda Ana 2 perfumes 120 no total', clients).items[0].unitCents, 6000);
  assert.equal(interpret('Venda Ana 3 perfumes 100 no total', clients).items[0].unitCents, null);
  assert.equal(interpret('Olá, tudo bem?', clients).kind, 'unknown');
  assert.equal(interpret('Venda Ana perfume 120 parcelado', clients).installments, true);
  const paidSale = interpret('Venda Ana perfume 120 já pagou tudo', clients); assert.equal(paidSale.kind, 'sale'); assert.equal(paidSale.items[0].unitCents, 12000); assert.equal('receivedCents' in paidSale, false);
  assert.equal(interpret('Venda Ana perfume de 1000 entrada 200', clients).items[0].unitCents, null);
  assert.equal(interpret('Venda Ana 1,5 perfumes de 120', clients).items[0].unitCents, null);
});
test('payment and actual-data query intents include an explicit report period', () => {
  assert.equal(interpret('Jessica pagou 50 reais', clients).amountCents, 5000);
  assert.equal(interpret('Quanto a Jessica deve?', clients).kind, 'balance');
  assert.equal(interpret('Mostra o extrato da Maria', clients).kind, 'statement');
  assert.equal(interpret('Quem está devendo?', clients).kind, 'pending');
  assert.equal(interpret('Quanto recebi?', clients).period, 'all');
  assert.equal(interpret('Quanto recebi neste mês?', clients).period, 'month');
});
test('Brazilian decimals and São Paulo dates preserve cents and calendar days', () => {
  assert.equal(brCents('R$ 1.000,00'), 100000); assert.equal(brCents('145,56'), 14556);
  assert.equal(cents('145.5600'), 14556); assert.throws(() => cents('1.001')); assert.throws(() => brCents('1,234'));
  assert.equal(currency(14556), 'R$ 145,56');
  const now = new Date('2026-10-12T01:00:00Z');
  assert.equal(today(now), '2026-10-11');
  assert.equal(interpret('Venda Ana creme 50 ontem', clients, now).date, '2026-10-10');
  const dated = interpret('Venda Ana creme 50 dia 10/10/2026 obs: Entregar sábado', clients, now);
  assert.equal(dated.date, '2026-10-10'); assert.equal(dated.observation, 'Entregar sábado');
  assert.equal(validDate('2026-02-30'), false);
});
