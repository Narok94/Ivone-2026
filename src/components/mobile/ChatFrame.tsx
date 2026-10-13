import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { BookHeart, Flower2 } from 'lucide-react';
import './mobile-chat.css';
export function ChatFrame({ children, footer, actions, revision, summary }: { children: ReactNode; footer: ReactNode; actions: ReactNode; revision: unknown; summary?: ReactNode }) {
  const feed = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null); const atBottom = useRef(true);
  const [viewport, setViewport] = useState<{ height: number; top: number; keyboard: boolean } | null>(null);
  useLayoutEffect(() => {
    const root = document.documentElement; const alreadyLocked = root.classList.contains('caderninho-mobile');
    const position = { x: window.scrollX, y: window.scrollY };
    root.classList.add('caderninho-mobile');
    return () => { if (!alreadyLocked) { root.classList.remove('caderninho-mobile'); window.scrollTo(position.x, position.y); } };
  }, []);
  useLayoutEffect(() => {
    const view = window.visualViewport;
    let frame = 0; let width = window.innerWidth; let fullHeight = window.innerHeight;
    const measure = () => {
      frame = 0;
      if (width !== window.innerWidth) { width = window.innerWidth; fullHeight = window.innerHeight; }
      fullHeight = Math.max(fullHeight, window.innerHeight);
      const height = view?.height ?? window.innerHeight; const top = view?.offsetTop ?? 0;
      const active = document.activeElement;
      const keyboard = (view?.scale ?? 1) === 1 && fullHeight - height > 120 && active instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(active.tagName);
      setViewport(old => old?.height === height && old.top === top && old.keyboard === keyboard ? old : { height, top, keyboard });
    };
    const resize = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure(); view?.addEventListener('resize', resize); view?.addEventListener('scroll', resize); window.addEventListener('resize', resize); document.addEventListener('focusin', resize); document.addEventListener('focusout', resize);
    return () => { cancelAnimationFrame(frame); view?.removeEventListener('resize', resize); view?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); document.removeEventListener('focusin', resize); document.removeEventListener('focusout', resize); };
  }, []);
  useLayoutEffect(() => { atBottom.current = true; if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [revision]);
  useLayoutEffect(() => { if (atBottom.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [viewport]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => { if (atBottom.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight; });
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return <div className={`chat-demo chat-official ${viewport && viewport.height < 550 ? 'chat-compact' : ''} ${viewport?.keyboard ? 'chat-keyboard-open' : ''}`} style={viewport ? { height: viewport.height, top: viewport.top } : undefined}><div className="chat-phone">
    <div className="chat-top">
    <header className="chat-header"><div className="chat-avatar"><BookHeart size={26} aria-hidden="true" /></div><div className="chat-heading"><h1>Caderninho</h1><p>Seu cuidado, em cada detalhe</p></div><Flower2 className="chat-flower" size={27} aria-hidden="true" /></header>
    {summary}
    <div className="chat-demo-label"><span>SEU CADERNINHO DE VENDAS</span><div className="chat-session-actions">{actions}</div></div>
    </div>
    <div className="chat-feed" ref={feed} onScroll={() => { const node = feed.current; if (node) atBottom.current = node.scrollHeight - node.clientHeight - node.scrollTop < 48; }} role="log" aria-label="Conversa com o Caderninho" aria-live="polite" aria-relevant="additions text"><div ref={content}><div className="chat-day">Vamos organizar com carinho</div><div className="chat-welcome"><Flower2 size={22} /><strong>Um jeitinho simples de organizar</strong><span>Vendas, recebimentos e carinho.</span></div>{children}</div></div>
    <footer className="chat-footer">{footer}</footer>
  </div></div>;
}
