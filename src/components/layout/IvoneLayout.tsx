import React, { FC, useState } from 'react';
import { 
    HomeIcon, 
    UsersIcon, 
    ShoppingCartIcon, 
    CreditCardIcon, 
    LogOutIcon,
    ArrowLeftIcon,
    SettingsIcon,
    DatabaseIcon,
    PaletteIcon,
    XIcon
} from '../ui';
import { HeaderSummary } from './HeaderSummary';
import { Toast } from '../ui';
import { View } from '../../types';
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
    const { logout, refreshData } = useData();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('ivone_theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    React.useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ivone_theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ivone_theme', 'light');
        }
    }, [isDarkMode]);

    const handleBackup = async () => {
        try {
            const res = await fetch('/api/backup');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_ivone_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setToast('Erro ao realizar backup ❌');
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('Isso irá apagar todos os dados atuais e substituir pelo backup. Continuar?')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);
                const res = await fetch('/api/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(content)
                });
                
                if (res.ok) {
                    setToast('Backup restaurado com sucesso! ✨');
                    refreshData();
                } else {
                    setToast('Erro ao restaurar backup ❌');
                }
            } catch (err) {
                setToast('Arquivo inválido ❌');
            }
        };
        reader.readAsText(file);
    };

    const mobileNavItems = [
        { id: 'dashboard', icon: HomeIcon, label: 'Início' },
        { id: 'clients', icon: UsersIcon, label: 'Clientes' },
        { id: 'sales_view', icon: ShoppingCartIcon, label: 'Encomendas' },
        { id: 'all_payments', icon: CreditCardIcon, label: 'Pagos' },
    ];

    return (
        <div className="min-h-screen bg-[#FFF9FB] flex flex-col pb-20 md:pb-10">
            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 relative pt-4 md:pt-0">
                {/* Notebook Background effect for the whole center */}
                <div className="absolute inset-0 bg-[#fdfdfd] shadow-2xl rounded-[2.5rem] paper-texture -z-10 border border-gray-300" />
                
                {/* Header with Logo at Top Left */}
                <header className="py-6 md:py-8 relative min-h-[100px] md:min-h-[140px] flex items-center justify-center">
                    <div className="absolute left-0 top-2 md:top-4">
                        <img 
                            src="/logo-ivone.png" 
                            alt="Logo Ivone" 
                            className="h-[70px] md:h-[120px] w-auto drop-shadow-[0_4px_10px_rgba(233,30,99,0.15)] object-contain"
                        />
                    </div>
                    
                    <h1 className="text-2xl md:text-5xl font-black text-[#e91e63] flex items-center justify-center gap-2">
                        Olá, Ivone! 💘
                    </h1>
                    
                    {/* Navigation Actions */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {activeView === 'dashboard' ? (
                            <div className="flex items-center gap-2">
                                {/* Settings Cog */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                                        className={`p-2.5 transition-all active:scale-90 flex items-center gap-2 bg-white rounded-full shadow-sm border border-gray-100 ${isConfigOpen ? 'text-[#e91e63] ring-2 ring-rose-100' : 'text-gray-400 hover:text-[#e91e63]'}`}
                                        title="Configurações"
                                    >
                                        <SettingsIcon className={`w-5 h-5 ${isConfigOpen ? 'animate-spin-slow' : ''}`} />
                                    </button>

                                    {/* Settings Dropdown */}
                                    {isConfigOpen && (
                                        <div className="absolute right-0 mt-3 w-64 bg-white rounded-[24px] shadow-2xl border border-rose-50 p-4 z-50 animate-view-enter">
                                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-rose-50">
                                                <span className="font-black text-rose-800 text-xs uppercase tracking-widest">Configurações</span>
                                                <button onClick={() => setIsConfigOpen(false)} className="text-gray-300 hover:text-rose-500">
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Theme Toggle */}
                                                <button 
                                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-rose-50 rounded-2xl transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <PaletteIcon className="w-5 h-5 text-rose-400 group-hover:text-rose-600" />
                                                        <span className="text-sm font-bold text-gray-700">Tema Escuro</span>
                                                    </div>
                                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-[#e91e63]' : 'bg-gray-200'}`}>
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </div>
                                                </button>

                                                <div className="h-px bg-rose-50 my-2" />

                                                {/* Backup Action */}
                                                <button 
                                                    onClick={handleBackup}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-rose-50 rounded-2xl transition-colors group"
                                                >
                                                    <DatabaseIcon className="w-5 h-5 text-rose-400 group-hover:text-rose-600" />
                                                    <div className="text-left">
                                                        <span className="block text-sm font-bold text-gray-700">Realizar Backup</span>
                                                        <span className="text-[10px] text-gray-400 font-medium tracking-tight">Baixar todos os seus dados</span>
                                                    </div>
                                                </button>

                                                {/* Restore Action */}
                                                <label className="w-full flex items-center gap-3 p-3 hover:bg-rose-50 rounded-2xl transition-colors group cursor-pointer">
                                                    <CreditCardIcon className="w-5 h-5 text-rose-400 group-hover:text-rose-600" />
                                                    <div className="text-left">
                                                        <span className="block text-sm font-bold text-gray-700">Subir Backup</span>
                                                        <span className="text-[10px] text-gray-400 font-medium tracking-tight">Restaurar de arquivo .json</span>
                                                    </div>
                                                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={logout}
                                    className="p-2.5 text-gray-400 hover:text-[#e91e63] transition-all active:scale-90 flex items-center gap-2 bg-white rounded-full shadow-sm border border-gray-100"
                                    title="Sair do Caderninho"
                                >
                                    <LogOutIcon className="w-5 h-5" />
                                    <span className="hidden md:block text-[10px] font-black uppercase tracking-widest text-gray-400">Sair</span>
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={onBack}
                                className="p-2.5 bg-white border border-pink-100 text-[#e91e63] rounded-full shadow-md active:scale-95 transition-all hover:bg-pink-50"
                                title="Voltar"
                            >
                                <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        )}
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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-menu flex items-center justify-around px-2 py-3 pb-[calc(10px+env(safe-area-inset-bottom))] z-40">
                {mobileNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as View)}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
                            activeView === item.id ? 'text-[#e91e63]' : 'text-gray-400'
                        }`}
                    >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                            activeView === item.id ? 'bg-pink-100/50 scale-110' : 'hover:bg-gray-50'
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
        </div>
    );
};
