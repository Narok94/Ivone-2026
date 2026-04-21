import React, { FC, useState } from 'react';
import { useData } from '../../contexto/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { LockIcon, UserIcon, SparklesIcon } from '../ui/Icons';
import { Button } from '../common';

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

    return (
        <div className="min-h-screen bg-[#fdf2f5] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl border border-pink-100 flex flex-col items-center"
            >
                <div className="w-20 h-20 bg-pink-100 rounded-3xl flex items-center justify-center mb-6 text-pink-500">
                    <SparklesIcon className="w-10 h-10" />
                </div>
                
                <h1 className="text-3xl font-black text-[#e91e63] mb-2 text-center italic">Ivone-2026</h1>
                <p className="text-gray-500 mb-8 text-center font-medium">Olá, Ivone! 🌸 Digite seu PIN de 4 números para começarmos.</p>

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-pink-300 transition-colors group-focus-within:text-pink-500">
                            <LockIcon className="w-6 h-6" />
                        </div>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={pin}
                            onChange={(e) => handlePinChange(e.target.value)}
                            placeholder="PIN de 4 dígitos"
                            className="w-full pl-12 pr-4 py-5 bg-pink-50 border-2 border-pink-100 rounded-3xl text-center text-3xl tracking-[1.5rem] font-black text-pink-600 focus:outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-pink-200 placeholder:text-base placeholder:tracking-normal placeholder:font-bold"
                            disabled={isLoading}
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-rose-600 text-sm font-bold text-center"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <Button 
                        type="submit" 
                        className="w-full py-5 text-xl rounded-3xl"
                        disabled={isLoading || pin.length < 4}
                    >
                        {isLoading ? 'Entrando...' : 'Entrar ✨'}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-100 w-full text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">O seu caderninho digital inteligente</p>
                </div>
            </motion.div>
        </div>
    );
};
