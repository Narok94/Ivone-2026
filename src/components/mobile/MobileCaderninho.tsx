import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ClipboardList, Plus, ReceiptText, Wallet } from 'lucide-react';
import { ChatFrame } from './ChatFrame';
import { OperationEditor } from './OperationEditor';
import { DataSnapshot, useData } from '../../contexto/DataContext';
import { Interpretation, interpret } from '../../lib/conversation';
import { brCents, cents, clientBalance, currency, dateLabel, FinancialOperation, lineTotal, sumCents, today, validDate } from '../../lib/finance';
import { ApiError } from '../../lib/api';
import { readPending } from '../../lib/pending-operation';

type Phase = 'client' | 'editor' | 'payment' | 'partial' | 'confirm' | 'retry' | 'period';
type Draft = { value: Interpretation; phase: Phase; receivedCents?: number; operation?: FinancialOperation };
type Message = { id: number; text: string; own?: boolean };
const shortcuts = [{ label: 'Nova Venda', icon: Plus, action: 'sale' }, { label: 'Recebimento', icon: Wallet, action: 'payment' }, { label: 'Extrato', icon: ReceiptText, action: 'statement' }, { label: 'Pendências', icon: ClipboardList, action: 'pending' }] as const;

export default function MobileCaderninho() {
  const { clients, sales, payments, refreshData, commitOperation, logout, user, dataError, isRefreshing } = useData();
  const pendingKey = `ivone_pending_operation:${user!.id}`;
  const [pendingError] = useState(() => { try { readPending(String(user!.id)); return ''; } catch (error: any) { return error.message; } });
  const [draft, setDraft] = useState<Draft | null>(() => {
    try {
      const operation = readPending(String(user!.id));
      if (!operation || !validDate(operation.date)) return null;
      if (operation.items) operation.items.forEach(item => lineTotal(item.quantity, item.unitCents));
      return { phase: 'retry', operation, receivedCents: operation.receivedCents, value: { kind: operation.kind.endsWith('sale') ? 'sale' : 'payment', clientId: operation.clientId, candidates: [], date: operation.date, observation: operation.observation, items: operation.items ?? [], amountCents: operation.amountCents, installments: false } };
    } catch { return null; }
  });
  const [messages, setMessages] = useState<Message[]>([{ id: 0, text: draft ? 'Há uma confirmação anterior sem resposta final. Tente novamente para verificar o resultado com segurança; não vou duplicar o lançamento.' : 'Oi! Eu sou seu Caderninho 🌷\nConte o que vendeu ou recebeu. Antes de anotar, vou conferir tudo com você.' }]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [creditAccepted, setCreditAccepted] = useState(false);
  const sequence = useRef(1);
  const busy = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (draft?.phase === 'partial') { setInput(''); const frame = requestAnimationFrame(() => field.current?.focus()); return () => cancelAnimationFrame(frame); } }, [draft?.phase]);
  const add = (text: string, own = false) => setMessages(old => [...old, { id: sequence.current++, text, own }]);
  const client = clients.find(c => c.id === draft?.value.clientId);
  const orderTotal = draft?.value.kind === 'sale' ? sumCents(draft.value.items.map(item => item.unitCents === null ? 0 : lineTotal(item.quantity, item.unitCents))) : 0;
  const currentBalance = client ? clientBalance(sales, payments, client.id) : 0;
  const received = draft?.value.kind === 'sale' ? draft.receivedCents ?? 0 : draft?.value.amountCents ?? 0;
  const predictedBalance = currentBalance + orderTotal - received;
  const needsCredit = draft?.value.kind === 'payment' && predictedBalance < 0;
  const pendingTitle = draft?.operation ? ({ sale: 'Confirmação de venda', payment: 'Confirmação de recebimento', edit_sale: 'Edição de venda', edit_payment: 'Edição de recebimento', delete_sale: 'Exclusão de venda', delete_payment: 'Exclusão de recebimento' }[draft.operation.kind]) : undefined;

  async function query(value: Interpretation, snapshot?: DataSnapshot) {
    const data = snapshot ?? await refreshData();
    if (value.kind === 'pending') {
      const pending = data.clients.map(c => ({ name: c.fullName, balance: clientBalance(data.sales, data.payments, c.id) })).filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
      add(pending.length ? `Quem está devendo\n${pending.map(c => `${c.name}: ${currency(c.balance)}`).join('\n')}\nTotal pendente: ${currency(sumCents(pending.map(c => c.balance)))}` : 'Nenhuma cliente tem saldo pendente nos registros atuais.');
    } else if (value.kind === 'received') {
      const day = today();
      const person = value.filterClient ? data.clients.find(c => c.id === value.clientId) : null;
      if (value.filterClient && !person) throw new Error('Cliente não encontrada.');
      const list = data.payments.filter(p => !person || p.clientId === person.id).filter(p => value.period === 'today' ? p.paymentDate === day : value.period === 'month' ? p.paymentDate.startsWith(day.slice(0, 7)) : true);
      add(`Recebido${person ? ` de ${person.fullName}` : ''} ${value.period === 'today' ? 'hoje' : value.period === 'month' ? 'neste mês' : 'em todo o histórico'}: ${currency(sumCents(list.map(p => cents(p.amount))))}.`);
    } else {
      const person = data.clients.find(c => c.id === value.clientId);
      if (!person) { add('Cliente não encontrada. Escolha uma cliente cadastrada na gestão.'); return; }
      const balance = clientBalance(data.sales, data.payments, person.id);
      const label = balance >= 0 ? `Saldo pendente: ${currency(balance)}` : `Crédito: ${currency(-balance)}`;
      if (value.kind === 'balance') add(`${person.fullName}\n${label}`);
      else {
        const entries = [...data.sales.filter(s => s.clientId === person.id).map(s => ({ date: s.saleDate, text: `${dateLabel(s.saleDate)} · ${s.quantity} ${s.productName}: ${currency(cents(s.total))}` })), ...data.payments.filter(p => p.clientId === person.id).map(p => ({ date: p.paymentDate, text: `${dateLabel(p.paymentDate)} · Recebimento: ${currency(cents(p.amount))}` }))].sort((a, b) => a.date.localeCompare(b.date));
        add(`Extrato de ${person.fullName}\n${entries.length ? entries.map(e => e.text).join('\n') : 'Ainda não há lançamentos.'}\n${label}\nOs recebimentos são agregados por cliente.`);
      }
    }
  }
  function begin(value: Interpretation) {
    setCreditAccepted(false);
    if (value.kind === 'unknown') { add(value.question!); return; }
    if (value.installments) add('Posso registrar a venda, quanto você recebeu agora e o saldo pendente. Parcelas e vencimentos formais ainda não estão disponíveis. Nenhum plano de parcelas será criado.');
    if (!value.clientId && !['pending', 'received'].includes(value.kind)) { add(value.question ?? 'Qual cliente? Escolha o nome certo.'); setDraft({ value, phase: 'client' }); return; }
    if (value.kind === 'sale') {
      if (value.items.some(i => !i.productName || i.unitCents === null) || value.question || value.needsReview || !validDate(value.date)) { add(value.question ?? 'Vamos completar o resumo.'); setDraft({ value, phase: 'editor' }); }
      else { setDraft({ value, phase: 'payment' }); add('Encontrei esta venda. Ela já pagou?'); }
    } else if (value.kind === 'payment') {
      if (!value.amountCents || value.question) { add(value.question ?? 'Quanto ela pagou?'); setDraft({ value, phase: 'editor' }); }
      else setDraft({ value, phase: 'confirm' });
    }
  }
  async function chooseClient(clientId: string) {
    if (!draft || busy.current) return;
    const value = { ...draft.value, clientId, question: undefined };
    if (value.kind === 'received' && !value.period) { setDraft({ value, phase: 'period' }); add('Você quer hoje, este mês ou todo o histórico?'); return; }
    if (['balance', 'statement', 'received'].includes(value.kind)) {
      busy.current = true; setWorking(true);
      try { await query(value); setDraft(null); } catch { add('Não consegui consultar os registros. Tente novamente.'); }
      finally { busy.current = false; setWorking(false); }
    } else begin(value);
  }
  async function send(text: string) {
    const value = text.trim();
    if (!value || busy.current || pendingError) return;
    if (/^cancelar$/i.test(value) && !draft?.operation) { cancel(); setInput(''); return; }
    if (draft?.phase === 'partial') {
      try { const amount = brCents(value); if (amount <= 0 || amount > orderTotal) throw new Error(); add(value, true); setInput(''); setDraft({ ...draft, receivedCents: amount, phase: 'confirm' }); }
      catch { add(`Quanto recebeu agora? Use um valor maior que zero e até ${currency(orderTotal)}.`); }
      return;
    }
    if (draft) { add('Conclua, corrija ou cancele o resumo antes de começar outra anotação.'); return; }
    busy.current = true; setWorking(true); add(value, true); setInput('');
    try {
      const data = await refreshData();
      const parsed = interpret(value, data.clients);
      if (parsed.kind === 'received' && parsed.filterClient && !parsed.clientId) { add(parsed.question!); setDraft({ value: parsed, phase: 'client' }); }
      else if (parsed.kind === 'received' && !parsed.period) { add(parsed.question!); setDraft({ value: parsed, phase: 'period' }); }
      else if (['pending', 'received'].includes(parsed.kind) || (['balance', 'statement'].includes(parsed.kind) && parsed.clientId)) await query(parsed, data);
      else begin(parsed);
    } catch { add('Não consegui atualizar os dados. Não anotei nada. Tente novamente.'); }
    finally { busy.current = false; setWorking(false); }
  }
  function cancel() { if (draft?.operation || busy.current) return; setDraft(null); setInput(''); add('Cancelado. Nenhum registro foi salvo.'); }
  async function confirm() {
    if (!draft || busy.current || (needsCredit && !creditAccepted && !draft.operation)) return;
    const value = draft.value;
    const operation: FinancialOperation = draft.operation ?? { operationId: crypto.randomUUID(), confirmed: true, kind: value.kind as 'sale' | 'payment', clientId: value.clientId!, date: value.date, observation: value.observation, ...(value.kind === 'sale' ? { items: value.items.map(item => ({ ...item, unitCents: item.unitCents! })), receivedCents: draft.receivedCents! } : { amountCents: value.amountCents!, allowCredit: creditAccepted }) };
    busy.current = true; setWorking(true); setDraft({ ...draft, operation });
    try {
      const result = await commitOperation(operation);
      sessionStorage.removeItem(pendingKey);
      add(`${result.replayed ? 'Essa confirmação já havia sido salva; não dupliquei o lançamento.' : 'Anotado com carinho 🌷'}\n${result.balanceCents >= 0 ? `Saldo pendente: ${currency(result.balanceCents)}` : `Crédito: ${currency(-result.balanceCents)}`}`);
      setDraft(null); setInput('');
    } catch (error: any) {
      if (error instanceof ApiError && [400, 404, 422].includes(error.status)) { sessionStorage.removeItem(pendingKey); setDraft({ ...draft, operation: undefined, phase: 'editor' }); add(error.message); }
      else { setDraft({ ...draft, operation, phase: 'retry' }); add('Ainda não consegui confirmar o resultado. Tente novamente com esta mesma confirmação; não crie outra anotação para substituir esta.'); }
    } finally { busy.current = false; setWorking(false); }
  }
  function shortcut(action: typeof shortcuts[number]['action']) {
    if (draft || busy.current || pendingError) return;
    if (action === 'pending') { void send('Quem está devendo?'); return; }
    if (action === 'statement') { add('De qual cliente você quer o extrato?'); setDraft({ phase: 'client', value: { kind: 'statement', candidates: clients, items: [], date: today(), observation: '', installments: false } }); return; }
    begin({ kind: action, candidates: clients, items: action === 'sale' ? [{ productName: '', productCode: '', quantity: 1, unitCents: null }] : [], date: today(), observation: '', installments: false });
  }
  const footer = <><div className="chat-shortcuts" aria-label="Atalhos">{shortcuts.map(({ label, icon: Icon, action }) => <button key={label} disabled={!!draft || working || isRefreshing || !!dataError} onClick={() => shortcut(action)}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}</div><form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(input); }}><input ref={field} value={input} onChange={event => setInput(event.target.value)} placeholder={draft?.phase === 'partial' ? 'Quanto recebeu agora?' : 'Conte o que vendeu ou recebeu…'} aria-label="Mensagem" maxLength={1500} autoComplete="off" disabled={working || (!!draft && draft.phase !== 'partial')} /><button type="submit" aria-label="Enviar mensagem" disabled={!input.trim() || working || (!!draft && draft.phase !== 'partial')}><ArrowUp size={22} /></button></form><p className="chat-footer-note">Só anoto depois da sua confirmação.</p></>;
  return <ChatFrame revision={`${messages.length}:${draft?.phase}:${working}`} footer={footer} actions={<><a href="/?modo=gestao">Gestão completa</a><button disabled={working || !!draft?.operation} onClick={async () => { try { await logout(); } catch { add('Não consegui encerrar a sessão. Tente novamente.'); } }}>Sair</button></>}>
    {pendingError && <div className="chat-bubble" role="alert"><p>{pendingError}</p></div>}
    {dataError && <div className="chat-bubble" role="alert"><p>{dataError}</p><button onClick={async () => { try { await refreshData(); add('Registros atualizados.'); } catch { add('Ainda não consegui atualizar.'); } }}>Tentar atualizar</button></div>}
    {messages.map(message => <div key={message.id} className={`chat-bubble ${message.own ? 'chat-own' : ''}`}><p>{message.text}</p><span className="chat-bubble-caption">{message.own ? 'Você ✓✓' : 'Caderninho'}</span></div>)}
    {draft?.phase === 'client' && <section className="chat-confirm"><h2>Qual cliente?</h2><div className="chat-client-options">{(draft.value.candidates.length ? draft.value.candidates : clients).map(c => <button key={c.id} disabled={working} onClick={() => void chooseClient(c.id)}>{c.fullName}</button>)}</div>{!clients.length && <p>Cadastre a cliente pela Gestão completa antes de anotar.</p>}<div className="chat-confirm-secondary"><button disabled={working} onClick={cancel}>Cancelar</button></div></section>}
    {draft?.phase === 'editor' && <OperationEditor value={draft.value} clients={clients} onDone={begin} onCancel={cancel} />}
    {draft?.phase === 'period' && <section className="chat-confirm"><h2>Qual período?</h2>{(['today', 'month', 'all'] as const).map((period, i) => <button key={period} disabled={working} onClick={async () => { busy.current = true; setWorking(true); try { await query({ ...draft.value, period }); setDraft(null); } catch { add('Não consegui consultar. Tente novamente.'); } finally { busy.current = false; setWorking(false); } }}>{['Hoje', 'Este mês', 'Todo o histórico'][i]}</button>)}<button onClick={cancel}>Cancelar</button></section>}
    {draft && ['payment', 'partial', 'confirm', 'retry'].includes(draft.phase) && <section className="chat-confirm" aria-label="Resumo para confirmação"><div className="chat-confirm-tag">Confira com carinho</div><h2>{pendingTitle ?? (draft.value.kind === 'sale' ? 'Nova venda' : 'Recebimento')}</h2><dl><div><dt>Cliente</dt><dd>{client?.fullName ?? 'Cliente do registro anterior'}</dd></div><div><dt>Data</dt><dd>{dateLabel(draft.value.date)}</dd></div>{draft.value.items.map((item, i) => <div key={i}><dt>{item.quantity} {item.productName}</dt><dd>{currency(lineTotal(item.quantity, item.unitCents!))}<small>{currency(item.unitCents!)} por unidade</small></dd></div>)}{draft.value.kind === 'sale' && draft.value.items.length > 0 && <div className="chat-total"><dt>Total da venda</dt><dd>{currency(orderTotal)}</dd></div>}{draft.value.observation && <div><dt>Observações</dt><dd>{draft.value.observation}</dd></div>}</dl>
      {draft.phase === 'payment' && <><p>Ela já pagou?</p><div className="chat-payment-options"><button disabled={working} onClick={() => setDraft({ ...draft, receivedCents: orderTotal, phase: 'confirm' })}>Pagou tudo</button><button disabled={working} onClick={() => { setDraft({ ...draft, phase: 'partial' }); add('Quanto ela pagou agora? Digite o valor recebido.'); field.current?.focus(); }}>Pagou uma parte</button><button disabled={working} onClick={() => setDraft({ ...draft, receivedCents: 0, phase: 'confirm' })}>Ainda não pagou</button></div></>}
      {draft.phase === 'partial' && <p>Digite abaixo quanto foi recebido agora. O restante ficará como saldo pendente, sem criar parcelas.</p>}
      {['confirm', 'retry'].includes(draft.phase) && <><dl>{!draft.operation?.kind.startsWith('delete_') && <div><dt>{draft.operation?.kind === 'edit_payment' ? 'Valor do recebimento' : 'Recebido agora'}</dt><dd>{currency(received)}</dd></div>}{draft.value.kind === 'sale' && (!draft.operation || draft.operation.kind === 'sale') && <div><dt>Restante após este recebimento</dt><dd>{currency(orderTotal - received)}</dd></div>}{!draft.operation && <div><dt>{predictedBalance >= 0 ? 'Saldo previsto da cliente' : 'Crédito previsto'}</dt><dd>{currency(Math.abs(predictedBalance))}</dd></div>}</dl>{needsCredit && !draft.operation && <label className="chat-credit"><input type="checkbox" checked={creditAccepted} onChange={event => setCreditAccepted(event.target.checked)} />Confirmo que o valor excedente ficará como crédito.</label>}<p>{draft.phase === 'retry' ? 'A confirmação enviada será reutilizada para evitar duplicação. O servidor informará o saldo atual.' : 'Venda e recebimento serão salvos juntos somente ao confirmar.'}</p><button className="chat-confirm-primary" disabled={working || isRefreshing || !!dataError || (!!needsCredit && !creditAccepted && !draft.operation)} onClick={() => void confirm()}>{working ? 'Conferindo e salvando…' : draft.phase === 'retry' ? 'Tentar mesma confirmação' : 'Confirmar'}</button></>}
      {!draft.operation && <div className="chat-confirm-secondary"><button disabled={working} onClick={() => setDraft({ ...draft, phase: 'editor', receivedCents: undefined })}>Corrigir</button><button disabled={working} onClick={cancel}>Cancelar</button></div>}
    </section>}
  </ChatFrame>;
}
