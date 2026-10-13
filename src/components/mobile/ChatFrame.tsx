import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { BookHeart, Flower2 } from 'lucide-react';
import './mobile-chat.css';
export function ChatFrame({ children, footer, actions, revision, summary }: { children: ReactNode; footer: ReactNode; actions: ReactNode; revision: unknown; summary?: ReactNode }) {
  const feed = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const view = window.visualViewport;
    const resize = () => setViewport({ height: view?.height ?? window.innerHeight, top: view?.offsetTop ?? 0 });
    resize(); view?.addEventListener('resize', resize); view?.addEventListener('scroll', resize); window.addEventListener('resize', resize);
    return () => { view?.removeEventListener('resize', resize); view?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    if (!feed.current) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && feed.current.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    else feed.current.scrollTop = feed.current.scrollHeight;
  }, [revision, viewport]);
  return <div className="chat-demo chat-official" style={viewport ? { height: viewport.height, top: viewport.top } : undefined}><div className="chat-phone">
    <header className="chat-header"><div className="chat-avatar"><BookHeart size={26} aria-hidden="true" /></div><div className="chat-heading"><h1>Caderninho</h1><p>Seu cuidado, em cada detalhe</p></div><Flower2 className="chat-flower" size={27} aria-hidden="true" /></header>
    {summary}
    <div className="chat-demo-label"><span>SEU CADERNINHO DE VENDAS</span><div className="chat-session-actions">{actions}</div></div>
    <div className="chat-feed" ref={feed} role="log" aria-label="Conversa com o Caderninho" aria-live="polite" aria-relevant="additions text"><div className="chat-day">Vamos organizar com carinho</div><div className="chat-welcome"><Flower2 size={22} /><strong>Um jeitinho simples de organizar</strong><span>Vendas, recebimentos e carinho.</span></div>{children}</div>
    <footer className="chat-footer">{footer}</footer>
  </div></div>;
}
