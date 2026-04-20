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

interface IvoneLayoutProps {
    children: React.ReactNode;
    activeView: View;
    setActiveView: (view: View) => void;
    onBack: () => void;
    toast: string | null;
    setToast: (msg: string | null) => void;
}

export const IvoneLayout: FC<IvoneLayoutProps> = ({ children, activeView, setActiveView, onBack, toast, setToast }) => {
    const mobileNavItems = [
        { id: 'dashboard', icon: HomeIcon, label: 'Início' },
        { id: 'clients', icon: UsersIcon, label: 'Clientes' },
        { id: 'sales_view', icon: ShoppingCartIcon, label: 'Encomendas' },
        { id: 'all_payments', icon: CreditCardIcon, label: 'Pagos' },
    ];

    return (
        <div className="min-h-screen bg-[#fdf2f5] flex flex-col pb-20 md:pb-0">
            {/* Top Bar */}
            <header className="p-4 flex items-center justify-between relative z-20 bg-[#fdf2f5]/80 backdrop-blur-md sticky top-0">
                <div className="flex-1 flex justify-center md:justify-start">
                    <h1 className="text-xl md:text-2xl font-black text-[#e91e63] flex items-center gap-2">
                        Olá, Ivone! ❤️ ✨
                    </h1>
                </div>
                
                {activeView !== 'dashboard' && (
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-100 text-pink-600 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 font-bold text-sm"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>Voltar</span>
                    </button>
                )}
            </header>

            {/* Header Summary - Only show on dashboard */}
            {activeView === 'dashboard' && <HeaderSummary setActiveView={setActiveView} />}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
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

            {/* Toast Notifications */}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            {/* AI Assistant Orb */}
            <AIAssistant onNavigate={setActiveView} showToast={setToast} />
        </div>
    );
};
