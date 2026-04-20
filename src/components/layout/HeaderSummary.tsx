import React, { FC, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { View } from '../../types';
import { UsersIcon, TrendingUpIcon, WalletIcon, ClockIcon } from '../ui/Icons';

interface HeaderSummaryProps {
    setActiveView: (view: View) => void;
}

export const HeaderSummary: FC<HeaderSummaryProps> = ({ setActiveView }) => {
    const { clients, sales, payments } = useData();
    
    const totalSalesValue = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales]);
    const totalReceived = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const totalPending = totalSalesValue - totalReceived;

    const summaryItems = [
        { title: 'Clientes', value: clients.length, icon: UsersIcon, view: 'clients', color: 'from-[#c084fc] to-[#e879f9]' },
        { title: 'Encomendas', value: totalSalesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUpIcon, view: 'sales_view', color: 'from-[#f472b6] to-[#fb7185]' },
        { title: 'Recebidos', value: totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: WalletIcon, view: 'all_payments', color: 'from-[#34d399] to-[#10b981]' },
        { title: 'Falta Pagar', value: totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: ClockIcon, view: 'pending_payments', color: 'from-[#fbbf24] to-[#f59e0b]' },
    ];

    return (
        <div className="p-2 md:p-4">
             <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-7xl mx-auto">
                 {summaryItems.map(item => (
                    <div 
                        key={item.title} 
                        onClick={() => setActiveView(item.view as View)} 
                        className={`p-3 md:p-4 flex items-center bg-gradient-to-r ${item.color} rounded-xl md:rounded-2xl shadow-md md:shadow-lg text-white cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-300 min-w-[140px] md:min-w-[240px] flex-1 max-w-[180px] md:max-w-[300px]`}
                    >
                        <div className="p-2 md:p-3 rounded-full mr-2 md:mr-4 bg-white/20">
                            <item.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] md:text-xs font-bold opacity-90 uppercase tracking-wider">{item.title}</p>
                            <p className="text-xs md:text-lg font-black truncate">{item.value}</p>
                        </div>
                    </div>
                 ))}
             </div>
        </div>
    );
};
