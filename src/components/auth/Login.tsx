import React, { FC, useEffect, useRef, useState } from 'react';
import { useData } from '../../contexto/DataContext';
import { LockIcon, HeartIcon } from '../ui/Icons';
import { ChevronRight } from 'lucide-react';
import './login.css';

export const Login: FC = () => {
    const { login } = useData();
    const [digits, setDigits] = useState(['', '', '', '']);
    const pin = digits.join('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const [viewport, setViewport] = useState<{ height: number; top: number; keyboard: boolean } | null>(null);
    useEffect(() => {
        const view = window.visualViewport;
        const resize = () => setViewport({ height: view?.height ?? window.innerHeight, top: view?.offsetTop ?? 0, keyboard: (view?.height ?? window.innerHeight) < window.innerHeight * .8 });
        resize(); view?.addEventListener('resize', resize); view?.addEventListener('scroll', resize); window.addEventListener('resize', resize);
        return () => { view?.removeEventListener('resize', resize); view?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); };
    }, []);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) { setError('O PIN deve ter 4 números. 🌸'); return; }
        setIsLoading(true); setError(null);
        try { const result = await login(pin); if (!result.success) setError(result.message || 'Erro ao entrar.'); }
        finally { setIsLoading(false); }
    };
    const handlePinChange = (val: string, index: number) => {
        if (!/^\d*$/.test(val) || val.length > 4) return;
        setDigits(old => {
            const next = [...old];
            if (val.length === 4) return val.split('');
            if (!val) next[index] = '';
            else val.split('').forEach((digit, offset) => { if (index + offset < 4) next[index + offset] = digit; });
            return next;
        });
        setError(null);
        if (val) inputs.current[Math.min(3, val.length === 4 ? 3 : index + val.length)]?.focus();
    };
    return <main className="login-floral" data-keyboard={viewport?.keyboard || undefined} style={viewport ? { height: viewport.height, top: viewport.top } : undefined}>
        <div className="login-floral-content">
            <header className="login-greeting"><h1>Olá, Ivone! <span aria-hidden="true">🌸</span></h1><p>Seu caderninho digital<br />está pronto.</p></header>
            <form className="login-form" onSubmit={handleSubmit} aria-label="Acessar Caderninho">
                <div className="login-heart-divider" aria-hidden="true"><span /><HeartIcon fill="currentColor" /><span /></div>
                <p id="login-pin-instruction" className="login-pin-instruction">Digite seu PIN para acessar<br />seus registros de vendas.</p>
                <div className="login-pin-fields" role="group" aria-label="PIN de quatro números" aria-describedby="login-pin-instruction">
                    {digits.map((digit, index) => <div className="login-pin-cell" key={index}>
                        {index === 0 && !digit && <span className="login-pin-lock" aria-hidden="true"><LockIcon /></span>}
                        <input ref={node => { inputs.current[index] = node; }} type="password" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={4}
                            aria-label={`Número ${index + 1} do PIN`} aria-invalid={Boolean(error)} aria-describedby={error ? 'login-pin-error' : 'login-pin-instruction'}
                            placeholder={index === 0 ? 'PIN de 4 números' : undefined} value={digit} disabled={isLoading}
                            onFocus={e => e.currentTarget.select()} onChange={e => handlePinChange(e.target.value, index)}
                            onPaste={e => { e.preventDefault(); handlePinChange(e.clipboardData.getData('text').trim(), index); }}
                            onKeyDown={e => {
                                const target = e.key === 'ArrowLeft' ? Math.max(0, index - 1) : e.key === 'ArrowRight' ? Math.min(3, index + 1) : e.key === 'Home' ? 0 : e.key === 'End' ? 3 : null;
                                if (target !== null) { e.preventDefault(); inputs.current[target]?.focus(); }
                                if (e.key === 'Backspace' && !digit && index > 0) { e.preventDefault(); handlePinChange('', index - 1); inputs.current[index - 1]?.focus(); }
                            }} />
                    </div>)}
                </div>
                {error && <p id="login-pin-error" className="login-error" role="alert">{error}</p>}
                <button type="submit" className="login-access" disabled={isLoading || pin.length < 4} aria-busy={isLoading}>
                    <span>{isLoading ? 'Acessando...' : 'Acessar Caderninho'} <span className="login-sparkle" aria-hidden="true">✨</span></span><span className="login-access-arrow" aria-hidden="true"><ChevronRight /></span>
                </button>
            </form>
        </div>
    </main>;
};
