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

interface DashboardProps {
    onNavigate: (view: View, clientId?: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-6 md:space-y-10 animate-view-enter">
            {/* Header / Intro */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-rose-900 mb-1 md:mb-2">Ações Rápidas</h2>
                    <p className="text-xs md:text-base text-gray-500 font-medium">O que vamos registrar hoje?</p>
                </div>
            </div>
            
            {/* Ações Rápidas */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-6">
                    <button 
                        onClick={() => onNavigate('add_sale')}
                        className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-rose-50 border-2 border-rose-100 rounded-[28px] md:rounded-[24px] hover:shadow-xl hover:shadow-rose-100/50 transition-all group active:scale-[0.98] text-left"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <ShoppingCartIcon className="w-6 h-6 md:w-7 md:h-7 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-base font-black text-rose-900">Nova Venda</h3>
                            <p className="text-[10px] md:text-sm text-rose-400 font-medium">Registrar uma nova venda.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate('add_payment')}
                        className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-emerald-50 border-2 border-emerald-100 rounded-[28px] md:rounded-[24px] hover:shadow-xl hover:shadow-emerald-100/50 transition-all group active:scale-[0.98] text-left"
                    >
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl md:rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <CreditCardIcon className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-base font-black text-emerald-900">Receber Pagamento</h3>
                            <p className="text-[10px] md:text-sm text-emerald-400 font-medium">Registrar um pagamento.</p>
                        </div>
                    </button>
                </div>
            </section>

            {/* Outras Opções */}
            <section>
                <h2 className="text-xl md:text-2xl font-black text-rose-900 mb-4 md:mb-6">Outras Opções</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    <button 
                        onClick={() => onNavigate('add_client')}
                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white border border-rose-50 rounded-[24px] md:rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-95 group text-center"
                    >
                        <div className="w-12 h-12 md:w-12 md:h-12 bg-pink-50 rounded-xl md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                            <UserPlusIcon className="w-6 h-6 md:w-6 md:h-6 text-pink-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs lg:text-sm">Cadastrar Cliente</span>
                    </button>

                    <button 
                         onClick={() => onNavigate('stock')}
                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white border border-rose-50 rounded-[24px] md:rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-95 group text-center"
                    >
                        <div className="w-12 h-12 md:w-12 md:h-12 bg-pink-50 rounded-xl md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                            <ArchiveIcon className="w-6 h-6 md:w-6 md:h-6 text-pink-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs lg:text-sm">Estoque</span>
                    </button>

                    <button 
                        onClick={() => onNavigate('clients')}
                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white border border-rose-50 rounded-[24px] md:rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-95 group text-center"
                    >
                        <div className="w-12 h-12 md:w-12 md:h-12 bg-pink-50 rounded-xl md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                            <UsersIcon className="w-6 h-6 md:w-6 md:h-6 text-pink-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs lg:text-sm">Ver Todos Clientes</span>
                    </button>

                    <button 
                        onClick={() => onNavigate('reports')}
                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white border border-rose-50 rounded-[24px] md:rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-95 group text-center"
                    >
                        <div className="w-12 h-12 md:w-12 md:h-12 bg-pink-50 rounded-xl md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                            <BarChartIcon className="w-6 h-6 md:w-6 md:h-6 text-pink-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs lg:text-sm">Análise de Vendas</span>
                    </button>

                    <button 
                        onClick={() => onNavigate('history')}
                        className="flex flex-col items-center justify-center p-4 md:p-5 bg-white border border-rose-50 rounded-[24px] md:rounded-[20px] shadow-sm hover:shadow-md transition-all active:scale-95 group text-center"
                    >
                        <div className="w-12 h-12 md:w-12 md:h-12 bg-pink-50 rounded-xl md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                            <HistoryIcon className="w-6 h-6 md:w-6 md:h-6 text-pink-500" />
                        </div>
                        <span className="font-bold text-gray-700 text-[10px] md:text-xs lg:text-sm">Histórico Completo</span>
                    </button>
                </div>
            </section>
        </div>
    );
};
