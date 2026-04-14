import React, { FC, useMemo } from 'react';
import { Card } from '../common';
import { 
    UserPlusIcon, 
    ArchiveIcon, 
    AddressBookIcon, 
    BarChartIcon, 
    HistoryIcon, 
    ShoppingCartIcon, 
    CreditCardIcon 
} from '../ui/Icons';

type View = 'dashboard' | 'clients' | 'add_client' | 'add_sale' | 'stock' | 'add_payment' | 'reports' | 'history' | 'pending_payments' | 'sales_view' | 'all_payments' | 'client_detail' | 'manage_users' | 'user_summary';

interface DashboardProps {
    onNavigate: (view: View, clientId?: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ onNavigate }) => {
    const navItems = [
        { id: 'add_client', icon: UserPlusIcon, title: 'Cadastrar Cliente' },
        { id: 'stock', icon: ArchiveIcon, title: 'Estoque' },
        { id: 'clients', icon: AddressBookIcon, title: 'Ver Todos Clientes' },
        { id: 'reports', icon: BarChartIcon, title: 'Análise de Vendas' },
        { id: 'history', icon: HistoryIcon, title: 'Histórico Completo' },
    ];

    return (
        <div className="space-y-6 md:space-y-10">
            {/* Quick Actions */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-sm border border-pink-50">
                <h2 className="text-lg md:text-xl font-black text-[#880e4f] mb-1">Ações Rápidas</h2>
                <p className="text-gray-400 text-xs md:text-sm mb-6 md:mb-8 font-medium">Comece por aqui para as tarefas mais comuns.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <button 
                        onClick={() => onNavigate('add_sale')} 
                        className="group p-5 md:p-6 bg-[#fff0f3] border border-pink-100 rounded-2xl flex items-center text-left space-x-4 md:space-x-6 hover:shadow-md transition-all duration-300 active:scale-[0.96] active:bg-[#ffe4e9]"
                    >
                        <div className="p-3 md:p-4 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <ShoppingCartIcon className="w-6 h-6 md:w-8 md:h-8 text-[#e91e63]" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-black text-[#2d3436]">Nova Venda</h3>
                            <p className="text-gray-500 text-xs md:text-sm font-medium">Registrar uma nova venda.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate('add_payment')} 
                        className="group p-5 md:p-6 bg-[#e8fbf3] border border-emerald-100 rounded-2xl flex items-center text-left space-x-4 md:space-x-6 hover:shadow-md transition-all duration-300 active:scale-[0.96] active:bg-[#d1f7e6]"
                    >
                        <div className="p-3 md:p-4 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                            <CreditCardIcon className="w-6 h-6 md:w-8 md:h-8 text-[#10b981]" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-black text-[#2d3436]">Receber Pagamento</h3>
                            <p className="text-gray-500 text-xs md:text-sm font-medium">Registrar um pagamento.</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Other Options */}
            <div>
                <h2 className="text-lg md:text-xl font-black text-[#880e4f] mb-4 md:mb-6 ml-2">Outras Opções</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => onNavigate(item.id as View)} 
                            className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-pink-50 flex flex-col items-center justify-center space-y-3 md:space-y-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95 active:bg-pink-50 group"
                        >
                             <div className="p-3 md:p-4 bg-[#fff0f3] rounded-2xl group-hover:scale-110 transition-transform">
                                <item.icon className="w-6 h-6 md:w-8 md:h-8 text-[#e91e63]" />
                             </div>
                             <h3 className="text-xs md:text-sm font-black text-[#2d3436] text-center leading-tight">{item.title}</h3>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
