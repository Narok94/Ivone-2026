import type { Client, Payment, Sale } from '../types';
import { findClients, interpret, normalize, type Interpretation } from './conversation';
import { clientFields, fieldValue, type ClientData } from './client-fields';
export { clientFields, fieldValue, type ClientData } from './client-fields';
import { brCents, cents, clientBalance, currency, dateLabel, lineTotal, MAX_CENTS, sumCents, today, validDate, type FinancialOperation } from './finance';

export type Snapshot = { clients: Client[]; sales: Sale[]; payments: Payment[]; remoteSearch?: boolean };
const emptyClient = (): ClientData => Object.fromEntries(clientFields.map(([key]) => [key, ''])) as ClientData;
export type FinanceDraft = { value: Interpretation; kind: FinancialOperation['kind']; sourceText?: string; targetId?: string; received?: number; allowCredit?: boolean; expectedRemaining?: number; paymentHint?: 'all' | 'none'; guided?: boolean; moreAsked?: boolean; needsDate?: boolean; validatedQuantity?: number[] };
type QueryKind = 'client' | 'menu' | 'balance' | 'statement' | 'received';
type ConversationState =
  | { type: 'idle' }
  | { type: 'clientMenu'; person: Client }
  | { type: 'followUp' }
  | { type: 'choose'; candidates: Client[]; purpose: QueryKind | 'editClient' | 'deleteClient' | 'editSale' | 'deleteSale' | 'editPayment' | 'deletePayment' | 'finance'; draft?: FinanceDraft; query?: string; offset?: number; hasMore?: boolean }
  | { type: 'missingClient'; query: string; selection: Extract<State, { type: 'choose' }> }
  | { type: 'finance'; draft: FinanceDraft; step: 'product' | 'quantity' | 'price' | 'priceMode' | 'more' | 'payment' | 'partial' | 'credit' | 'date' | 'notes' | 'correct' | 'confirm'; index: number }
  | { type: 'client'; data: ClientData; original?: Client; step: 'name' | 'phone' | 'details' | 'field' | 'value' | 'confirm'; field?: keyof ClientData; deleting?: boolean; resume?: FinanceDraft }
  | { type: 'clientForm'; data: ClientData; original?: Client; resume?: FinanceDraft; stage: 'name' | 'offer' | 'open'; field?: keyof ClientData }
  | { type: 'record'; kind: 'sale' | 'payment'; deleting: boolean; clientId: string; ids: string[] }
  | { type: 'period'; query: 'reports' | 'history' | 'received'; clientId?: string }
  | { type: 'theme'; dark: boolean }
  | { type: 'attachment'; attempted?: boolean }
  | { type: 'restore'; data: Snapshot & Record<string, unknown>; hash: string; restoreId: string; fingerprint: string; attempted: boolean }
  | { type: 'pendingFinancial'; operation: FinancialOperation }
  | { type: 'pendingClient'; request: ClientRequest }
  | { type: 'blocked'; reason: string };
export type State = ConversationState & { selectedClientId?: string | null };
export type ClientRequest = { mode: 'create' | 'edit' | 'delete'; data: ClientData; id?: string; beforeIds: string[]; resume?: FinanceDraft };
export type Action = { type: 'openClientForm'; form: Extract<State, { type: 'clientForm' }> } | { type: 'searchClients'; selection: Extract<State, { type: 'choose' }>; query: string; offset: number } | { type: 'checkDuplicate'; client: Extract<State, { type: 'client' }> } | { type: 'financial'; draft: FinanceDraft } | { type: 'retryFinancial'; operation: FinancialOperation } | { type: 'client'; request: ClientRequest } | { type: 'checkClient'; request: ClientRequest } | { type: 'theme'; dark: boolean } | { type: 'backup' } | { type: 'restore'; state: Extract<State, { type: 'restore' }> } | { type: 'logout' };
export type Reply = { state: State; text: string; choices: string[]; summary?: string; action?: Action };
const idle: State = { type: 'idle' };
function answer(state: State, text: string, choices: string[] = [], summary?: string, action?: Action): Reply { return { state, text, choices, summary, action }; }
const confirmChoices = ['Confirmar', 'Corrigir', 'Cancelar'];
export const clientMenuChoices = ['Nova venda', 'Ver saldo', 'Extrato', 'Recebimento', 'Editar cadastro', 'Voltar'];
function clientMenu(person: Client): Reply {
  return answer({ type: 'clientMenu', person, selectedClientId: person.id }, '', clientMenuChoices);
}
export function followUp(clientId: string, text: string): Reply {
  return answer({ type: 'followUp', selectedClientId: clientId }, `${text}\n\nDeseja fazer mais alguma coisa?`, ['Outra operação com esta cliente', 'Escolher outra cliente', 'Encerrar']);
}
const amount = (text: string) => { const value = brCents(text); if (value < 0 || value > MAX_CENTS) throw new Error('Confira o valor: use reais e até dois centavos decimais.'); return value; };
export function parseChatDate(text: string): string | null {
  const clean = normalize(text); if (clean === 'hoje') return today();
  if (clean === 'ontem') { const date = new Date(today() + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); }
  const match = clean.match(/^(?:dia |em )?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  const value = match ? `${match[3] ?? today().slice(0, 4)}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : clean;
  return validDate(value) ? value : null;
}
export function parseChatSale(text: string, clients: Client[]): FinanceDraft {
  // Explicit payment is separate from item prices. It remains a proposal until Confirmar.
  const observation = text.match(/\b(?:obs\.?|observa[çc][aã]o)\s*:\s*(.+)$/i);
  const working = observation ? text.slice(0, observation.index).trim() : text;
  const match = working.match(/[,;]?\s+(?:(?:e\s+)?ela\s+|e\s+)?(?:(?:já|ja)\s+)?(?:pagou|deu de entrada|entrada de)\s+(.+)$/i);
  const body = match ? working.slice(0, match.index).trim() : working;
  const value = interpret(body, clients);
  if (observation) value.observation = observation[1].trim();
  const draft: FinanceDraft = { value, kind: 'sale', sourceText: text, needsDate: !validDate(value.date) };
  if (match) {
    const payment = normalize(match[1]).replace(/[.!]$/, '');
    if (/^(?:tudo|integralmente)$/.test(payment)) draft.paymentHint = 'all';
    else {
      const split = match[1].match(/^(.+?)(?:\s+e\s+(?:ficou\s+)?(?:devendo|faltam|restam)\s+(.+))?\s*[.!]?$/i);
      try { draft.received = amount(split![1].trim()); if (split?.[2]) draft.expectedRemaining = amount(split[2].trim().replace(/[.!]$/, '')); }
      catch { value.question = 'Quanto ela pagou agora?'; draft.received = undefined; }
    }
  }
  if (/\b(?:ainda nao pagou|nao pagou|nao pago)\b/.test(normalize(text))) {
    draft.paymentHint = 'none'; value.items = interpret(text.replace(/[,;]?\s+(?:e\s+)?(?:ela\s+)?(?:ainda\s+)?n[aã]o\s+pagou.*$/i, ''), clients).items;
  }
  // A stated entry + remainder can disambiguate the total, but only when they match exactly.
  if (value.items.length === 1 && value.items[0].priceQuestion && draft.received !== undefined && draft.expectedRemaining !== undefined) {
    const item = value.items[0]; const total = draft.received + draft.expectedRemaining;
    if (total === item.priceQuestion && total % item.quantity === 0) { item.unitCents = total / item.quantity; delete item.priceQuestion; }
  }
  return draft;
}
function balanceText(data: Snapshot, id: string) { const balance = clientBalance(data.sales, data.payments, id); return balance >= 0 ? `Saldo pendente: ${currency(balance)}` : `Crédito: ${currency(-balance)}`; }
export function clientSummary(data: ClientData) { return clientFields.map(([key, label]) => `${label[0].toUpperCase() + label.slice(1)}: ${data[key] || 'não informado'}`).join('\n'); }
export function financialSummary(draft: FinanceDraft, data: Snapshot) {
  const v = draft.value; const name = data.clients.find(c => c.id === v.clientId)?.fullName ?? 'Cliente do registro';
  const items = v.items.map(i => `${i.quantity} ${i.productName}: ${currency(lineTotal(i.quantity, i.unitCents!))} (${currency(i.unitCents!)} por unidade)`);
  const total = sumCents(v.items.map(i => lineTotal(i.quantity, i.unitCents!)));
  const deleting = draft.kind.startsWith('delete_'); const editing = draft.kind.startsWith('edit_');
  const sale = draft.kind.endsWith('sale');
  let predicted = clientBalance(data.sales, data.payments, v.clientId!);
  if (draft.kind === 'sale') predicted += total - (draft.received ?? 0);
  if (draft.kind === 'payment') predicted -= v.amountCents!;
  const oldSale = data.sales.find(s => s.id === draft.targetId); const oldPayment = data.payments.find(p => p.id === draft.targetId);
  if (draft.kind === 'edit_sale' && oldSale) predicted += total - (oldSale.clientId === v.clientId ? cents(oldSale.total) : 0);
  if (draft.kind === 'delete_sale' && oldSale) predicted -= cents(oldSale.total);
  if (draft.kind === 'edit_payment' && oldPayment) predicted += (oldPayment.clientId === v.clientId ? cents(oldPayment.amount) : 0) - v.amountCents!;
  if (draft.kind === 'delete_payment' && oldPayment) predicted += cents(oldPayment.amount);
  return `${deleting ? 'Excluir' : editing ? 'Alterar' : 'Registrar'} ${sale ? 'venda' : 'recebimento'}\nCliente: ${name}\nData: ${dateLabel(v.date)}\n${sale ? items.join('\n') + `\nTotal: ${currency(total)}` : `Recebimento: ${currency(v.amountCents!)}`}\n${draft.kind === 'sale' ? `Recebido agora: ${currency(draft.received ?? 0)}\nRestante desta venda: ${currency(total - (draft.received ?? 0))}\n` : ''}${v.observation ? `Observações: ${v.observation}\n` : ''}${predicted >= 0 ? 'Saldo previsto' : 'Crédito previsto'}: ${currency(Math.abs(predicted))}${draft.allowCredit ? '\nConfirmado: excedente ficará como crédito.' : ''}${deleting && sale ? '\nExcluir esta venda não exclui recebimentos agregados da cliente.' : ''}${draft.kind === 'edit_sale' ? '\nEsta alteração não modifica recebimentos já registrados.' : ''}`;
}
function financeStep(draft: FinanceDraft, step: Extract<State, { type: 'finance' }>['step'], data: Snapshot, index = 0): Reply {
  const state: State = { type: 'finance', draft, step, index }; const item = draft.value.items[index];
  switch (step) {
    case 'product': return answer(state, `Qual é o produto ${index + 1}? Pode escrever o nome como você usa.`, ['Cancelar']);
    case 'quantity': return answer(state, `Quantas unidades de ${item.productName}?${item.quantity ? ` Identifiquei ${item.quantity}; confirme ou corrija.` : ''}`, ['Cancelar']);
    case 'price': return answer(state, `Qual é o valor por unidade de ${item.productName}?`, ['Cancelar']);
    case 'priceMode': return answer(state, `${currency(item.priceQuestion!)} é o total de ${item.quantity} ${item.productName} ou o preço de cada unidade?`, ['Total dos itens', 'Por unidade', 'Cancelar']);
    case 'more': return answer(state, 'Há mais algum produto nesta venda?', ['Adicionar produto', 'Não, continuar', 'Cancelar']);
    case 'payment': return answer(state, `Encontrei esta venda de ${currency(sumCents(draft.value.items.map(i => lineTotal(i.quantity, i.unitCents!))))}. Ela já pagou?`, ['Pagou tudo', 'Pagou uma parte', 'Ainda não pagou', 'Corrigir', 'Cancelar']);
    case 'partial': return answer(state, draft.value.kind === 'payment' ? 'Quanto foi recebido? Digite o valor em reais.' : 'Quanto ela pagou agora? Digite o valor em reais.', ['Cancelar']);
    case 'credit': return answer(state, 'Esse recebimento excede a dívida. Deseja manter a diferença como crédito da cliente?', ['Manter como crédito', 'Corrigir valor', 'Cancelar']);
    case 'date': return answer(state, 'Qual é a data? Pode escrever hoje, ontem ou dia/mês/ano.', ['Hoje', 'Ontem', 'Cancelar']);
    case 'notes': return answer(state, 'Quais observações devo anotar? Escreva sem observações para limpar.', ['Sem observações', 'Cancelar']);
    case 'correct': return answer(state, 'O que devo corrigir? Diga cliente, produtos, valor, pagamento, data ou observações.', ['Cancelar']);
    case 'confirm': return answer(state, 'Confira o resumo. Só vou salvar após sua confirmação.', draft.kind === 'sale' ? ['Corrigir', 'Confirmar venda', 'Cancelar'] : draft.kind === 'payment' ? ['Corrigir', 'Registrar recebimento', 'Cancelar'] : confirmChoices, financialSummary(draft, data));
  }
}
export function readyFinance(draft: FinanceDraft, data: Snapshot): Reply {
  if (!draft.value.clientId) return choose(data, 'finance', draft.value.clientQuery ?? '', draft, draft.value.candidates);
  if (draft.kind.startsWith('delete_')) return financeStep(draft, 'confirm', data);
  if (draft.needsDate || !validDate(draft.value.date)) return financeStep(draft, 'date', data);
  if (draft.value.kind === 'sale') {
    if (!draft.value.items.length) { draft.guided = true; draft.value.items = [{ productName: '', productCode: '', quantity: 0, unitCents: null }]; }
    for (const [i, item] of draft.value.items.entries()) {
      if (!item.productName.trim() || item.productName.length > 300) return financeStep(draft, 'product', data, i);
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000 || (item.quantity > 20 && !draft.validatedQuantity?.includes(i))) return financeStep(draft, 'quantity', data, i);
      if (item.priceQuestion !== undefined) return financeStep(draft, 'priceMode', data, i);
      if (item.unitCents === null) return financeStep(draft, 'price', data, i);
      try { lineTotal(item.quantity, item.unitCents); } catch { return financeStep(draft, 'price', data, i); }
    }
    const total = sumCents(draft.value.items.map(i => lineTotal(i.quantity, i.unitCents!)));
    if (draft.paymentHint === 'all') draft.received = total;
    if (draft.paymentHint === 'none') draft.received = 0;
    if (draft.kind === 'edit_sale') draft.received = 0;
    if (draft.guided && !draft.moreAsked && draft.kind === 'sale') return financeStep(draft, 'more', data);
    if (draft.received === undefined) return financeStep(draft, 'payment', data);
    if (draft.received < 0 || draft.received > total) return { ...financeStep(draft, 'partial', data), text: `O recebimento deve estar entre zero e ${currency(total)}. Quanto foi pago?` };
    if (draft.expectedRemaining !== undefined && total - draft.received !== draft.expectedRemaining) return { ...financeStep(draft, 'partial', data), text: `Os valores não conferem: a venda é ${currency(total)}, recebido ${currency(draft.received)} e restante calculado ${currency(total - draft.received)}, diferente de ${currency(draft.expectedRemaining)}. Quanto foi recebido?` };
  } else {
    if (!draft.value.amountCents || draft.value.amountCents > MAX_CENTS) return financeStep(draft, 'partial', data);
    const previous = draft.kind === 'edit_payment' ? data.payments.find(p => p.id === draft.targetId && p.clientId === draft.value.clientId) : undefined;
    if (draft.value.amountCents > clientBalance(data.sales, data.payments, draft.value.clientId) + (previous ? cents(previous.amount) : 0) && !draft.allowCredit) return financeStep(draft, 'credit', data);
  }
  return financeStep(draft, 'confirm', data);
}
function choose(data: Snapshot, purpose: Extract<State, { type: 'choose' }>['purpose'], text: string, draft?: FinanceDraft, candidates?: Client[]): Reply {
  if (data.remoteSearch) {
    const query = text.replace(/[?!]+$/, '').replace(/^(?:mostra|mostrar|ver|consultar)?\s*(?:o\s+)?(?:extrato|saldo|divida)\s*(?:da|de|do)?\s*/i, '').replace(/^quanto\s+(?:a\s+|o\s+)?(.+?)\s+(?:deve|est[aá] devendo).*$/i, '$1').trim();
    const selection: Extract<State, { type: 'choose' }> = { type: 'choose', purpose, draft, candidates: [], query, offset: 0 };
    return answer(selection, query ? 'Vou procurar esse nome…' : 'Qual é o nome da cliente? Pode escrever parte do nome.', ['Cancelar'], undefined, query ? { type: 'searchClients', selection, query, offset: 0 } : undefined);
  }
  const match = text ? findClients(text, data.clients) : { candidates: candidates ?? [], exact: false };
  const state: Extract<State, { type: 'choose' }> = { type: 'choose', purpose, candidates: text ? match.candidates : candidates?.length ? candidates : data.clients, draft };
  if (text && match.exact && match.candidates.length === 1) return choosePerson(state, match.candidates[0], data);
  return answer(state, data.clients.length ? 'Qual cliente? Digite o nome completo ou escolha para não confundir.' : 'Ainda não há clientes. Cancele e diga “Cadastrar cliente” para começar.', [...state.candidates.map(c => c.fullName), 'Cancelar']);
}
export function searchReply(selection: Extract<State, { type: 'choose' }>, result: { clients: Client[]; query: string; offset: number; hasMore: boolean; uncertain?: boolean }): Reply {
  if (!result.clients.length && ['balance', 'statement', 'received'].includes(selection.purpose)) return answer({ ...selection, candidates: [], query: '', offset: 0 }, `Não encontrei ${result.query}. Qual nome devo consultar?`, ['Buscar novamente', 'Cancelar']);
  if (!result.clients.length) return answer({ type: 'missingClient', query: result.query, selection }, `Não encontrei ${result.query} cadastrada. Deseja cadastrar essa cliente agora?`, ['Sim, cadastrar', 'Buscar novamente', 'Cancelar operação']);
  const state = { ...selection, candidates: result.clients, query: result.query, offset: result.offset, hasMore: result.hasMore };
  return answer(state, `${result.uncertain ? 'Encontrei nomes parecidos. Confira com cuidado:' : 'Encontrei estas clientes:'}\n${result.clients.map((c, i) => `${i + 1}. ${c.fullName}${result.clients.filter(p => normalize(p.fullName) === normalize(c.fullName)).length > 1 ? ` · telefone: ${c.phone || 'não informado'} · ${c.id.slice(-6)}` : ''}`).join('\n')}\nQual delas?`, result.clients.map((c, i) => `${i + 1}. ${c.fullName}`).concat(result.hasMore ? ['Mais resultados', 'Buscar novamente', 'Cancelar'] : ['Buscar novamente', 'Cancelar']));
}
export function resumeClient(request: ClientRequest, person: Client, data: Snapshot): Reply {
  if (!request.resume) return followUp(person.id, `Cadastro de ${person.fullName} salvo.`);
  const next = readyFinance({ ...request.resume, value: { ...request.resume.value, clientId: person.id, candidates: [person] } }, { ...data, clients: [person, ...data.clients.filter(c => c.id !== person.id)] });
  return { ...next, text: `Cadastro de ${person.fullName} salvo. Vamos continuar a venda.\n${next.text}` };
}
function choosePerson(state: Extract<State, { type: 'choose' }>, person: Client, data: Snapshot): Reply {
  const next = personReply(state, person, data);
  return { ...next, state: { ...next.state, selectedClientId: person.id } };
}
function personReply(state: Extract<State, { type: 'choose' }>, person: Client, data: Snapshot): Reply {
  if (state.purpose === 'finance') {
    const draft = state.draft!;
    const parsed = draft.sourceText && draft.kind === 'sale' ? parseChatSale(draft.sourceText, [person]) : draft;
    return readyFinance({ ...draft, sourceText: undefined, value: { ...parsed.value, clientId: person.id, candidates: [person], question: undefined } }, data);
  }
  if (state.purpose === 'menu') return clientMenu(person);
  if (state.purpose === 'client') return followUp(person.id, `${clientSummary(person)}\n${balanceText(data, person.id)}`);
  if (state.purpose === 'balance') return followUp(person.id, `${person.fullName}\n${balanceText(data, person.id)}`);
  if (state.purpose === 'received') return answer({ type: 'period', query: 'received', clientId: person.id }, `Qual período dos recebimentos de ${person.fullName}?`, ['Hoje', 'Este mês', 'Todo o histórico', 'Cancelar']);
  if (state.purpose === 'statement') return followUp(person.id, `${history(data, 'all', person.id)}\n${balanceText(data, person.id)}\nRecebimentos são agregados por cliente; não há parcelas formais.`);
  if (state.purpose === 'editClient') return data.remoteSearch ? offerClientForm({ type: 'clientForm', original: person, data: { ...person }, stage: 'offer' }) : answer({ type: 'client', original: person, data: { ...person }, step: 'field' }, `O que quer alterar em ${person.fullName}? Diga nome, telefone, e-mail, CPF, CEP, rua, número, complemento, bairro, cidade, estado ou observações.`, ['Cancelar']);
  if (state.purpose === 'deleteClient') {
    if (data.sales.some(s => s.clientId === person.id) || data.payments.some(p => p.clientId === person.id)) return answer(idle, 'Esta cliente tem lançamentos. Não vou excluir seu cadastro para preservar o histórico.');
    return answer({ type: 'client', original: person, data: { ...person }, step: 'confirm', deleting: true }, 'Excluir definitivamente esta cliente sem lançamentos?', confirmChoices, clientSummary(person));
  }
  const kind = state.purpose.endsWith('Sale') ? 'sale' : 'payment'; const deleting = state.purpose.startsWith('delete');
  const rows = (kind === 'sale' ? data.sales : data.payments).filter(r => r.clientId === person.id).sort((a, b) => recordDate(b).localeCompare(recordDate(a)) || a.id.localeCompare(b.id));
  if (!rows.length) return answer(idle, `Não encontrei ${kind === 'sale' ? 'vendas' : 'recebimentos'} para ${person.fullName}.`);
  return answer({ type: 'record', kind, deleting, clientId: person.id, ids: rows.map(r => r.id) }, `Qual ${kind === 'sale' ? 'venda' : 'recebimento'} de ${person.fullName}? Escolha um lançamento.\n${rows.map((r, i) => recordLabel(r, i)).join('\n')}`, rows.map((r, i) => recordLabel(r, i)).concat('Cancelar'));
}
const recordDate = (row: Sale | Payment) => 'saleDate' in row ? row.saleDate : row.paymentDate;
function recordLabel(row: Sale | Payment, i: number) { return `${i + 1}. ${dateLabel(recordDate(row))} · ${'productName' in row ? row.productName + ' · ' + currency(cents(row.total)) : currency(cents(row.amount))}`; }
function filterPeriod(date: string, period: string) { return period === 'today' ? date === today() : period === 'month' ? date.startsWith(today().slice(0, 7)) : true; }
function ledgerPeople(data: Snapshot) {
  const names = new Map(data.clients.map(c => [c.id, c.fullName]));
  for (const row of [...data.sales, ...data.payments]) if (!names.has(row.clientId)) names.set(row.clientId, row.clientName ?? 'Cliente');
  return [...names].map(([id, fullName]) => ({ id, fullName }));
}
function period(text: string): 'today' | 'month' | 'all' | undefined { const c = normalize(text); return /hoje/.test(c) ? 'today' : /(?:este|esse|neste|nesse) mes/.test(c) ? 'month' : /todo|tudo|historico completo/.test(c) ? 'all' : undefined; }
export function history(data: Snapshot, range: string, clientId?: string) {
  const person = data.clients.find(c => c.id === clientId);
  const names = new Map(ledgerPeople(data).map(c => [c.id, c.fullName]));
  const entries = [...data.sales.filter(s => !clientId || s.clientId === clientId).map(s => ({ date: s.saleDate, id: s.id, text: `${dateLabel(s.saleDate)} · ${names.get(s.clientId) ?? 'Cliente'} · ${s.quantity} ${s.productName}: ${currency(cents(s.total))}` })), ...data.payments.filter(p => !clientId || p.clientId === clientId).map(p => ({ date: p.paymentDate, id: p.id, text: `${dateLabel(p.paymentDate)} · ${names.get(p.clientId) ?? 'Cliente'} · Recebimento: ${currency(cents(p.amount))}` }))].filter(e => filterPeriod(e.date, range)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return `${person ? `Extrato de ${person.fullName}` : 'Histórico'} (${range === 'today' ? 'hoje' : range === 'month' ? 'este mês' : 'todo o histórico'})\n${entries.map(e => e.text).join('\n') || 'Ainda não há lançamentos nesse período.'}`;
}
export function report(data: Snapshot, range: string) {
  const sales = data.sales.filter(s => filterPeriod(s.saleDate, range)); const payments = data.payments.filter(p => filterPeriod(p.paymentDate, range));
  const people = ledgerPeople(data);
  const byClient = people.map(c => ({ name: c.fullName, total: sumCents(sales.filter(s => s.clientId === c.id).map(s => cents(s.total))) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, 5);
  const products = new Map<string, number>(); sales.forEach(s => products.set(s.productName, (products.get(s.productName) ?? 0) + s.quantity));
  const pending = sumCents(people.map(c => Math.max(0, clientBalance(data.sales, data.payments, c.id))));
  return `Relatório (${range === 'today' ? 'hoje' : range === 'month' ? 'este mês' : 'todo o histórico'})\nVendas: ${currency(sumCents(sales.map(s => cents(s.total))))}\nRecebido: ${currency(sumCents(payments.map(p => cents(p.amount))))}\nPendências atuais de todo o histórico: ${currency(pending)}\nClientes que mais compraram:\n${byClient.map(c => `${c.name}: ${currency(c.total)}`).join('\n') || 'Nenhuma venda.'}\nProdutos mais vendidos:\n${[...products].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([name, quantity]) => `${name}: ${quantity} unidades`).join('\n') || 'Nenhum produto.'}`;
}
function fieldName(text: string): keyof ClientData | undefined { const c = normalize(text).replace(/^o |^a /, ''); if (c === 'endereco') return 'street'; if (c === 'celular') return 'phone'; return clientFields.find(([key, label]) => normalize(label) === c || normalize(key) === c || (key === 'observation' && c === 'observacao'))?.[0]; }
function clientReview(state: Extract<State, { type: 'client' }>): Reply { return answer({ ...state, step: 'confirm' }, state.deleting ? 'Excluir esta cliente?' : 'Confira o cadastro. Posso salvar?', confirmChoices, clientSummary(state.data)); }
function offerClientForm(form: Extract<State, { type: 'clientForm' }>): Reply {
  return answer({ ...form, stage: 'offer' }, form.original ? `Deseja editar os dados de ${form.data.fullName}?` : `Deseja iniciar o cadastro de ${form.data.fullName}?`, ['Sim', 'Cancelar']);
}
function valueForOperation(state: Extract<State, { type: 'record' }>, row: Sale | Payment): FinanceDraft {
  const sale = 'saleDate' in row;
  return { kind: `${state.deleting ? 'delete' : 'edit'}_${state.kind}` as FinancialOperation['kind'], targetId: row.id, received: 0, value: { kind: state.kind, clientId: row.clientId, candidates: [], items: sale ? [{ productName: row.productName, productCode: row.productCode, quantity: row.quantity, unitCents: cents(row.unitPrice) }] : [], amountCents: sale ? undefined : cents(row.amount), date: recordDate(row), observation: row.observation, installments: false } };
}

export function transition(current: State, input: string, snapshot: Snapshot): Reply {
  const next = transitionReply(current, input, snapshot);
  return { ...next, state: { ...next.state, selectedClientId: next.state.selectedClientId !== undefined ? next.state.selectedClientId : current.selectedClientId } };
}
function transitionReply(current: State, input: string, snapshot: Snapshot): Reply {
  // Do not mutate React state or a confirmed request while interpreting a new reply.
  const state: State = structuredClone(current); const text = input.trim(); const clean = normalize(text);
  const cancelled = /^(cancelar|cancela|cancelar operacao|voltar|encerrar|outra cliente|escolher outra cliente)$/.test(clean);
  if (cancelled) {
    if (state.type === 'pendingFinancial' || state.type === 'pendingClient' || state.type === 'blocked' || (state.type === 'attachment' && state.attempted) || (state.type === 'restore' && state.attempted)) return answer(state, 'A confirmação já foi enviada. Precisamos verificar seu resultado antes de outra operação.', ['Verificar resultado']);
    if (clean === 'outra cliente' || clean === 'escolher outra cliente') { const next = choose(snapshot, 'menu', ''); return { ...next, state: { ...next.state, selectedClientId: null } }; }
    return answer({ type: 'idle', selectedClientId: null }, /cancel/.test(clean) ? 'Cancelei. Nenhuma alteração foi enviada.' : 'Atendimento encerrado. Pode conversar livremente.');
  }
  try {
    if (state.type === 'blocked') return answer(state, state.reason);
    if (clean === 'outra operacao com esta cliente' && (state.type === 'followUp' || state.type === 'clientMenu')) {
      const person = snapshot.clients.find(c => c.id === state.selectedClientId);
      return person ? clientMenu(person) : answer({ type: 'idle', selectedClientId: null }, 'Não encontrei essa cliente. Digite o nome para buscar novamente.');
    }
    if (state.type === 'clientForm') {
      if (state.stage === 'name') return offerClientForm({ ...state, data: { ...state.data, fullName: fieldValue('fullName', text) } });
      if (state.stage === 'offer' && /^(sim|sim, cadastrar|confirmar)$/.test(clean)) { const form = { ...state, stage: 'open' as const }; return answer(form, 'Preencha o formulário. Só vou salvar quando você tocar em Salvar.', [], undefined, { type: 'openClientForm', form }); }
      return offerClientForm(state);
    }
    if (state.type === 'pendingFinancial') return answer(state, 'Vou verificar usando a mesma confirmação, sem duplicar.', [], undefined, { type: 'retryFinancial', operation: state.operation });
    if (state.type === 'pendingClient') return answer(state, 'Vou consultar o cadastro; não vou repetir a gravação.', [], undefined, { type: 'checkClient', request: state.request });
    if (state.type === 'restore') {
      if (clean === 'corrigir' && !state.attempted) return answer({ type: 'attachment' }, 'Escolha o arquivo correto. Nenhum registro foi substituído.', ['Anexar backup', 'Cancelar']);
      if (clean !== 'confirmar' && clean !== 'verificar resultado') return answer(state, 'Confirme ou cancele antes de continuar.', state.attempted ? ['Verificar resultado'] : confirmChoices);
      return answer(state, 'Conferindo a restauração…', [], undefined, { type: 'restore', state });
    }
    if (state.type === 'attachment') return answer(state, 'Anexe o arquivo JSON do backup pelo botão. Vou baixar um backup atual antes de apresentar o resumo.', ['Anexar backup', 'Cancelar']);
    if (state.type === 'theme') {
      if (clean === 'corrigir') return answer(idle, 'Diga qual tema prefere: claro ou escuro.');
      if (clean !== 'confirmar') return answer(state, 'Posso mudar essa preferência?', confirmChoices, `Tema ${state.dark ? 'escuro' : 'claro'}. O chat mantém as cores florais.`);
      return answer(idle, 'Preferência de tema atualizada. O Caderninho mantém as cores florais.', [], undefined, { type: 'theme', dark: state.dark });
    }
    if (state.type === 'missingClient') {
      if (/^(sim|sim, cadastrar|cadastrar)$/.test(clean)) {
        if (snapshot.remoteSearch) { const form: Extract<State, { type: 'clientForm' }> = { type: 'clientForm', data: { ...emptyClient(), fullName: state.query }, stage: 'open', resume: state.selection.draft }; return answer(form, 'Preencha o cadastro para continuar a venda. Só salvo ao tocar em Salvar cliente.', [], undefined, { type: 'openClientForm', form }); }
        const client: Extract<State, { type: 'client' }> = { type: 'client', data: { ...emptyClient(), fullName: state.query }, step: 'confirm', resume: state.selection.draft };
        return answer(client, 'Vou conferir se esse cadastro já existe.', ['Cancelar'], undefined, { type: 'checkDuplicate', client });
      }
      if (clean === 'buscar novamente') return answer({ ...state.selection, candidates: [], query: '' }, 'Qual nome devo procurar?', ['Cancelar']);
      return answer(state, 'Quer cadastrar, procurar outro nome ou cancelar?', ['Sim, cadastrar', 'Buscar novamente', 'Cancelar operação']);
    }
    if (state.type === 'choose') {
      if (snapshot.remoteSearch && clean === 'buscar novamente') return answer({ ...state, candidates: [], query: '', offset: 0 }, 'Qual nome devo procurar?', ['Cancelar']);
      if (snapshot.remoteSearch && clean === 'mais resultados' && state.hasMore) return answer(state, 'Vou procurar mais opções…', ['Cancelar'], undefined, { type: 'searchClients', selection: state, query: state.query!, offset: (state.offset ?? 0) + 8 });
      const matching = state.candidates.filter(c => normalize(c.fullName) === clean);
      if (matching.length === 1) return choosePerson(state, matching[0], snapshot);
      const index = text.match(/^(?:cliente )?(\d+)(?:\.|$)/i); if (index && state.candidates[Number(index[1]) - 1]) return choosePerson(state, state.candidates[Number(index[1]) - 1], snapshot);
      if (snapshot.remoteSearch) {
        if (index) return answer(state, 'Esse número não está nas opções. Escolha uma das clientes acima.', state.candidates.map((c, i) => `${i + 1}. ${c.fullName}`).concat('Cancelar'));
        return answer(state, 'Vou procurar esse nome…', ['Cancelar'], undefined, { type: 'searchClients', selection: state, query: text, offset: 0 });
      }
      const match = findClients(text, state.candidates); if (match.exact && match.candidates.length === 1) return choosePerson(state, match.candidates[0], snapshot);
      return answer(state, 'Não consegui distinguir a cliente. Digite o nome completo ou o número da lista. Se não existe, cancele e diga “Cadastrar cliente”.', state.candidates.map((c, i) => `${i + 1}. ${c.fullName}`).concat('Cancelar'));
    }
    if (state.type === 'record') {
      const n = text.match(/^(\d+)(?:\.|$)/); const index = n ? Number(n[1]) - 1 : -1;
      const row = [...snapshot.sales, ...snapshot.payments].find(r => r.id === state.ids[index]);
      if (!row) return answer(state, 'Qual lançamento? Digite seu número.', ['Cancelar']);
      const draft = valueForOperation(state, row); return state.deleting ? financeStep(draft, 'confirm', snapshot) : financeStep(draft, 'correct', snapshot);
    }
    if (state.type === 'period') {
      const range = period(text); if (!range) return answer(state, 'Quer hoje, este mês ou todo o histórico?', ['Hoje', 'Este mês', 'Todo o histórico', 'Cancelar']);
      return answer(idle, state.query === 'reports' ? report(snapshot, range) : state.query === 'history' ? history(snapshot, range, state.clientId) : `Recebido${state.clientId ? ` de ${snapshot.clients.find(c => c.id === state.clientId)?.fullName ?? 'cliente selecionada'}` : ''} ${range === 'today' ? 'hoje' : range === 'month' ? 'neste mês' : 'em todo o histórico'}: ${currency(sumCents(snapshot.payments.filter(p => (!state.clientId || p.clientId === state.clientId) && filterPeriod(p.paymentDate, range)).map(p => cents(p.amount))))}.`);
    }
    if (state.type === 'client') {
      if (state.step === 'confirm') {
        if (clean === 'corrigir') { if (state.deleting) return choose(snapshot, 'deleteClient', ''); return answer({ ...state, step: 'field' }, 'Qual informação devo corrigir? Diga nome, telefone, e-mail ou outro campo do cadastro.', ['Cancelar']); }
        if (clean !== 'confirmar') return clientReview(state);
        if (state.deleting && snapshot.sales.concat([]).some(s => s.clientId === state.original!.id) || state.deleting && snapshot.payments.some(p => p.clientId === state.original!.id)) return answer(idle, 'A cliente agora possui lançamentos. Exclusão bloqueada para preservar o histórico.');
        const request: ClientRequest = { mode: state.deleting ? 'delete' : state.original ? 'edit' : 'create', data: state.data, id: state.original?.id, beforeIds: snapshot.clients.map(c => c.id), resume: state.resume };
        return answer({ type: 'pendingClient', request }, 'Conferindo o cadastro…', [], undefined, { type: 'client', request });
      }
      if (state.step === 'name') { state.data.fullName = fieldValue('fullName', text); if (snapshot.remoteSearch) return answer({ ...state, step: 'confirm' }, 'Vou conferir esse nome…', ['Cancelar'], undefined, { type: 'checkDuplicate', client: { ...state, step: 'confirm' } }); if (snapshot.clients.some(c => normalize(c.fullName) === normalize(state.data.fullName))) return answer(state, 'Já existe uma cliente com esse nome. Informe um nome completo que permita distinguir as pessoas ou cancele para consultar o cadastro.', ['Cancelar']); return answer({ ...state, step: 'phone' }, 'Qual é o telefone com DDD? Se preferir, diga não informar.', ['Não informar', 'Cancelar']); }
      if (state.step === 'phone') { state.data.phone = fieldValue('phone', text); return answer({ ...state, step: 'details' }, 'Quer acrescentar endereço, e-mail ou observações? Diga qual informação, ou concluir cadastro.', ['Concluir cadastro', 'Cancelar']); }
      if ((state.step === 'details' || state.step === 'field') && /^(?:concluir|continuar|nao|pronto|revisar)/.test(clean)) return clientReview(state);
      if (state.step === 'field' || state.step === 'details') {
        const field = fieldName(text); if (!field) return answer(state, 'Qual informação? Pode dizer nome, telefone, e-mail, CPF, CEP, rua, número, complemento, bairro, cidade, estado ou observações.', ['Concluir cadastro', 'Cancelar']);
        return answer({ ...state, step: 'value', field }, `Qual ${clientFields.find(([key]) => key === field)![1]} devo anotar?${state.data[field] ? ` Atual: ${state.data[field]}.` : ''} Diga limpar para deixar em branco.`, ['Cancelar']);
      }
      if (state.step === 'value') { state.data[state.field!] = fieldValue(state.field!, text); return answer({ ...state, step: 'details', field: undefined }, 'Anotei no rascunho. Quer mudar outra informação? Diga o campo ou concluir cadastro.', ['Concluir cadastro', 'Cancelar']); }
    }
    if (state.type === 'finance') {
      const draft = state.draft; const v = draft.value; const item = v.items[state.index];
      if (clean === 'corrigir') return draft.kind.startsWith('delete_') ? choose(snapshot, draft.kind === 'delete_sale' ? 'deleteSale' : 'deletePayment', '') : financeStep(draft, 'correct', snapshot);
      if (state.step === 'confirm') {
        if (clean !== 'confirmar' && !(draft.kind === 'sale' && clean === 'confirmar venda') && !(draft.kind === 'payment' && clean === 'registrar recebimento')) return financeStep(draft, 'confirm', snapshot);
        return answer(state, 'Conferindo e salvando…', [], undefined, { type: 'financial', draft });
      }
      if (state.step === 'correct') {
        if (clean === 'cliente') return choose(snapshot, 'finance', '', draft);
        if (/produto/.test(clean) && !draft.kind.startsWith('delete_')) { v.items = [{ productName: '', quantity: 0, unitCents: null, productCode: '' }]; draft.received = draft.kind === 'edit_sale' ? 0 : undefined; draft.expectedRemaining = undefined; draft.paymentHint = undefined; return financeStep(draft, 'product', snapshot); }
        if (/data/.test(clean)) return financeStep(draft, 'date', snapshot);
        if (/observa/.test(clean)) return financeStep(draft, 'notes', snapshot);
        if (/pagamento|recebido|entrada|valor/.test(clean)) {
          if (draft.kind.startsWith('delete_')) return answer(state, 'Para excluir outro lançamento, cancele e escolha o registro correto.', ['Cancelar']);
          if (v.kind === 'payment') { draft.allowCredit = false; return financeStep(draft, 'partial', snapshot); }
          if (/valor/.test(clean)) { if (v.items.length > 1) return answer(state, 'Para mudar o preço de uma venda com vários produtos, diga produtos e reescreva os itens. Pode manter a data e as observações.', ['Cancelar']); return financeStep(draft, 'price', snapshot); }
          if (draft.kind === 'edit_sale') return answer(state, 'Os recebimentos são agregados por cliente. Cancele e diga alterar pagamento para corrigir um recebimento.', ['Cancelar']);
          draft.received = undefined; draft.expectedRemaining = undefined; draft.paymentHint = undefined; return financeStep(draft, 'payment', snapshot);
        }
        return answer(state, 'Diga cliente, produtos, valor, pagamento, data ou observações.', ['Cancelar']);
      }
      if (state.step === 'product') {
        const proposal = parseChatSale(`Venda Cliente ${text}`, [{ id: v.clientId ?? 'placeholder', fullName: 'Cliente' } as Client]);
        const parsed = proposal.value;
        if (proposal.received !== undefined || proposal.paymentHint) { draft.received = proposal.received; draft.paymentHint = proposal.paymentHint; draft.expectedRemaining = proposal.expectedRemaining; draft.moreAsked = true; }
        if (parsed.observation) v.observation = parsed.observation;
        if (parsed.items.length > 1) {
          if (draft.kind === 'edit_sale') return answer(state, 'Uma edição altera um lançamento por vez. Informe apenas o produto deste lançamento.', ['Cancelar']);
          v.items.splice(state.index, 1, ...parsed.items); return readyFinance(draft, snapshot);
        }
        const proposed = parsed.items[0];
        if (proposed && (proposed.unitCents !== null || proposed.priceQuestion !== undefined)) v.items[state.index] = proposed;
        else { item.productName = proposed?.productName || text; item.quantity = /^(?:\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco)\s/i.test(text) ? proposed?.quantity ?? 0 : 0; item.unitCents = null; }
        return readyFinance(draft, snapshot);
      }
      if (state.step === 'quantity') {
        const quantities: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
        const quantity = quantities[clean] ?? Number(text); if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) return answer(state, 'Quantas unidades inteiras? Use um número entre 1 e 10.000.', ['Cancelar']);
        item.quantity = quantity; draft.validatedQuantity = [...draft.validatedQuantity ?? [], state.index]; return readyFinance(draft, snapshot);
      }
      if (state.step === 'priceMode') {
        if (!/total|unidade|cada/.test(clean)) return financeStep(draft, 'priceMode', snapshot, state.index);
        const total = /total/.test(clean); const price = total ? item.priceQuestion! / item.quantity : item.priceQuestion!;
        if (!Number.isSafeInteger(price)) return { ...financeStep(draft, 'price', snapshot, state.index), text: 'Esse total não pode ser dividido em preços iguais com centavos exatos. Qual é o preço por unidade? Se os preços forem diferentes, cancele e registre itens separados.' };
        item.unitCents = price; delete item.priceQuestion; return readyFinance(draft, snapshot);
      }
      if (state.step === 'price') { item.unitCents = amount(text); delete item.priceQuestion; lineTotal(item.quantity, item.unitCents); return readyFinance(draft, snapshot); }
      if (state.step === 'payment') {
        draft.paymentHint = undefined; draft.expectedRemaining = undefined;
        if (/^(?:pagou tudo|tudo|sim|pago integralmente)$/.test(clean)) draft.received = sumCents(v.items.map(i => lineTotal(i.quantity, i.unitCents!)));
        else if (/nao|pendente/.test(clean)) draft.received = 0;
        else if (/parte|parcial/.test(clean)) return financeStep(draft, 'partial', snapshot);
        else { const match = text.match(/^(?:pagou |entrada de )?(.+)$/i); draft.received = amount(match![1]); }
        return readyFinance(draft, snapshot);
      }
      if (state.step === 'partial') { const value = amount(text); if (v.kind === 'payment') { if (!value) throw new Error('O recebimento precisa ser maior que zero.'); v.amountCents = value; draft.allowCredit = false; } else { draft.received = value; draft.expectedRemaining = undefined; draft.paymentHint = undefined; } return readyFinance(draft, snapshot); }
      if (state.step === 'credit') { if (/corrigir|valor/.test(clean)) return financeStep(draft, 'partial', snapshot); if (!/^(?:manter como credito|sim|credito)$/.test(clean)) return financeStep(draft, 'credit', snapshot); draft.allowCredit = true; return readyFinance(draft, snapshot); }
      if (state.step === 'date') { const date = parseChatDate(text); if (!date) return answer(state, 'Essa data não existe. Qual é a data correta?', ['Hoje', 'Ontem', 'Cancelar']); v.date = date; draft.needsDate = false; return readyFinance(draft, snapshot); }
      if (state.step === 'notes') { if (text.length > 2000) throw new Error('Pode resumir em até 2.000 caracteres?'); v.observation = clean === 'sem observacoes' ? '' : text; return readyFinance(draft, snapshot); }
      if (state.step === 'more') { draft.moreAsked = true; if (/adicionar|sim/.test(clean)) { draft.moreAsked = false; v.items.push({ productName: '', productCode: '', quantity: 0, unitCents: null }); return financeStep(draft, 'product', snapshot, v.items.length - 1); } return readyFinance(draft, snapshot); }
    }
    // New requests always start from the shared server snapshot, not invented records.
    const selected = snapshot.clients.find(c => c.id === state.selectedClientId);
    if (/^(?:ver saldo|ver saldo devedor|saldo|quanto falta pagar|quanto (?:ela|ele) deve)\??$/.test(clean)) return selected ? followUp(selected.id, `${selected.fullName}\n${balanceText(snapshot, selected.id)}`) : choose(snapshot, 'balance', '');
    if (clean === 'extrato' && selected) return personReply({ type: 'choose', purpose: 'statement', candidates: [selected] }, selected, snapshot);
    if (clean === 'editar cadastro') {
      if (!selected) return choose(snapshot, 'editClient', '');
      const next = choosePerson({ type: 'choose', purpose: 'editClient', candidates: [selected] }, selected, snapshot);
      return next.state.type === 'clientForm' ? transition(next.state, 'Sim', snapshot) : next;
    }
    if (/^(?:cadastrar|cadastre|cadastro|nova|novo|adicionar)\s+(?:uma?\s+)?cliente\b/.test(clean)) {
      const details = text.replace(/^(?:cadastrar|cadastre|cadastro|nova|novo|adicionar)\s+(?:uma?\s+)?cliente\s*(?:chamada\s+)?/i, '').trim();
      const name = details.split(/[,;]|\s+(?:telefone|celular|email|e-mail|cpf|cep|rua|endere[çc]o|n[uú]mero|complemento|bairro|cidade|estado|observa[çc][aã]o)\s*[: ]/i)[0].trim().replace(/[.!]$/, '');
      const state: Extract<State, { type: 'client' }> = { type: 'client', data: emptyClient(), step: 'name' };
      const phone = details.match(/(?:telefone|celular)\s*:?\s*([+\d()\s-]+)/i); if (phone) state.data.phone = fieldValue('phone', phone[1].trim());
      const email = details.match(/(?:email|e-mail)\s*:?\s*([^\s,;]+@[^\s,;]+)/i); if (email) state.data.email = fieldValue('email', email[1]);
      for (const provided of details.matchAll(/[,;]\s*(telefone|celular|email|e-mail|cpf|cep|rua|endere[çc]o|n[uú]mero|complemento|bairro|cidade|estado|observa[çc][aã]o)\s*:?\s*([^,;]*)/gi)) {
        const field = fieldName(provided[1]); if (field) state.data[field] = fieldValue(field, provided[2]);
      }
      if (snapshot.remoteSearch) return name ? offerClientForm({ type: 'clientForm', data: { ...state.data, fullName: fieldValue('fullName', name) }, stage: 'offer' }) : answer({ type: 'clientForm', data: state.data, stage: 'name' }, 'Qual é o nome completo da cliente?', ['Cancelar']);
      return name ? transition(state, name, snapshot) : answer(state, 'Qual é o nome completo da cliente?', ['Cancelar']);
    }
    const changeField = text.match(/^(?:alterar|editar|corrigir)\s+(?:o\s+|a\s+)?(?:telefone|celular|e-mail|email|endereço|endereco|cpf|cep|observações)\s+(?:de|da|do)\s+(.+)$/i);
    if (changeField) return choose(snapshot, 'editClient', changeField[1]);
    if (/^(?:alterar|editar|corrigir|excluir|apagar|remover)\s+(?:a\s+)?cliente\b/.test(clean)) return choose(snapshot, /excluir|apagar|remover/.test(clean) ? 'deleteClient' : 'editClient', text.replace(/^(?:alterar|editar|corrigir|excluir|apagar|remover)\s+(?:a\s+)?cliente\s*/i, ''));
    if (/^(?:alterar|editar|corrigir|excluir|apagar|remover)\s+(?:a\s+|o\s+)?(?:venda|pagamento|recebimento)\b/.test(clean)) {
      const deleting = /^(?:excluir|apagar|remover)/.test(clean); const sale = /\bvenda\b/.test(clean); return choose(snapshot, `${deleting ? 'delete' : 'edit'}${sale ? 'Sale' : 'Payment'}` as Extract<State, { type: 'choose' }>['purpose'], text.replace(/^(?:alterar|editar|corrigir|excluir|apagar|remover)\s+(?:a\s+|o\s+)?(?:venda|pagamento|recebimento)\s*/i, '').replace(/^(?:da|do|de)\s+/i, ''));
    }
    if (/^(?:clientes|listar clientes|minhas clientes|quem sao as clientes)$/.test(clean)) return snapshot.remoteSearch ? choose(snapshot, 'client', '') : answer(idle, `Clientes cadastradas:\n${snapshot.clients.map(c => c.fullName).join('\n') || 'Nenhuma cliente.'}\nPara consultar um cadastro, diga “Consultar cliente” e o nome.`);
    if (/^(?:consultar|ver|mostrar|mostra|dados|cadastro)\s+(?:(?:da|de|a)\s+)?cliente\b/.test(clean)) return choose(snapshot, 'client', text.replace(/^(?:consultar|ver|mostrar|mostra|dados|cadastro)\s+(?:(?:da|de|a)\s+)?cliente\s*/i, ''));
    if (/relatorio|quem mais compr|produtos mais vendidos/.test(clean)) { const range = period(text); return range ? answer(idle, report(snapshot, range)) : answer({ type: 'period', query: 'reports' }, 'De qual período quer o relatório?', ['Hoje', 'Este mês', 'Todo o histórico', 'Cancelar']); }
    if (/historico/.test(clean)) {
      if (findClients(text, snapshot.clients).candidates.length) return choose(snapshot, 'statement', text);
      const range = period(text); return range ? answer(idle, history(snapshot, range)) : answer({ type: 'period', query: 'history' }, 'De qual período quer o histórico?', ['Hoje', 'Este mês', 'Todo o histórico', 'Cancelar']);
    }
    if (/^(?:configuracoes|configuracao|ajustes)$/.test(clean)) return answer(idle, 'Posso mudar a preferência de tema, baixar um backup ou restaurar um arquivo. Diga o que deseja. Antes de restaurar, baixarei um backup atual e pedirei confirmação.');
    if (/tema.*escuro|tema.*claro/.test(clean) || clean === 'claro' || clean === 'escuro') { const dark = /escuro/.test(clean); return answer({ type: 'theme', dark }, 'Posso alterar essa preferência?', confirmChoices, `Tema ${dark ? 'escuro' : 'claro'}. O chat mantém as cores florais.`); }
    if (/restaurar.*backup|restaurar.*arquivo|subir backup/.test(clean)) return answer({ type: 'attachment' }, 'Anexe o backup JSON. Vou conferir o arquivo e baixar um backup atual antes de pedir confirmação.', ['Anexar backup', 'Cancelar']);
    if (/backup/.test(clean)) return answer(idle, 'Vou baixar um backup dos registros atuais.', [], undefined, { type: 'backup' });
    if (/^(?:sair|logout|encerrar sessao)$/.test(clean)) return answer(idle, 'Encerrando a sessão…', [], undefined, { type: 'logout' });
    if (/^(?:ajuda|oi|ola|bom dia|boa tarde|boa noite)$/.test(clean)) return answer(idle, 'Pode me contar uma venda, um recebimento ou pedir clientes, dívidas, extrato, histórico, relatórios e configurações. Também posso cadastrar ou alterar clientes e corrigir lançamentos. Antes de mudar qualquer registro, vou pedir sua confirmação.');
    if (/^(?:nova venda|venda|vendi)$/.test(clean)) return readyFinance({ kind: 'sale', value: { kind: 'sale', clientId: selected?.id, candidates: [], items: [], date: today(), observation: '', installments: false } }, snapshot);
    if (/^(?:recebimento|pagamento|receber|registrar recebimento)$/.test(clean)) return readyFinance({ kind: 'payment', value: { kind: 'payment', clientId: selected?.id, candidates: [], items: [], date: today(), observation: '', installments: false } }, snapshot);
    const parsed = interpret(text, snapshot.clients);
    if (parsed.kind === 'sale') {
      const draft = parseChatSale(text, snapshot.clients); if (snapshot.remoteSearch) draft.value.clientId = undefined; const reply = readyFinance(draft, snapshot);
      if (draft.value.installments) reply.text = 'Registro somente venda, recebimento e saldo; parcelas e vencimentos formais não existem ainda.\n' + reply.text;
      return reply;
    }
    if (parsed.kind === 'payment') { if (snapshot.remoteSearch) parsed.clientId = undefined; return readyFinance({ kind: 'payment', value: parsed }, snapshot); }
    if (parsed.kind === 'pending') { const people = ledgerPeople(snapshot).map(c => ({ name: c.fullName, total: clientBalance(snapshot.sales, snapshot.payments, c.id) })).filter(c => c.total > 0); return answer(idle, people.length ? `Quem está devendo\n${people.map(c => `${c.name}: ${currency(c.total)}`).join('\n')}\nTotal pendente: ${currency(sumCents(people.map(c => c.total)))}` : 'Nenhuma cliente tem saldo pendente.'); }
    if (parsed.kind === 'balance' || parsed.kind === 'statement') return choose(snapshot, parsed.kind, text);
    if (parsed.kind === 'received') {
      if (parsed.filterClient && !parsed.clientId) return choose(snapshot, 'received', text);
      if (!parsed.period) return answer({ type: 'period', query: 'received', clientId: parsed.clientId }, 'Qual período?', ['Hoje', 'Este mês', 'Todo o histórico', 'Cancelar']);
      return transition({ type: 'period', query: 'received', clientId: parsed.filterClient ? parsed.clientId : undefined }, parsed.period === 'today' ? 'Hoje' : parsed.period === 'month' ? 'Este mês' : 'Todo o histórico', snapshot);
    }
    if (/^[\p{L}][\p{L}\s'.-]{0,299}$/u.test(text)) return choose(snapshot, 'menu', text);
    return answer(idle, 'Não entendi com segurança. Pode dizer quem comprou, quais produtos e o valor, ou pedir cadastrar cliente, pagamento, extrato, histórico ou relatório?');
  } catch (error: any) { return answer(current, error.message || 'Pode explicar de outra forma? Nenhuma alteração foi enviada.', ['Cancelar']); }
}
