import React, { FC, useState } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { 
    LayoutDashboardIcon, 
    UsersIcon, 
    ShieldIcon, 
    LogOutIcon 
} from '../ui';
import { View } from '../../types';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeView: View;
    setActiveView: (view: View) => void;
}

export const AdminLayout: FC<AdminLayoutProps> = ({ children, activeView, setActiveView }) => {
    const { currentUser, logout } = useAuth();
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

    const menuItems = [
        { id: 'admin_dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
        { id: 'manage_users', icon: ShieldIcon, label: 'Usuários' },
        { id: 'user_summary', icon: UsersIcon, label: 'Resumo por Usuário' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col theme-admin-dark">
            {/* Top Navigation Bar */}
            <header className="bg-slate-900 text-white p-3 sticky top-0 z-30 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* User Info & Actions (Top Left) */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold shadow-sm border border-slate-600">
                                    {currentUser?.firstName[0]}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white leading-none">{currentUser?.firstName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Admin</p>
                                </div>
                            </div>
                            
                            <div className="h-6 w-px bg-slate-700 mx-1"></div>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={logout}
                                    className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-colors"
                                    title="Sair"
                                >
                                    <LogOutIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* App Logo (Mobile only) */}
                        <div className="flex sm:hidden items-center gap-2">
                            <ShieldIcon className="w-6 h-6 text-slate-400" />
                        </div>
                    </div>

                    {/* Navigation Menu (Top Center/Right) */}
                    <nav className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar w-full sm:w-auto justify-center">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id as View)}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap
                                    ${activeView === item.id 
                                        ? 'bg-slate-800 text-white shadow-md border border-slate-700' 
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                `}
                            >
                                <item.icon className={`w-4 h-4 ${activeView === item.id ? 'text-white' : 'text-slate-500'}`} />
                                <span className="text-xs font-bold">{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Desktop Logo */}
                    <div className="hidden lg:flex items-center gap-2">
                        <ShieldIcon className="w-6 h-6 text-slate-400" />
                        <span className="text-lg font-bold text-white tracking-tight">IVONE ADMIN</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
