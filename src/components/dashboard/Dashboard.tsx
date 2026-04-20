import React, { FC, useMemo } from 'react';
import { Card } from '../common';
import { View } from '../../types';
import { 
    UserPlusIcon, 
    ArchiveIcon, 
    AddressBookIcon, 
    BarChartIcon, 
    HistoryIcon, 
    ShoppingCartIcon, 
    UsersIcon,
    CreditCardIcon 
} from '../ui/Icons';

interface DashboardProps {
    onNavigate: (view: View, clientId?: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ onNavigate }) => {
    const navItems = [
        { id: 'add_client', icon: UserPlusIcon, title: 'Cadastrar Cliente' },
        { id: 'pending_payments', icon: CreditCardIcon, title: 'Ver Falta Pagar' },
        { id: 'reports', icon: BarChartIcon, title: 'Ver Relatórios' },
        { id: 'history', icon: HistoryIcon, title: 'Histórico Completo' },
    ];

    return (
        <div className="space-y-6 md:space-y-12">
            {/* Primary Actions - Focus Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {/* CARD VERDE - Nova Venda */}
                <button 
                    onClick={() => onNavigate('add_sale')} 
                    className="group relative overflow-hidden bg-emerald-500 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-lg shadow-emerald-200/50 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-xl hover:shadow-emerald-300/60 min-h-[160px] md:min-h-[220px] justify-center"
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="mb-4 md:mb-6 p-4 md:p-5 bg-white/20 rounded-2xl md:rounded-3xl backdrop-blur-md group-hover:rotate-12 transition-transform duration-500">
                        <ShoppingCartIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 italic">Nova venda</h3>
                    <p className="text-emerald-50 text-xs md:text-sm font-medium opacity-90">Clique para anotar no caderninho uma venda nova. 🌸</p>
                </button>

                {/* CARD VERMELHO - Clientes */}
                <button 
                    onClick={() => onNavigate('clients')} 
                    className="group relative overflow-hidden bg-rose-500 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-lg shadow-rose-200/50 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-xl hover:shadow-rose-300/60 min-h-[160px] md:min-h-[220px] justify-center"
                >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="mb-4 md:mb-6 p-4 md:p-5 bg-white/20 rounded-2xl md:rounded-3xl backdrop-blur-md group-hover:-rotate-12 transition-transform duration-500">
                        <UsersIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 italic">Clientes</h3>
                    <p className="text-rose-50 text-xs md:text-sm font-medium opacity-90">Clique para ver clientes e gerenciar o fiado. 💰</p>
                </button>
            </div>

            {/* Other Options - Compact */}
            <div>
                <h2 className="text-base md:text-xl font-black text-[#880e4f] mb-4 md:mb-8 ml-2 opacity-60 uppercase tracking-widest">Outras Opções</h2>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => onNavigate(item.id as View)} 
                            className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm border border-pink-50 flex items-center space-x-4 hover:shadow-md hover:bg-pink-50 transition-all duration-300 active:scale-95 group"
                        >
                             <div className="p-2 md:p-3 bg-pink-100/50 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform">
                                <item.icon className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                             </div>
                             <h3 className="text-xs md:text-sm font-black text-[#2d3436] text-left leading-tight">{item.title}</h3>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
