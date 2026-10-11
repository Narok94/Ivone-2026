import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookHeart, ChevronRight, ClipboardList, Flower2, Plus, ReceiptText, Wallet } from 'lucide-react';
import { balance, Entry, initialEntries, money, parseEntry } from '../../demo/chat';
import './mobile-chat.css';

type Message = { id: number; text: string; own?: boolean };
const shortcuts = [
  { label: 'Nova Venda', icon: Plus, text: 'Venda Ana perfume 85,00' },
  { label: 'Recebimento', icon: Wallet, text: 'Recebimento Ana pagamento 40,00' },
  { label: 'Extrato', icon: ReceiptText, text: 'Extrato Ana' },
  { label: 'Pendências', icon: ClipboardList, text: 'Pendências' },
];
export default function MobileChatDemo({ standalone = false }: { standalone?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>(() => initialEntries.map(e => ({ ...e })));
  const [messages, setMessages] = useState<Message[]>([{ id: 0, text: 'Oi! Eu sou seu Caderninho 🌷\nVamos cuidar das suas vendas com calma? Escolha um atalho ou escreva uma mensagem.' }]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<Entry | null>(null);
  const [draftText, setDraftText] = useState('');
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const sequence = useRef(1);
  const feed = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const add = (text: string, own = false) => setMessages(old => [...old, { id: sequence.current++, text, own }]);
  useEffect(() => {
    const v = window.visualViewport;
    const resize = () => setViewport({ height: v?.height ?? window.innerHeight, top: v?.offsetTop ?? 0 });
    resize();
    v?.addEventListener('resize', resize); v?.addEventListener('scroll', resize); window.addEventListener('resize', resize);
    return () => { v?.removeEventListener('resize', resize); v?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [messages, draft, viewport]);
  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    if (draft) { add('Confirme, corrija ou cancele o resumo antes de continuar.'); return; }
    add(value, true); setInput('');
    if (/^pend[eê]ncias$/i.test(value)) {
      add(`Pendências fictícias\n${['Ana', 'Bia'].map(client => `${client}: ${money(Math.max(0, balance(entries, client)))}`).join('\n')}`); return;
    }
    const statement = value.match(/^extrato\s+(ana|bia)$/i);
    if (statement) {
      const client = statement[1].toLowerCase() === 'ana' ? 'Ana' : 'Bia';
      add(`Extrato de ${client}\n${entries.filter(e => e.client === client).map(e => `${e.kind === 'sale' ? 'Venda' : 'Recebimento'} · ${e.description}: ${money(e.cents)}`).join('\n')}\nSaldo pendente: ${money(balance(entries, client))}`); return;
    }
    const entry = parseEntry(value);
    if (!entry) { add('Vamos tentar assim?\n“Venda Ana perfume 85,00”\n“Recebimento Ana pagamento 40,00”\n“Extrato Ana” ou “Pendências”.\nNesta demonstração, use Ana ou Bia.'); return; }
    if (entry.kind === 'payment' && entry.cents > balance(entries, entry.client)) { add(`O recebimento ultrapassa o saldo de ${money(balance(entries, entry.client))}. Corrija o valor para continuar.`); setInput(value); return; }
    setDraft(entry); setDraftText(value);
  }
  return <div className="chat-demo" style={viewport ? { height: viewport.height, top: viewport.top } : undefined}>
    <div className="chat-phone">
      <header className="chat-header">
        <div className="chat-avatar"><BookHeart size={26} aria-hidden="true" /></div>
        <div className="chat-heading"><h1>Caderninho</h1><p>Seu cuidado, em cada detalhe</p></div>
        <Flower2 className="chat-flower" size={27} aria-hidden="true" />
      </header>
      <div className="chat-demo-label"><span>DEMONSTRAÇÃO · DADOS FICTÍCIOS</span>{standalone ? <span>Sem dados reais</span> : <a href="/?modo=gestao">Gestão atual <ChevronRight size={12} /></a>}</div>
      <div className="chat-feed" ref={feed} role="log" aria-label="Conversa com o Caderninho" aria-live="polite" aria-relevant="additions text">
        <div className="chat-day">Seu caderninho de hoje</div>
        <div className="chat-welcome"><Flower2 size={22} /><strong>Um jeitinho simples de organizar</strong><span>Vendas, recebimentos e carinho.</span></div>
        {messages.map(message => <div key={message.id} className={`chat-bubble ${message.own ? 'chat-own' : ''}`}><p>{message.text}</p><span className="chat-bubble-caption">{message.own ? 'Você' : 'Caderninho'} {message.own && '✓✓'}</span></div>)}
        {draft && <section className="chat-confirm" aria-label="Resumo para confirmação">
          <div className="chat-confirm-tag">Confira com carinho</div>
          <h2>{draft.kind === 'sale' ? 'Nova venda' : 'Recebimento'}</h2>
          <dl><div><dt>Cliente</dt><dd>{draft.client}</dd></div><div><dt>{draft.kind === 'sale' ? 'Produto' : 'Descrição'}</dt><dd>{draft.description}</dd></div><div className="chat-total"><dt>Valor</dt><dd>{money(draft.cents)}</dd></div></dl>
          <p>Será registrado apenas nesta demonstração.</p>
          <button className="chat-confirm-primary" onClick={() => { setEntries(old => [...old, draft]); add(`${draft.kind === 'sale' ? 'Venda confirmada' : 'Recebimento confirmado'} na demonstração 🌷\nSaldo de ${draft.client}: ${money(balance(entries, draft.client) + (draft.kind === 'sale' ? draft.cents : -draft.cents))}\nNenhum dado foi salvo no banco.`); setDraft(null); }}>Confirmar</button>
          <div className="chat-confirm-secondary"><button onClick={() => { setInput(draftText); setDraft(null); add('Tudo bem! Ajuste a mensagem e envie novamente.'); field.current?.focus(); }}>Corrigir</button><button onClick={() => { setDraft(null); add('Cancelado. Nenhum registro foi adicionado.'); }}>Cancelar</button></div>
        </section>}
      </div>
      <footer className="chat-footer">
        <div className="chat-shortcuts" aria-label="Atalhos">{shortcuts.map(({ label, icon: Icon, text }) => <button key={label} disabled={!!draft} onClick={() => { if (label === 'Extrato' || label === 'Pendências') send(text); else { setInput(text); field.current?.focus(); } }}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}</div>
        <form className="chat-composer" onSubmit={event => { event.preventDefault(); send(input); }}><input ref={field} value={input} onChange={event => setInput(event.target.value)} placeholder="Escreva aqui…" aria-label="Mensagem" maxLength={300} autoComplete="off" disabled={!!draft} /><button type="submit" disabled={!input.trim() || !!draft} aria-label="Enviar mensagem"><ArrowUp size={22} /></button></form>
        <p className="chat-footer-note">Só uma demonstração. Ao recarregar, tudo recomeça.</p>
      </footer>
    </div>
  </div>;
}
