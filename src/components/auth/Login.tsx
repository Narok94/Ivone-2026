import React, { FC, useState } from 'react';
import { useData } from '../../contexto/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { LockIcon, InfinityIcon } from '../ui/Icons';

export const Login: FC = () => {
    const { login } = useData();
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setError('O PIN deve ter 4 números. 🌸');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const result = await login(pin);
            if (!result.success) {
                setError(result.message || 'Erro ao entrar.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinChange = (val: string) => {
        if (/^\d*$/.test(val) && val.length <= 4) {
            setPin(val);
            setError(null);
        }
    };

    const rings = Array.from({ length: 18 });

    return (
        <div className="w-full max-w-sm mx-auto overflow-hidden shadow-2xl rounded-3xl bg-[#FFF9FB] flex flex-col relative border-4 border-rose-200 paper-texture animate-modal-scale-in">
            {/* iOS Status Bar Mockup */}
            <div className="flex justify-between items-center px-6 py-2 text-rose-800 text-xs font-bold bg-white/50 backdrop-blur-sm z-10">
                <span>09:59</span>
                <div className="flex gap-1.5 items-center">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21L1 10h11v11zm1-11v11l11-11H13z"/></svg> {/* Signal Icon */}
                    <span className="text-[10px]">4G</span>
                    <div className="w-6 h-3 border border-rose-800 rounded-[2px] relative">
                         <div className="absolute left-0 top-0 bottom-0 bg-rose-800 w-[47%]" />
                         <div className="absolute right-[-2px] top-[2px] w-0.5 h-1.5 bg-rose-800 rounded-r-full" />
                    </div>
                </div>
            </div>

            {/* Top Gradient */}
            <div className="h-24 bg-gradient-to-r from-rose-500 via-pink-600 to-purple-800 flex items-center justify-center relative overlow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />
                <h1 className="text-white text-center font-black text-sm uppercase tracking-[0.2em] px-4 drop-shadow-md z-10">
                    IVONE-2026: CADERNINHO DIGITAL DE VENDAS
                </h1>
            </div>

            {/* Notebook Content Area */}
            <div className="relative flex-1 notebook-page p-6 pl-10">
                {/* Spiral Rings */}
                <div className="notebook-spiral-container">
                    {rings.map((_, i) => (
                        <div key={i} className="notebook-ring" />
                    ))}
                </div>

                {/* Header */}
                <div className="flex flex-col items-center mt-4">
                    <div className="w-16 h-16 bg-pink-100/80 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-pink-200">
                        <InfinityIcon className="w-10 h-10 text-pink-600" />
                    </div>
                    
                    <h2 className="text-3xl font-black text-gray-900 mb-1">Olá, Ivone! 🌸</h2>
                    <p className="text-pink-500 font-bold mb-8">Seu caderninho digital está pronto.</p>
                </div>

                {/* Instructions */}
                <div className="mb-8">
                    <p className="text-gray-400 text-[10px] font-black text-center tracking-widest uppercase">
                        DIGITE SEU PIN PARA ACESSAR SEUS REGISTROS DE VENDAS.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-pink-400 group-focus-within:text-pink-600">
                            <LockIcon className="w-5 h-5 transition-colors" />
                        </div>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={pin}
                            onChange={(e) => handlePinChange(e.target.value)}
                            placeholder="PIN de 4 números"
                            className="w-full pl-12 pr-4 py-4 bg-gradient-to-br from-gray-50 to-gray-200 border-2 border-pink-200 rounded-2xl text-center text-3xl tracking-[1rem] font-bold text-gray-800 focus:outline-none focus:border-pink-600 focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal placeholder:font-bold"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-rose-600 text-xs font-bold text-center bg-rose-50 py-2 rounded-xl border border-rose-100"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button 
                        type="submit" 
                        disabled={isLoading || pin.length < 4}
                        className="w-full py-4 text-white font-black text-lg bg-gray-500 rounded-2xl shadow-lg hover:bg-gray-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none border-b-4 border-gray-800"
                    >
                        {isLoading ? 'Acessando...' : 'Acessar Caderninho ✨'}
                    </button>
                </form>

                {/* Footer Link */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase">
                        O SEU CADERNINHO DIGITAL INTELIGENTE DE VENDAS
                    </p>
                </div>
            </div>

            {/* AI Studio / Browser Mockup Controls */}
            <div className="bg-gray-100 p-2 border-t border-gray-200">
                <div className="flex items-center justify-between px-4 mb-2">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    </button>
                    <div className="bg-gray-200 px-6 py-1 rounded-full text-xs font-bold text-gray-600">
                        Preview
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                    </button>
                </div>
                
                {/* Safari style URL bar */}
                <div className="bg-white/80 rounded-xl p-2 flex items-center justify-between shadow-inner border border-gray-200">
                     <button className="text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    </button>
                    <div className="text-[10px] font-medium text-gray-400">
                        aistudio.google.com
                    </div>
                    <button className="text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
