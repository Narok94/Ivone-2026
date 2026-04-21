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
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF9FB] p-6 lg:p-8 overflow-hidden relative">
            {/* Background decorative elements for mobile flair */}
            <div className="absolute top-[-5%] right-[-10%] w-72 h-72 bg-pink-100/40 rounded-full blur-3xl -z-10 animate-blob" />
            <div className="absolute bottom-[-5%] left-[-10%] w-96 h-96 bg-rose-100/40 rounded-full blur-3xl -z-10 animate-blob animation-delay-2000" />

            <div className="w-full max-w-sm overflow-hidden shadow-[0_32px_64px_-15px_rgba(233,30,99,0.2)] rounded-[3rem] bg-white flex flex-col relative border-[8px] border-white paper-texture animate-modal-scale-in">
                {/* Notebook Content Area */}
                <div className="relative flex-1 notebook-page px-8 pl-14 pt-20 pb-12">
                    {/* Spiral Rings */}
                    <div className="notebook-spiral-container !left-[-24px] !width-[48px]">
                        {rings.map((_, i) => (
                            <div key={i} className="notebook-ring !h-[12px] !w-[48px]" />
                        ))}
                    </div>

                    {/* Header */}
                    <div className="flex flex-col items-center mt-2">
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Olá, Ivone! 🌸</h2>
                        <p className="text-pink-500 font-bold mb-12">Seu caderninho digital está pronto.</p>
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
            </div>
        </div>
    );
};
