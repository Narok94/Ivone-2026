import React, { FC } from 'react';
import { View } from '../../types';
import { 
    UserPlusIcon, 
    ArchiveIcon, 
    UsersIcon, 
    BarChartIcon, 
    HistoryIcon, 
    ShoppingCartIcon, 
    CreditCardIcon 
} from '../ui/Icons';
import { motion } from 'motion/react';

interface DashboardProps {
    onNavigate: (view: View, clientId?: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-6 md:space-y-10">
            {/* Header / Intro */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-between items-end"
            >
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-[#e91e63] mb-1 md:mb-2">Ações Rápidas</h2>
                    <p className="text-xs md:text-base text-gray-500 font-black uppercase tracking-widest text-[10px]">O que vamos registrar hoje?</p>
                </div>
            </motion.div>
            
            {/* Ações Rápidas */}
            <section tabIndex={0} className="outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-6">
                    <motion.button 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('add_sale')}
                        className="shimmer-effect flex items-center gap-4 md:gap-5 p-4 md:p-6 bg-[#FFF5F7] border border-[#F0C1C9] rounded-[32px] md:rounded-[28px] shadow-[0_12px_24px_-8px_rgba(233,30,99,0.15)] hover:shadow-[0_20px_40px_rgba(233,30,99,0.2)] hover:-translate-y-1 transition-all group text-left"
                    >
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-rose-100">
                            <ShoppingCartIcon className="w-6 h-6 md:w-8 md:h-8 text-[#e91e63] group-active:animate-bounce-subtle" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black text-rose-900">Nova Venda</h3>
                        </div>
                    </motion.button>

                    <motion.button 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onNavigate('add_payment')}
                        className="shimmer-effect flex items-center gap-4 md:gap-5 p-4 md:p-6 bg-[#F1FBF9] border border-[#B2D8D0] rounded-[32px] md:rounded-[28px] shadow-[0_12px_24px_-8px_rgba(0,200,83,0.15)] hover:shadow-[0_20px_40px_rgba(0,200,83,0.2)] hover:-translate-y-1 transition-all group text-left"
                    >
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl md:rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform border border-emerald-100">
                            <CreditCardIcon className="w-6 h-6 md:w-8 md:h-8 text-[#00C853] animate-pulse-emerald" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-black text-emerald-900">Receber Pagamento</h3>
                        </div>
                    </motion.button>
                </div>
            </section>

            {/* Outras Opções */}
            <motion.section 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <h2 className="text-xl md:text-2xl font-black text-[#e91e63] mb-4 md:mb-6">Outros Controles</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                    {[
                        { id: 'add_client', icon: UserPlusIcon, label: 'Novo Cliente', textColor: 'text-[#e91e63]', bg: 'bg-rose-50' },
                        { id: 'clients', icon: UsersIcon, label: 'Gerenciar Clientes', textColor: 'text-[#9C27B0]', bg: 'bg-purple-50' },
                        { id: 'reports', icon: BarChartIcon, label: 'Relatórios', textColor: 'text-[#e91e63]', bg: 'bg-rose-50' },
                        { id: 'history', icon: HistoryIcon, label: 'Histórico Geral', textColor: 'text-[#e91e63]', bg: 'bg-rose-50' },
                    ].map((item, idx) => (
                        <motion.button 
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + (idx * 0.1) }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onNavigate(item.id as any)}
                            className="flex flex-col items-center justify-center p-5 md:p-6 bg-white border border-gray-200 rounded-[32px] md:rounded-[28px] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all group text-center"
                        >
                            <div className={`w-12 h-12 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-all shadow-inner border border-gray-100`}>
                                <item.icon className={`w-6 h-6 md:w-7 md:h-7 ${item.textColor}`} />
                            </div>
                            <span className="font-black text-gray-700 text-[10px] md:text-xs tracking-tight">{item.label}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.section>
        </div>
    );
};
