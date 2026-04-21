import React, { FC, useState } from 'react';
import { 
    HomeIcon, 
    UsersIcon, 
    ShoppingCartIcon, 
    CreditCardIcon, 
    ArchiveIcon, 
    SettingsIcon, 
    LogOutIcon,
    ArrowLeftIcon,
    BotMessageSquareIcon
} from '../ui';
import { HeaderSummary } from './HeaderSummary';
import { Toast } from '../ui';
import { View } from '../../types';
import { AIAssistant } from '../ai/AIAssistant';
import { useData } from '../../contexto/DataContext';

interface IvoneLayoutProps {
    children: React.ReactNode;
    activeView: View;
    setActiveView: (view: View) => void;
    onBack: () => void;
    toast: string | null;
    setToast: (msg: string | null) => void;
}

export const IvoneLayout: FC<IvoneLayoutProps> = ({ children, activeView, setActiveView, onBack, toast, setToast }) => {
    const { logout } = useData();
    const [isAIOpen, setIsAIOpen] = useState(false);

    const mobileNavItems = [
        { id: 'dashboard', icon: HomeIcon, label: 'Início' },
        { id: 'clients', icon: UsersIcon, label: 'Clientes' },
        { id: 'sales_view', icon: ShoppingCartIcon, label: 'Encomendas' },
        { id: 'all_payments', icon: CreditCardIcon, label: 'Pagos' },
        { id: 'ai', icon: BotMessageSquareIcon, label: 'IA' },
    ];

    return (
        <div className="min-h-screen bg-[#FFF9FB] flex flex-col pb-20 md:pb-10">
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 relative pt-4 md:pt-0">
                {/* Notebook Background effect for the whole center */}
                <div className="absolute inset-0 bg-white shadow-xl rounded-[2rem] paper-texture -z-10 border border-pink-100" />
                
                {/* Centered Greeting Header */}
                <header className="py-6 md:py-10 text-center relative px-16">
                    <h1 className="text-lg md:text-5xl font-black text-[#e91e63] flex items-center justify-center gap-2">
                        Olá, Ivone! 💘
                    </h1>
                    
                    {/* Navigation Actions - Top Right */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {activeView !== 'dashboard' && (
                            <button 
                                onClick={onBack}
                                className="p-2.5 bg-white border border-pink-100 text-[#e91e63] rounded-full shadow-sm active:scale-90 transition-all"
                                title="Voltar"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                        )}
                        
                        <button 
                            onClick={logout}
                            className="p-2.5 text-gray-300 hover:text-[#e91e63] transition-all active:scale-90"
                            title="Sair do Caderninho"
                        >
                            <LogOutIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        
                        <div className="hidden md:block ml-1 border-l border-pink-100 pl-3 h-6 flex items-center">
                             <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest whitespace-nowrap">Sair</span>
                        </div>
                    </div>
                </header>

                {/* Header Summary - Only show on dashboard */}
                {activeView === 'dashboard' && <HeaderSummary setActiveView={setActiveView} />}

                {/* Main Content Area */}
                <main className="mt-6 md:mt-10">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation (Always present for utility) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-pink-100 flex items-center justify-around px-2 py-3 pb-[calc(10px+env(safe-area-inset-bottom))] z-40 shadow-[0_-8px_30px_rgba(233,30,99,0.08)]">
                {mobileNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'ai') {
                                setIsAIOpen(!isAIOpen);
                            } else {
                                setActiveView(item.id as View);
                                setIsAIOpen(false);
                            }
                        }}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            (activeView === item.id && !isAIOpen) || (item.id === 'ai' && isAIOpen)
                                ? 'text-[#e91e63]' 
                                : 'text-gray-400'
                        }`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                            (activeView === item.id && !isAIOpen) || (item.id === 'ai' && isAIOpen)
                                ? 'bg-pink-100/50 scale-110' 
                                : 'hover:bg-gray-50'
                        }`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
                    </button>
                ))}
            </nav>

            <button 
                onClick={logout}
                className="hidden md:flex items-center gap-2 fixed bottom-8 right-8 p-4 bg-white border border-pink-100 text-gray-400 hover:text-red-500 rounded-full shadow-lg transition-all font-bold md:hidden"
            >
                <LogOutIcon className="w-5 h-5" />
                <span>Sair</span>
            </button>

            {/* Toast Notifications */}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            {/* AI Assistant Orb (Desktop) / Modal Control */}
            <AIAssistant 
                onNavigate={(v) => {
                    setActiveView(v);
                    setIsAIOpen(false);
                }} 
                showToast={setToast}
                externalOpen={isAIOpen}
                setExternalOpen={setIsAIOpen}
            />
        </div>
    );
};
