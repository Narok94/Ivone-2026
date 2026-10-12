import React, { FC, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { XIcon } from '../ui/Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    contentClassName?: string;
    clientMode?: boolean;
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName = '', clientMode = false }) => {
    const dialog = useRef<HTMLDivElement>(null); const close = useRef(onClose); close.current = onClose;
    const titleId = useId(); const [viewport, setViewport] = useState<{height: number; top: number} | null>(null);
    useEffect(() => {
        if (!isOpen || !clientMode) return;
        const previous = document.activeElement as HTMLElement | null;
        const view = window.visualViewport;
        const resize = () => setViewport({height: view?.height ?? window.innerHeight, top: view?.offsetTop ?? 0});
        resize(); view?.addEventListener('resize', resize); view?.addEventListener('scroll', resize); window.addEventListener('resize', resize);
        dialog.current?.querySelector<HTMLElement>('input,button')?.focus();
        return () => { view?.removeEventListener('resize', resize); view?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); previous?.focus(); };
    }, [isOpen, clientMode]);
    useEffect(() => { const active = document.activeElement; if (clientMode && active instanceof HTMLElement && dialog.current?.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) active.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [viewport, clientMode]);
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-md animate-in fade-in duration-300 ${clientMode ? 'client-modal-overlay' : ''}`} style={clientMode && viewport ? {height: viewport.height, top: viewport.top} : undefined}>
            <div ref={dialog} role={clientMode ? 'dialog' : undefined} aria-modal={clientMode || undefined} aria-labelledby={clientMode ? titleId : undefined} onKeyDown={clientMode ? event => {
                if (event.key === 'Escape') { event.preventDefault(); close.current(); }
                if (event.key === 'Tab') { const nodes = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(n => n.offsetParent !== null && !n.closest('[inert]')); const first = nodes[0], last = nodes.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
            } : undefined} className={`bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${clientMode ? 'client-modal-panel' : ''} ${contentClassName}`}>
                <div className={`p-8 flex justify-between items-center border-b border-rose-50 ${clientMode ? 'client-modal-heading' : ''}`}>
                    <h2 id={titleId} className="text-2xl font-black text-rose-900 italic tracking-tight">{title}</h2>
                    <button type="button" aria-label="Fechar formulário" onClick={onClose} className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-rose-300 hover:text-rose-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className={`p-8 max-h-[80vh] overflow-y-auto ${clientMode ? 'client-modal-body' : ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
