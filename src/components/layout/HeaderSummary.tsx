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
        <div className="p-1 md:p-4">
             <div className="grid grid-cols-2 lg:flex lg:flex-wrap justify-center gap-1.5 md:gap-4 max-w-7xl mx-auto">
                  {summaryItems.map(item => (
                     <div 
                         key={item.title} 
                         onClick={() => setActiveView(item.view as View)} 
                         className={`p-3 md:p-6 flex flex-col items-start bg-gradient-to-br ${item.color} rounded-[24px] md:rounded-[32px] shadow-sm text-white cursor-pointer hover:shadow-xl active:scale-95 transition-all duration-300 min-h-[90px] md:min-h-[120px] md:min-w-[240px] md:flex-1 md:max-w-[300px]`}
                     >
                         <div className="p-2 md:p-3 rounded-xl md:rounded-2xl mb-1.5 md:mb-3 bg-white/20 backdrop-blur-sm self-start">
                             <item.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                         </div>
                         <div className="w-full">
                             <p className="text-[8px] md:text-[10px] font-black opacity-80 uppercase tracking-widest leading-none mb-1 md:mb-1.5">{item.title}</p>
                             <p className="text-xs md:text-xl font-black truncate">{item.value}</p>
                         </div>
                     </div>
                  ))}
             </div>
        </div>
    );
};
