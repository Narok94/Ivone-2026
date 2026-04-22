import React, { FC, useMemo, useState, useEffect } from 'react';
import { useData } from '../../contexto/DataContext';
import { View } from '../../types';
import { UsersIcon, TrendingUpIcon, WalletIcon, ClockIcon } from '../ui/Icons';
import { motion } from 'motion/react';

interface HeaderSummaryProps {
    setActiveView: (view: View) => void;
}

const CountUp: FC<{ value: number; isCurrency?: boolean; duration?: number }> = ({ value, isCurrency = false, duration = 1500 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    if (isCurrency) {
        return <>{count.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>;
    }
    return <>{count}</>;
};

export const HeaderSummary: FC<HeaderSummaryProps> = ({ setActiveView }) => {
    const { clients, sales, payments } = useData();
    
    const totalSalesValue = useMemo(() => sales.reduce((sum, s) => sum + s.total, 0), [sales]);
    const totalReceived = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const totalPending = totalSalesValue - totalReceived;

    const summaryItems = [
        { title: 'Clientes', icon: UsersIcon, view: 'clients', color: 'from-[#9C27B0] to-[#7E57C2]', border: 'border-[#4A148C]', numericValue: clients.length },
        { title: 'Encomendas', icon: TrendingUpIcon, view: 'sales_view', color: 'from-[#e91e63] to-[#c2185b]', border: 'border-[#880E4F]', isCurrency: true, numericValue: totalSalesValue },
        { title: 'Recebidos', icon: WalletIcon, view: 'all_payments', color: 'from-[#00C853] to-[#2E7D32]', border: 'border-[#1B5E20]', isCurrency: true, numericValue: totalReceived },
        { title: 'Falta Pagar', icon: ClockIcon, view: 'pending_payments', color: 'from-[#FFC107] to-[#F57F17]', border: 'border-[#E65100]', isCurrency: true, numericValue: totalPending },
    ];

    return (
        <div className="p-1 md:p-6">
             <div className="grid grid-cols-2 lg:flex lg:flex-wrap justify-center gap-2 md:gap-6 max-w-7xl mx-auto">
                  {summaryItems.map((item, index) => (
                     <motion.div 
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: index * 0.1, duration: 0.5 }}
                         key={item.title} 
                         onClick={() => setActiveView(item.view as View)} 
                         className={`p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center bg-gradient-to-br ${item.color} rounded-[28px] md:rounded-[32px] shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] text-white cursor-pointer hover:shadow-[0_25px_45px_-10px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:scale-95 transition-all duration-300 min-h-[100px] md:min-h-[90px] md:min-w-[200px] md:flex-1 md:max-w-none border ${item.border}`}
                     >
                         <div className="p-2.5 md:p-3 rounded-xl md:rounded-2xl mb-2 md:mb-0 md:mr-4 bg-white/20 backdrop-blur-md self-start md:self-auto flex-shrink-0 shadow-sm">
                             <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                         </div>
                         <div className="w-full">
                             <p className="text-[9px] md:text-[10px] font-black opacity-80 uppercase tracking-[0.2em] leading-none mb-1.5 md:mb-1">{item.title}</p>
                             <p className="text-base md:text-xl font-black truncate leading-tight tracking-tight">
                                <CountUp value={item.numericValue} isCurrency={item.isCurrency} />
                             </p>
                         </div>
                     </motion.div>
                  ))}
             </div>
        </div>
    );
};
