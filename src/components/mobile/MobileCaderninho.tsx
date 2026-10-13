import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ShoppingBag, Wallet, ReceiptText, HandCoins, UserRoundPen, ArrowLeft } from 'lucide-react';
import { ChatFrame } from './ChatFrame';
import { useData } from '../../contexto/DataContext';
import { apiFetch, ApiError } from '../../lib/api';
import { readPending } from '../../lib/pending-operation';
import { clientBalance, currency, type FinancialOperation } from '../../lib/finance';
import { clientFields, followUp, clientSummary, searchReply, resumeClient, transition, type Action, type ClientData, type ClientRequest, type Reply, type Snapshot, type State } from '../../lib/mobile-conversation';
import { normalize } from '../../lib/conversation';
import { ClientForm } from '../forms/ClientForm';
import { Modal } from '../common/Modal';
import { Button } from '../common';
import './client-modal.css';

type Message = { id: number; text: string; own?: boolean; summary?: string; tone?: 'success' | 'error' };
const menuIcons = [ShoppingBag, Wallet, ReceiptText, HandCoins, UserRoundPen, ArrowLeft];
export default function MobileCaderninho() {
  const data = useData(); const { user, refreshData, commitOperation, logout, isRefreshing, dataError } = data;
  const clientKey = `ivone_pending_client:${user!.id}`; const restoreKey = `ivone_pending_restore:${user!.id}`;
  const initial = (): Reply => {
    try {
      const financial = readPending(String(user!.id));
      if (financial) return { state: { type: 'pendingFinancial', operation: financial }, text: 'Uma confirmação financeira aguarda resposta. Vou verificar sem duplicar.', choices: ['Verificar resultado'] };
      const raw = sessionStorage.getItem(clientKey);
      if (raw) {
        const request: ClientRequest = JSON.parse(raw);
        if (!['create', 'edit', 'delete'].includes(request.mode) || !request.data?.fullName || !Array.isArray(request.beforeIds)) throw new Error('Confirmação de cadastro pendente inválida. Consulte o histórico antes de outra operação.');
        return { state: { type: 'pendingClient', request }, text: 'Uma alteração de cliente aguarda resposta. Vou consultar sem repetir a gravação.', choices: ['Verificar resultado'] };
      }
      if (sessionStorage.getItem(restoreKey)) return { state: { type: 'attachment', attempted: true }, text: 'Uma restauração enviada aguarda resposta. Anexe o mesmo arquivo para verificar sem repetir a substituição.', choices: ['Anexar backup'] };
      return { state: { type: 'idle' }, text: 'Oi! Eu sou seu Caderninho 🌷\nPode me contar uma venda, um recebimento ou pedir clientes, dívidas, extratos, histórico, relatórios e configurações. Antes de anotar ou alterar, vou conferir tudo com você.', choices: [] };
    } catch (e: any) { return { state: { type: 'blocked', reason: e.message }, text: e.message, choices: [] }; }
  };
  const [reply, setReply] = useState<Reply>(initial); const current = useRef(reply);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, text: reply.text }]);
  const [input, setInput] = useState(''); const [working, setWorking] = useState(false);
  const [clientForm, setClientForm] = useState<Extract<State, { type: 'clientForm' }> | null>(null);
  const dirty = useRef(false); const savingClient = useRef(false);
  const modalPending = useRef<ClientRequest | null>(null); const [pendingSave, setPendingSave] = useState(false);
  const [discard, setDiscard] = useState(false);
  useEffect(() => { if (discard) { const box = document.querySelector<HTMLElement>('.client-discard-confirm'); box?.scrollIntoView({ block: 'nearest' }); box?.querySelector<HTMLButtonElement>('button')?.focus(); } }, [discard]);
  function closeClientForm() {
    if (savingClient.current || modalPending.current) return;
    if (dirty.current && !discard) { setDiscard(true); return; }
    if (discard) { setDiscard(false); return; }
    cancelClientForm();
  }
  function cancelClientForm() { setClientForm(null); setDiscard(false); dirty.current = false; apply(response({ type: 'idle', selectedClientId: null }, 'Cancelei o formulário. Nenhum dado foi salvo.')); }
  const busy = useRef(false); const sequence = useRef(1); const attachment = useRef<HTMLInputElement>(null);
  const snapshot = (): Snapshot => ({ clients: data.clients, sales: data.sales, payments: data.payments, remoteSearch: true });
  async function search(query: string, offset = 0) {
    const result = await (await apiFetch(`/api/clients?q=${encodeURIComponent(query)}&offset=${offset}`)).json();
    data.rememberClients(result.clients); return result;
  }
  const append = (text: string, own = false, summary?: string, tone?: Message['tone']) => setMessages(old => [...old, { id: sequence.current++, text, own, summary, tone }]);
  function apply(next: Reply, tone?: Message['tone']) {
    next = { ...next, state: { ...next.state, selectedClientId: next.state.selectedClientId !== undefined ? next.state.selectedClientId : (next.state.type === 'finance' ? next.state.draft.value.clientId : undefined) ?? current.current.state.selectedClientId } };
    current.current = next; setReply(next); if (next.text) append(next.text, false, next.summary, tone);
  }
  const response = (state: State, text: string, choices: string[] = []): Reply => ({ state, text, choices });
  const balanceLabel = (fresh: Snapshot, id: string) => { const balance = clientBalance(fresh.sales, fresh.payments, id); return `${balance >= 0 ? 'Saldo pendente' : 'Crédito'}: ${currency(Math.abs(balance))}`; };
  async function backup() {
    const result = await (await apiFetch('/api/backup')).json();
    if (!result.fingerprint || !['clients', 'sales', 'payments'].every(key => Array.isArray(result.data?.[key]) && result.data[key].length === result.counts?.[key])) throw new Error('Não consegui verificar um backup completo. Nenhum dado será substituído.');
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'backup_ivone.json'; link.click(); URL.revokeObjectURL(url); return result.fingerprint as string;
  }
  async function checkClient(request: ClientRequest): Promise<Reply> {
    if (request.mode === 'create') await search(request.data.fullName);
    const fresh = await refreshData();
    if (request.id) {
      const people = await (await apiFetch(`/api/clients?id=${request.id}`)).json();
      data.rememberClients(people); fresh.clients = [...fresh.clients.filter(c => c.id !== request.id), ...people];
    }
    const equal = (person: typeof fresh.clients[number]) => clientFields.every(([field]) => (person[field] ?? '') === (field === 'fullName' ? request.data[field].trim() : request.data[field] ?? ''));
    const found = request.mode === 'create' ? fresh.clients.filter(c => !request.beforeIds.includes(c.id) && equal(c)) : fresh.clients.filter(c => c.id === request.id && equal(c));
    const deleted = request.mode === 'delete' && !fresh.clients.some(c => c.id === request.id);
    if (found.length === 1 || deleted) {
      sessionStorage.removeItem(clientKey);
      if (deleted) return response({ type: 'idle' }, 'Cliente excluída, sem lançamentos.');
      const next = resumeClient(request, found[0], { ...fresh, remoteSearch: true });
      return { ...next, text: `Verifiquei o resultado sem repetir a gravação. ${next.text}` };
    }
    return response({ type: 'pendingClient', request }, 'Ainda não consegui comprovar essa confirmação. Não vou reenviar o cadastro para evitar duplicação. Consulte novamente; se persistir, será necessária verificação pelo responsável.', ['Verificar resultado']);
  }
  async function saveModalClient(values: ClientData) {
    if (!clientForm || savingClient.current) return;
    savingClient.current = true;
    try {
      let request = modalPending.current;
      if (request) {
        const result = await checkClient(request);
        if (result.state.type !== 'pendingClient') {
          apply({ ...result, text: `${request.mode === 'edit' ? `Dados de ${request.data.fullName} atualizados` : `Cliente ${request.data.fullName} cadastrado`} com sucesso!${request.resume ? '\n' + result.text : '\n\nDeseja fazer mais alguma coisa?'}` });
          modalPending.current = null; setPendingSave(false); setClientForm(null); dirty.current = false; return;
        }
        throw new Error('Ainda não consegui comprovar o salvamento. Consulte novamente; não vou repetir a gravação.');
      }
      if (!request) {
        const matches = await search(values.fullName);
        const changedName = !clientForm.original || normalize(clientForm.original.fullName) !== normalize(values.fullName);
        if (changedName && matches.clients.some((c: any) => c.id !== clientForm.original?.id && normalize(c.fullName) === normalize(values.fullName))) throw new Error('Já existe uma cliente com esse nome. Confira o cadastro ou informe um nome que permita distinguir as pessoas.');
        request = { mode: clientForm.original ? 'edit' : 'create', data: values, id: clientForm.original?.id, beforeIds: matches.clients.map((c: any) => c.id), resume: clientForm.resume };
      }
      modalPending.current = request; sessionStorage.setItem(clientKey, JSON.stringify(request));
      try {
        const saved = await (await apiFetch(request.id ? `/api/clients?id=${request.id}` : '/api/clients', { method: request.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, conversational: true, confirmed: true, ...(clientForm.original ? { expected: clientForm.original } : {}) }) })).json();
        data.rememberClients([saved]);
        sessionStorage.removeItem(clientKey); modalPending.current = null; setPendingSave(false);
        const next = resumeClient(request, saved, snapshot());
        apply({ ...next, text: `${request.mode === 'edit' ? `Dados de ${saved.fullName} atualizados` : `Cliente ${saved.fullName} cadastrado`} com sucesso!${request.resume ? '\n' + next.text : '\n\nDeseja fazer mais alguma coisa?'}` }, 'success');
        setClientForm(null); dirty.current = false;
      } catch (error) {
        if (error instanceof ApiError && [400, 404, 409, 422].includes(error.status)) {
          if (pendingSave && error.status === 409) {
            const recovered = await checkClient(request);
            if (recovered.state.type !== 'pendingClient') { apply(recovered); modalPending.current = null; setPendingSave(false); setClientForm(null); return; }
          }
          sessionStorage.removeItem(clientKey); modalPending.current = null; setPendingSave(false); throw error;
        }
        setPendingSave(true);
        throw new Error('Não consegui confirmar a resposta do salvamento. Seus dados continuam aqui. Toque em Verificar salvamento para consultar sem repetir a gravação.');
      }
    } finally { savingClient.current = false; }
  }
  async function execute(action: Action, before: State) {
    if (action.type === 'openClientForm') { dirty.current = false; setDiscard(false); setClientForm(action.form); return; }
    if (action.type === 'searchClients') {
      const result = await search(action.query, action.offset);
      if (result.clients.length === 1 && !result.hasMore && !result.uncertain) {
        const fresh = await refreshData();
        const next = transition({ ...action.selection, candidates: result.clients }, '1', { ...fresh, remoteSearch: true });
        apply(next); if (next.action) await execute(next.action, before);
      } else apply(searchReply(action.selection, result));
      return;
    }
    if (action.type === 'checkDuplicate') {
      const result = await search(action.client.data.fullName);
      const exact = result.clients.filter((c: any) => normalize(c.fullName) === normalize(action.client.data.fullName));
      if (exact.length) {
        if (action.client.resume) apply(searchReply({ type: 'choose', purpose: 'finance', candidates: [], draft: action.client.resume }, { ...result, clients: exact, hasMore: false }));
        else apply(response({ ...action.client, step: 'name' }, 'Já existe uma cliente com esse nome. Não criei outro cadastro. Informe um nome completo diferente ou cancele para consultar.', ['Cancelar']));
      } else apply({ state: action.client, text: result.clients.length ? `Encontrei nomes parecidos: ${result.clients.map((c: any) => c.fullName).join(', ')}. Confira se é outra pessoa. Só salvo após Confirmar. Para acrescentar informações, diga Corrigir.` : 'Confira o cadastro. Só salvo após Confirmar. Para acrescentar informações, diga Corrigir.', choices: ['Confirmar', 'Corrigir', 'Cancelar'], summary: clientSummary(action.client.data) });
      return;
    }
    if (action.type === 'financial' || action.type === 'retryFinancial') {
      const draft = action.type === 'financial' ? action.draft : null;
      const operation: FinancialOperation = action.type === 'retryFinancial' ? action.operation : { operationId: crypto.randomUUID(), confirmed: true, kind: draft!.kind, targetId: draft!.targetId, clientId: draft!.value.clientId!, date: draft!.value.date, observation: draft!.value.observation, items: draft!.value.items.map(i => ({ ...i, unitCents: i.unitCents! })), receivedCents: draft!.received ?? 0, amountCents: draft!.value.amountCents, allowCredit: draft!.allowCredit };
      apply(response({ type: 'pendingFinancial', operation }, 'Conferindo sua confirmação…'));
      try {
        const result = await commitOperation(operation); const name = data.clients.find(c => c.id === result.clientId)?.fullName ?? 'Cliente';
        apply(followUp(operation.clientId, `${result.replayed ? 'Já estava salvo; não dupliquei.' : operation.kind.startsWith('delete_') ? 'Lançamento excluído.' : operation.kind.startsWith('edit_') ? 'Lançamento atualizado.' : 'Anotado com carinho!'}\n${name}\n${result.balanceCents >= 0 ? 'Saldo pendente' : 'Crédito'}: ${currency(Math.abs(result.balanceCents))}`), 'success');
      } catch (e) {
        if (e instanceof ApiError && [400, 404, 422].includes(e.status) && draft) apply({ ...transition(before, 'Corrigir', snapshot()), text: `${e.message}\nO que devo corrigir?` });
        else apply(response({ type: 'pendingFinancial', operation }, 'A confirmação foi enviada, mas não consegui comprovar o resultado. Vou usar o mesmo identificador, sem duplicar. Não comece outra operação ainda.', ['Verificar resultado']));
      }
      return;
    }
    if (action.type === 'client') {
      if (action.request.mode === 'create') await search(action.request.data.fullName);
      const fresh = await refreshData(); const request = action.request; const person = fresh.clients.find(c => c.id === request.id);
      if (request.mode !== 'create' && !person) throw new Error('Essa cliente não existe mais. Cancele e consulte novamente.');
      if (request.mode === 'create' && fresh.clients.some(c => c.fullName.trim().toLocaleLowerCase('pt-BR') === request.data.fullName.trim().toLocaleLowerCase('pt-BR'))) throw new Error('Esse nome já existe. Cancele e consulte o cadastro antes de criar outra cliente.');
      if (request.mode === 'delete' && (fresh.sales.some(s => s.clientId === request.id) || fresh.payments.some(p => p.clientId === request.id))) throw new Error('A cliente possui lançamentos. Exclusão bloqueada para preservar o histórico.');
      const original = before.type === 'client' ? before.original : undefined;
      if (original && person && !clientFields.every(([field]) => original[field] === person[field])) throw new Error('O cadastro mudou durante a conversa. Cancele e consulte novamente antes de alterar.');
      request.beforeIds = fresh.clients.map(c => c.id); sessionStorage.setItem(clientKey, JSON.stringify(request));
      apply(response({ type: 'pendingClient', request }, 'Enviando a confirmação do cadastro…'));
      try {
        if (request.mode === 'create') { const saved = await (await apiFetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request.data, conversational: true, confirmed: true }) })).json(); data.rememberClients([saved]); }
        else if (request.mode === 'edit') await data.updateClient({ ...request.data, id: request.id! });
        else await apiFetch(`/api/clients?id=${request.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true, preserveHistory: true }) });
        apply(await checkClient(request));
      } catch (e) {
        if (e instanceof ApiError && [400, 404, 409, 422].includes(e.status)) { sessionStorage.removeItem(clientKey); apply({ ...transition(before, 'Corrigir', fresh), text: e.message + '\nCorrija ou cancele para continuar.' }); }
        else { try { apply(await checkClient(request)); } catch { apply(response({ type: 'pendingClient', request }, 'Não consegui verificar o cadastro. Não vou reenviar para evitar duplicação.', ['Verificar resultado'])); } }
      }
      return;
    }
    if (action.type === 'checkClient') { apply(await checkClient(action.request)); return; }
    if (action.type === 'theme') { localStorage.setItem('ivone_theme', action.dark ? 'dark' : 'light'); document.documentElement.classList.toggle('dark', action.dark); return; }
    if (action.type === 'backup') { await backup(); apply(response({ type: 'idle' }, 'Backup completo baixado. Nenhum registro foi alterado.')); return; }
    if (action.type === 'logout') { await logout(); return; }
    if (action.type === 'restore') {
      const state = action.state; sessionStorage.setItem(restoreKey, JSON.stringify({ hash: state.hash, restoreId: state.restoreId })); apply(response({ ...state, attempted: true }, 'Conferindo a restauração…'));
      try {
        await apiFetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: state.data, restoreId: state.restoreId, backupFingerprint: state.fingerprint, confirmed: true }) });
        sessionStorage.removeItem(restoreKey); const fresh = await refreshData(); apply(response({ type: 'idle' }, `Restauração concluída. Usuários foram preservados.\n${fresh.clients.map(c => `${c.fullName}: ${balanceLabel(fresh, c.id)}`).join('\n') || 'Não há clientes no arquivo.'}`));
      } catch (e) {
        if (e instanceof ApiError && [400, 404, 409, 422].includes(e.status)) { sessionStorage.removeItem(restoreKey); apply(response({ type: 'idle' }, `Restauração recusada pelo servidor: ${e.message}\nConsulte os registros e comece uma nova conversa de restauração se necessário.`)); }
        else apply(response({ ...state, attempted: true }, `${e instanceof Error ? e.message : 'Não consegui comprovar o resultado.'}\nVou usar a mesma confirmação para verificar.`, ['Verificar resultado']));
      }
    }
  }
  async function send(text: string) {
    if (!text.trim() || busy.current) return;
    if (text === 'Anexar backup') { attachment.current?.click(); return; }
    busy.current = true; setWorking(true); setInput(''); append(text, true); const before = current.current.state;
    try { const fresh = await refreshData(); const next = transition(before, text, { ...fresh, remoteSearch: true }); apply(next); if (next.action) await execute(next.action, before); }
    catch (e: any) { apply(response(before, e.message || 'Não consegui atualizar. Nenhuma nova confirmação foi enviada.', current.current.choices), 'error'); }
    finally { busy.current = false; setWorking(false); }
  }
  async function attach(file: File) {
    if (busy.current || current.current.state.type !== 'attachment') return;
    busy.current = true; setWorking(true); append('Anexei um arquivo de backup.', true); const before = current.current;
    try {
      if (file.size > 4_000_000) throw new Error('Esse arquivo é grande demais para a API atual. Nenhum dado foi alterado.');
      const content = JSON.parse(await file.text()); const records = content.data ?? content;
      if (!['clients', 'sales', 'payments'].every(key => Array.isArray(records[key]))) throw new Error('Arquivo incompleto. Preciso de clientes, vendas e pagamentos.');
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(records))))).map(byte => byte.toString(16).padStart(2, '0')).join(''); const pending = JSON.parse(sessionStorage.getItem(restoreKey) ?? 'null');
      if (pending && pending.hash !== hash) throw new Error('Escolha o mesmo arquivo da restauração pendente.');
      const fingerprint = await backup();
      apply({ state: { type: 'restore', data: records, hash, restoreId: pending?.restoreId ?? crypto.randomUUID(), fingerprint, attempted: !!pending }, text: pending ? 'Vou verificar a restauração anterior com o mesmo identificador.' : 'Baixei um backup atual. Confira antes de substituir os registros.', choices: pending ? ['Verificar resultado'] : ['Confirmar', 'Corrigir', 'Cancelar'], summary: `Restaurar backup\nClientes: ${records.clients.length}\nVendas: ${records.sales.length}\nPagamentos: ${records.payments.length}\nEsses registros atuais serão substituídos. Usuários e configurações serão preservados.` });
    } catch (e: any) { apply({ ...before, text: e.message || 'Não consegui abrir esse arquivo.' }); }
    finally { busy.current = false; setWorking(false); }
  }
  const blocked = reply.state.type === 'blocked';
  return <><div inert={Boolean(clientForm)} aria-hidden={clientForm ? true : undefined}><ChatFrame revision={`${messages.length}:${working}`} actions={<button disabled={working || reply.state.type !== 'idle'} onClick={() => void send('Sair')}>Sair</button>} footer={<>
    <form className="chat-composer" onSubmit={event => { event.preventDefault(); void send(input); }}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Converse com seu Caderninho…" aria-label="Mensagem" maxLength={2000} autoComplete="off" disabled={working || blocked} /><button type="submit" aria-label="Enviar mensagem" disabled={!input.trim() || working || blocked}><ArrowUp size={22} /></button></form>
    {reply.state.type === 'attachment' && <input ref={attachment} hidden aria-label="Arquivo de backup" type="file" accept=".json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void attach(file); }} />}
    <p className="chat-footer-note">{user?.username === 'Teste local fictício' ? 'Teste local · dados fictícios · só salvo após confirmar.' : 'Só anoto depois da sua confirmação.'}</p>
  </>}>
    {dataError && <div className="chat-bubble" role="alert"><p>{dataError}</p><button disabled={working} onClick={() => void send('Verificar resultado')}>Tentar atualizar</button></div>}
    {messages.map(message => <div key={message.id} className={`chat-bubble ${message.own ? 'chat-own' : ''} ${message.summary ? 'chat-conversation-summary' : ''} ${message.tone ? `chat-${message.tone}` : ''}`}><p>{message.text}</p>{message.summary && <p className="chat-summary-text">{message.summary}</p>}<span className="chat-bubble-caption">{message.own ? 'Você ✓✓' : 'Caderninho'}</span></div>)}
    {!!reply.choices.length && <div className={`chat-bubble chat-conversation-options ${reply.state.type === 'clientMenu' ? 'chat-client-menu' : ''}`} aria-label={reply.state.type === 'clientMenu' ? 'Operações da cliente' : 'Respostas disponíveis'}>
      {reply.state.type === 'clientMenu' && <div className="chat-client-menu-heading"><h2>{reply.state.person.fullName}</h2><p>O que deseja fazer com esta cliente?</p></div>}
      <div className="chat-client-options">{reply.choices.map((choice, index) => { const Icon = reply.state.type === 'clientMenu' ? menuIcons[index] : null; return <button key={`${index}:${choice}`} data-choice={choice} disabled={working || isRefreshing || blocked} onClick={() => void send(choice)}>{Icon && <Icon size={19} strokeWidth={1.6} aria-hidden="true" />}<span>{choice}</span></button>; })}</div>
    </div>}
  </ChatFrame></div>
    <Modal isOpen={Boolean(clientForm)} clientMode onClose={closeClientForm} title={clientForm?.original ? 'Editar cliente' : 'Cadastrar cliente'}>
      {clientForm && <>
        {discard && <div role="alertdialog" aria-label="Descartar alterações" className="client-discard-confirm"><p>Há alterações não salvas. Deseja descartá-las?</p><Button type="button" onClick={cancelClientForm}>Descartar alterações</Button><Button type="button" variant="secondary" onClick={() => setDiscard(false)}>Continuar preenchendo</Button></div>}
        <div inert={discard || undefined}><ClientForm client={clientForm.original} initialData={clientForm.data} onDone={() => {}} onSave={saveModalClient} onCancel={closeClientForm} onDirtyChange={value => { dirty.current = value; }} pendingSave={pendingSave} /></div>
      </>}
    </Modal>
  </>;
}
