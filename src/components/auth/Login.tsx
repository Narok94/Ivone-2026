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

    const rings = Array.from({ length: 16 });

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF9FB] p-4 lg:p-8 overflow-hidden relative">
            <div className="w-full max-w-sm shadow-[0_32px_64px_-15px_rgba(233,30,99,0.2)] rounded-[3.5rem] bg-white flex flex-col relative border-[12px] border-white paper-texture">
                {/* Spiral Detail */}
                <div className="notebook-spiral-container">
                    {rings.map((_, i) => (
                        <div key={i} className="notebook-ring" />
                    ))}
                </div>

                {/* Content Area */}
                <div className="relative flex-1 px-8 pl-12 pt-12 pb-12 text-center">
                    {/* Logo Section */}
                    <div className="mb-6 flex justify-center">
                        <img 
                            src="/logo-ivone.png" 
                            alt="Ivone Logo" 
                            className="w-[200px] h-auto drop-shadow-[0_4px_6px_rgba(233,30,99,0.2)] object-contain"
                        />
                    </div>

                    {/* Greeting */}
                    <div className="mb-8">
                        <h2 className="text-4xl font-black text-[#1a1a1b] mb-1">Olá, Ivone! 🌸</h2>
                        <p className="text-[#e91e63] font-bold text-lg">Seu caderninho digital está pronto.</p>
                    </div>

                    <div className="mb-12">
                        <p className="text-gray-400 text-[10px] font-black tracking-widest uppercase px-4 leading-relaxed">
                            DIGITE SEU PIN PARA ACESSAR SEUS REGISTROS DE VENDAS.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#e91e63]">
                                <LockIcon className="w-6 h-6" />
                            </div>
                            <input
                                type="password"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={pin}
                                onChange={(e) => handlePinChange(e.target.value)}
                                placeholder="PIN de 4 números"
                                className="w-full pl-14 pr-4 py-6 bg-[#f1f3f5]/50 border-[3px] border-[#e91e63] rounded-[2rem] text-center text-gray-500 text-lg font-bold focus:outline-none transition-all placeholder:text-gray-400"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.p 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="text-rose-600 text-xs font-bold"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        <button 
                            type="submit" 
                            disabled={isLoading || pin.length < 4}
                            className="w-full py-5 text-white font-black text-xl bg-[#bcbcbc] rounded-[2rem] shadow-[0_8px_0_#999] hover:bg-[#b0b0b0] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Acessando...' : 'Acessar Caderninho ✨'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-16">
                        <p className="text-[9px] text-gray-300 font-bold italic tracking-[0.2em] uppercase max-w-[200px] mx-auto">
                            O SEU CADERNINHO DIGITAL INTELIGENTE DE VENDAS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
