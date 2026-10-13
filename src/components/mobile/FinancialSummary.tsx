import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, HandCoins, Wallet, ChevronRight, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { currency } from '../../lib/finance';
import { DEBTOR_PAGE_SIZE, type DebtorPage, type FinancialOverview } from '../../lib/mobile-financial';
import { Modal } from '../common/Modal';
import { Button } from '../common';
import './financial-summary.css';

export function FinancialSummary({ revision, canSelect, onSelect, onModalChange }: {
  revision: number; canSelect: boolean; onSelect: (id: string) => Promise<void>; onModalChange: (open: boolean) => void;
}) {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [overviewError, setOverviewError] = useState(''); const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const [page, setPage] = useState<DebtorPage | null>(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [selecting, setSelecting] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const abort = new AbortController(); setOverviewError('');
    apiFetch('/api/operations?mode=overview', { signal: abort.signal }).then(r => r.json()).then(value => { if (!abort.signal.aborted) setOverview(value); }).catch(() => {
      if (!abort.signal.aborted) { setOverview(null); setOverviewError('Não consegui atualizar o resumo.'); }
    });
    return () => abort.abort();
  }, [revision, retry]);
  useEffect(() => { onModalChange(open); return () => onModalChange(false); }, [open, onModalChange]);
  useEffect(() => {
    const request = ++generation.current; if (!open) return;
    const abort = new AbortController(); setPage(null); setLoading(true); setError('');
    const timer = window.setTimeout(() => {
      apiFetch(`/api/operations?mode=debtors&q=${encodeURIComponent(query)}`, { signal: abort.signal }).then(r => r.json()).then(value => {
        if (request === generation.current && !abort.signal.aborted) { setPage(value); setOverview(old => old ? { ...old, pendingCents: value.pendingCents } : old); }
      }).catch(() => { if (!abort.signal.aborted) setError('Não consegui consultar as clientes. Tente novamente.'); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [open, query, revision, retry]);
  async function more() {
    if (!page || loading) return;
    const request = generation.current; setLoading(true); setError('');
    try {
      const next: DebtorPage = await (await apiFetch(`/api/operations?mode=debtors&q=${encodeURIComponent(query)}&offset=${page.offset + DEBTOR_PAGE_SIZE}`)).json();
      if (request === generation.current) setPage({ ...next, clients: [...page.clients, ...next.clients.filter(c => !page.clients.some(p => p.id === c.id))] });
    } catch { if (request === generation.current) setError('Não consegui carregar mais clientes. Tente novamente.'); }
    finally { if (request === generation.current) setLoading(false); }
  }
  async function select(id: string) {
    if (selecting || !canSelect) return;
    setSelecting(true); setError('');
    try { await onSelect(id); setOpen(false); } catch (e) { setError(e instanceof Error ? e.message : 'Não consegui selecionar essa cliente.'); }
    finally { setSelecting(false); }
  }
  const value = (amount: number | undefined) => amount === undefined ? '—' : currency(amount);
  return <>
    <section className="mobile-financial-summary" aria-label="Resumo financeiro">
      <div className="mobile-financial-card" data-indicator="sales"><span><ShoppingBag size={14} aria-hidden="true" />Vendas do mês</span><strong>{value(overview?.salesCents)}</strong></div>
      <div className="mobile-financial-card" data-indicator="received"><span><HandCoins size={14} aria-hidden="true" />Recebido no mês</span><strong>{value(overview?.receivedCents)}</strong></div>
      <button type="button" className="mobile-financial-card mobile-financial-pending" data-indicator="pending" aria-haspopup="dialog" onClick={() => { setQuery(''); setOpen(true); }}><span><Wallet size={14} aria-hidden="true" />Total a receber</span><strong>{value(overview?.pendingCents)}</strong></button>
      {overviewError && <p role="status" className="mobile-summary-error">{overviewError} <button type="button" onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></p>}
    </section>
    {open && createPortal(<Modal isOpen clientMode onClose={() => { if (!selecting) setOpen(false); }} title="Clientes com saldo devedor" contentClassName="debtors-modal-panel">
      <div className="debtors-content">
        <div className="debtors-total"><span>Total pendente · todo o histórico</span><strong>{value(page?.pendingCents ?? overview?.pendingCents)}</strong></div>
        <label className="debtors-search"><Search size={18} aria-hidden="true" /><input aria-label="Buscar devedora por nome" type="search" maxLength={300} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar pelo nome" /></label>
        <p className="debtors-sort">Maior dívida primeiro</p>
        {!canSelect && <p className="debtors-note">Conclua ou cancele a operação no chat para selecionar outra cliente.</p>}
        <div className="debtors-list" aria-label="Lista de devedores" aria-busy={loading}>
          {page?.clients.map(person => <button type="button" key={person.id} data-client-id={person.id} disabled={!canSelect || selecting || loading} onClick={() => void select(person.id)}><span>{person.fullName}</span><strong>{currency(person.balanceCents)}</strong><ChevronRight size={17} aria-hidden="true" /></button>)}
          {!loading && !error && page && !page.clients.length && <p>Nenhuma cliente com saldo pendente{query ? ' para esse nome' : ''}.</p>}
          {loading && <p role="status">Carregando…</p>}
          {error && <p role="alert" className="debtors-error">{error}</p>}
          {error && !page && <Button type="button" variant="secondary" onClick={() => setRetry(n => n + 1)}>Tentar novamente</Button>}
          {page?.hasMore && <Button type="button" variant="secondary" disabled={loading || selecting} onClick={() => void more()}>Carregar mais</Button>}
        </div>
        <div className="debtors-actions"><Button type="button" variant="secondary" disabled={selecting} onClick={() => setOpen(false)}>Fechar</Button></div>
      </div>
    </Modal>, document.body)}
  </>;
}
