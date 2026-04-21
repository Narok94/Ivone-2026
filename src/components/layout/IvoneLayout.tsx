import React, { FC, useState } from 'react';
import { 
    HomeIcon, 
    UsersIcon, 
    ShoppingCartIcon, 
    CreditCardIcon, 
    ArchiveIcon, 
    SettingsIcon, 
    LogOutIcon,
    ArrowLeftIcon
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
    const mobileNavItems = [
        { id: 'dashboard', icon: HomeIcon, label: 'Início' },
        { id: 'clients', icon: UsersIcon, label: 'Clientes' },
        { id: 'sales_view', icon: ShoppingCartIcon, label: 'Encomendas' },
        { id: 'all_payments', icon: CreditCardIcon, label: 'Pagos' },
    ];

    return (
        <div className="min-h-screen bg-[#FFF9FB] flex flex-col pb-20 md:pb-10">
            {/* Top Info Bar */}
            <div className="w-full text-center py-2 text-gray-400 text-xs font-medium">
                Ivone 2026
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
                {/* Centered Greeting Header */}
                <header className="py-6 md:py-10 text-center relative">
                    <h1 className="text-3xl md:text-5xl font-black text-[#e91e63] flex items-center justify-center gap-3">
                        Olá, Ivone! ❤️ ✨
                    </h1>
                    
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
                         <button 
                            onClick={logout}
                            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-[#e91e63] font-bold transition-colors"
                        >
                            <LogOutIcon className="w-5 h-5" />
                            <span>Sair</span>
                        </button>
                    </div>

                    {activeView !== 'dashboard' && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                            <button 
                                onClick={onBack}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-100 text-[#e91e63] rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 font-bold"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                <span>Voltar</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* Header Summary - Only show on dashboard */}
                {activeView === 'dashboard' && <HeaderSummary setActiveView={setActiveView} />}

                {/* Main Content Area */}
                <main className="mt-6 md:mt-10">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation (Always present for utility) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-pink-100 flex items-center justify-around px-2 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_20px_rgba(233,30,99,0.1)]">
                {mobileNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as View)}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${activeView === item.id ? 'text-[#e91e63]' : 'text-gray-400'}`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${activeView === item.id ? 'bg-pink-50' : ''}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
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

            {/* AI Assistant Orb */}
            <AIAssistant onNavigate={setActiveView} showToast={setToast} />
        </div>
    );
};
