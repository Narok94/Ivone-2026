import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Client } from '../src/types';
import { parseChatSale, parseChatDate, transition, type Reply, type Snapshot, type State } from '../src/lib/mobile-conversation';
const maria = { id: '00000000-0000-4000-8000-000000000001', fullName: 'Maria', phone: '', email: '', cpf: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', observation: '' } satisfies Client;
const snapshot: Snapshot = { clients: [maria], sales: [], payments: [] };
const idle: State = { type: 'idle' };

test('client menu preserves selection, consumes a complete sale and writes only on confirmation', () => {
  const data = { ...snapshot, clients: [maria, { ...maria, id: 'other', fullName: 'Maria Silva' }] };
  let r = transition(idle, 'Maria', data); assert.equal(r.state.type, 'choose');
  r = transition(r.state, '2', data); assert.equal(r.state.selectedClientId, 'other');
  assert.deepEqual(r.choices, ['Nova venda', 'Ver saldo', 'Extrato', 'Recebimento', 'Editar cadastro', 'Voltar']);
  r = transition(r.state, 'Nova venda', data); assert.equal(r.state.type, 'finance');
  r = transition(r.state, '2 perfumes a 150 cada, ela pagou 100', data);
  assert.equal(r.action, undefined); assert.match(r.summary!, /Maria Silva/); assert.match(r.summary!, /300,00/); assert.match(r.summary!, /100,00/);
  assert.ok(r.choices.includes('Confirmar venda')); assert.equal(transition(r.state, 'Confirmar venda', data).action?.type, 'financial');
  assert.equal(transition(r.state, 'Cancelar', data).action, undefined);
});

test('balance queries and missing balance clients never offer registration or mutate the snapshot', () => {
  const before = structuredClone(snapshot);
  for (const text of ['Quanto a Maria deve?', 'Saldo da Maria']) {
    const r = transition(idle, text, { ...snapshot, remoteSearch: true });
    assert.equal(r.action?.type, 'searchClients'); if (r.action?.type === 'searchClients') assert.equal(r.action.query, 'Maria');
  }
  const r = transition({ type: 'idle', selectedClientId: maria.id }, 'Quanto falta pagar?', snapshot);
  assert.match(r.text, /Saldo pendente/); assert.equal(r.action, undefined); assert.deepEqual(snapshot, before);
});

test('client follow-up offers explicit navigation and exits clear context without touching history', () => {
  const before = structuredClone(snapshot);
  for (const query of ['Ver saldo', 'Extrato']) {
    const menu = transition(idle, 'Maria', snapshot);
    const consulted = transition(menu.state, query, snapshot);
    assert.equal(consulted.state.type, 'followUp'); assert.match(consulted.text, /Deseja fazer mais alguma coisa\?/);
    assert.deepEqual(consulted.choices, ['Outra operação com esta cliente', 'Escolher outra cliente', 'Encerrar']);
    const reopened = transition(consulted.state, consulted.choices[0], snapshot); assert.equal(reopened.state.type, 'clientMenu');
    for (const exit of ['Voltar', 'Cancelar', 'Encerrar']) {
      const closed = transition(consulted.state, exit, snapshot); assert.equal(closed.state.type, 'idle'); assert.equal(closed.state.selectedClientId, null);
      assert.equal(transition(closed.state, 'Nova venda', snapshot).state.type, 'choose');
    }
    for (const change of ['Outra cliente', 'Escolher outra cliente']) { const next = transition(consulted.state, change, snapshot); assert.equal(next.state.type, 'choose'); assert.equal(next.state.selectedClientId, null); }
  }
  const edit = transition(transition(idle, 'Maria', snapshot).state, 'Editar cadastro', { ...snapshot, remoteSearch: true });
  assert.equal(edit.action?.type, 'openClientForm');
  const payment = transition(transition(idle, 'Maria', snapshot).state, 'Recebimento', snapshot); assert.equal(payment.state.type, 'finance');
  if (payment.state.type === 'finance') assert.equal(payment.state.draft.value.clientId, maria.id);
  assert.deepEqual(snapshot, before);
});
test('guided product names overlapping query keywords keep a valid draft and ask for quantity', () => {
  let r = transition(idle, 'Nova venda', snapshot);
  r = transition(r.state, 'Maria', snapshot);
  r = transition(r.state, 'kit saldo', snapshot);
  assert.equal(r.state.type, 'finance');
  if (r.state.type === 'finance') { assert.equal(r.state.step, 'quantity'); assert.equal(r.state.draft.value.items[0].productName, 'kit saldo'); }
  assert.equal(r.action, undefined);
  r = transition(r.state, 'Cancelar', snapshot); assert.equal(r.state.type, 'idle');
});
function talk(lines: string[], data = snapshot) { let reply: Reply = { state: idle, text: '', choices: [] }; for (const line of lines) { reply = transition(reply.state, line, data); assert.equal(reply.action, undefined, `must not write before confirming: ${line}`); } return reply; }

test('natural-language sale with explicit entry/remainder is proposed with exact cents, never saved implicitly', () => {
  const text = 'Vendi dois perfumes pra Maria por 300 reais, ela pagou 100 e ficou devendo 200.';
  const draft = parseChatSale(text, snapshot.clients);
  assert.equal(draft.value.clientId, maria.id); assert.equal(draft.value.items[0].quantity, 2); assert.equal(draft.value.items[0].unitCents, 15000); assert.equal(draft.received, 10000); assert.equal(draft.expectedRemaining, 20000);
  const reply = transition(idle, text, snapshot); assert.equal(reply.action, undefined); assert.match(reply.summary!, /300,00/); assert.match(reply.summary!, /Recebido agora:.*100,00/); assert.match(reply.summary!, /Restante desta venda:.*200,00/);
  const saved = transition(reply.state, 'Confirmar', snapshot); assert.equal(saved.action?.type, 'financial');
  const noted = parseChatSale('Vendi perfume pra Maria por 300 reais, ela pagou 100 obs: entregar sábado', snapshot.clients); assert.equal(noted.received, 10000); assert.equal(noted.value.observation, 'entregar sábado');
});
test('an incomplete sale becomes questions and answers, including a second product and partial payment', () => {
  const reply = talk(['Nova venda', 'Maria', 'perfume', 'dois', '150', 'Adicionar produto', 'um creme de 40', 'Não, continuar', 'Pagou uma parte', '100']);
  assert.match(reply.summary!, /2 perfume/); assert.match(reply.summary!, /1 creme/); assert.match(reply.summary!, /340,00/); assert.match(reply.summary!, /240,00/);
  assert.equal(transition(reply.state, 'Cancelar', snapshot).state.type, 'idle');
});
test('ambiguous price asks total or unit; non-divisible cents never silently round', () => {
  let r = talk(['Venda Maria 2 perfumes por 120']); assert.match(r.text, /total/); r = transition(r.state, 'Total dos itens', snapshot); assert.ok(r.choices.includes('Pagou tudo'));
  let bad = talk(['Venda Maria 3 perfumes por 100']); bad = transition(bad.state, 'Total dos itens', snapshot); assert.equal(bad.action, undefined); assert.match(bad.text, /centavos exatos/);
  const clarified = transition(bad.state, '33,33', snapshot); assert.ok(clarified.choices.includes('Ainda não pagou'));
});
test('contradictory remainder requires clarification and no amount is invented', () => {
  const r = transition(idle, 'Vendi perfume pra Maria por 300 reais, ela pagou 100 e ficou devendo 250.', snapshot); assert.equal(r.action, undefined); assert.match(r.text, /não conferem/);
  const clarified = transition(r.state, '100', snapshot); assert.match(clarified.summary!, /200,00/);
});
test('sale without payment asks explicitly and correction never writes', () => {
  const r = talk(['Venda Maria perfume 80', 'Ainda não pagou', 'Corrigir', 'valor', '85,56']); assert.match(r.summary!, /85,56/); assert.match(r.summary!, /Recebido agora:.*0,00/);
  const paid = talk(['Venda Maria perfume 80', 'Pagou tudo']); assert.match(paid.summary!, /Recebido agora:.*80,00/);
});
test('client registration is conversational and optional fields never require a form', () => {
  const r = talk(['Cadastrar cliente Ana', 'Não informar', 'e-mail', 'ana@example.test', 'rua', 'Rua Fictícia', 'Concluir cadastro']); assert.match(r.summary!, /Ana/); assert.match(r.summary!, /Rua Fictícia/);
  const action = transition(r.state, 'Confirmar', snapshot).action; assert.equal(action?.type, 'client'); if (action?.type === 'client') assert.equal(action.request.mode, 'create');
});
test('client edits and deletion require confirmation and linked history blocks deletion', () => {
  const r = talk(['Editar cliente Maria', 'telefone', '11999990000', 'Concluir cadastro']); assert.match(r.summary!, /11999990000/); assert.equal(transition(r.state, 'Cancelar', snapshot).action, undefined);
  const deleting = transition(idle, 'Excluir cliente Maria', snapshot); assert.match(deleting.summary!, /Maria/); assert.equal(deleting.action, undefined);
  const linked = { ...snapshot, payments: [{ id: 'payment', clientId: maria.id, paymentDate: '2026-10-11', amount: 1, observation: '' }] };
  assert.match(transition(deleting.state, 'Confirmar', linked).text, /bloqueada/);
});
test('ambiguous and unknown clients require explicit selection rather than an invented registry', () => {
  const data = { ...snapshot, clients: [maria, { ...maria, id: 'other', fullName: 'Maria Silva' }] }; const r = transition(idle, 'Venda Maria creme 50', data); assert.equal(r.state.type, 'choose');
  const chosen = transition(r.state, 'Maria Silva', data); assert.ok(chosen.choices.includes('Ainda não pagou'));
  const unknown = transition(idle, 'Venda Joana creme 50', data); assert.equal(unknown.state.type, 'choose'); assert.equal(unknown.action, undefined);
});
test('reports, historical statements, clients and debts use only the given snapshot', () => {
  const data: Snapshot = { ...snapshot, sales: [{ id: 'sale', clientId: maria.id, productName: 'Perfume', productCode: '', quantity: 2, unitPrice: 150, total: 300, saleDate: '2026-10-11', observation: '' }], payments: [{ id: 'payment', clientId: maria.id, paymentDate: '2026-10-11', amount: 100, observation: '' }] };
  const r = talk(['Relatórios', 'Todo o histórico'], data); assert.match(r.text, /Vendas:.*300,00/); assert.match(r.text, /Recebido:.*100,00/); assert.match(r.text, /Pendências atuais.*200,00/);
  assert.match(transition(idle, 'Histórico da Maria', data).text, /Recebimento/); assert.match(transition(idle, 'Consultar cliente Maria', data).text, /200,00/); assert.match(transition(idle, 'Quem está devendo?', data).text, /200,00/);
});
test('financial edits and deletes select a real record and require a new explicit confirmation', () => {
  const data: Snapshot = { ...snapshot, sales: [{ id: 'sale', clientId: maria.id, productName: 'Perfume', productCode: '', quantity: 1, unitPrice: 80, total: 80, saleDate: '2026-10-11', observation: '' }] };
  const edited = talk(['Alterar venda Maria', '1', 'valor', '85,56'], data); assert.match(edited.summary!, /Alterar venda/); assert.equal(transition(edited.state, 'Confirmar', data).action?.type, 'financial');
  const deleted = talk(['Excluir venda Maria', '1'], data); assert.match(deleted.summary!, /não exclui recebimentos/); assert.equal(transition(deleted.state, 'Cancelar', data).action, undefined);
});
test('payment exceeding debt asks for credit permission and rejects zero/invalid money', () => {
  const r = talk(['Maria pagou 50 reais']); assert.match(r.text, /crédito/); const accepted = transition(r.state, 'Manter como crédito', snapshot); assert.match(accepted.summary!, /excedente/);
  const zero = talk(['Recebimento', 'Maria', '0']); assert.match(zero.text, /maior que zero/); assert.equal(zero.action, undefined);
});
test('configuration changes and restores cannot bypass confirmation, uncertain operations cannot be cancelled', () => {
  const theme = transition(idle, 'Tema escuro', snapshot); assert.equal(theme.action, undefined); assert.equal(transition(theme.state, 'Cancelar', snapshot).action, undefined); assert.equal(transition(theme.state, 'Confirmar', snapshot).action?.type, 'theme');
  const state: State = { type: 'restore', data: { ...snapshot }, hash: 'x', restoreId: 'id', fingerprint: 'x', attempted: false };
  assert.equal(transition(state, 'oi', snapshot).action, undefined); assert.equal(transition(state, 'Confirmar', snapshot).action?.type, 'restore');
  const pending = transition({ ...state, attempted: true }, 'Cancelar', snapshot); assert.equal(pending.state.type, 'restore'); assert.match(pending.text, /já foi enviada/);
});
test('invalid dates and fractional units stay as questions; financial state is never mutated by a reply', () => {
  assert.equal(parseChatDate('30/02/2026'), null); assert.equal(parseChatDate('10/10/2026'), '2026-10-10');
  const r = talk(['Nova venda', 'Maria', 'creme', '1,5']); assert.match(r.text, /inteiras/);
  const original = structuredClone(r.state); transition(r.state, '2', snapshot); assert.deepEqual(r.state, original);
});
