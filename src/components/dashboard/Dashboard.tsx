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
        <div className="h-full flex flex-col justify-center py-6 md:py-12">
            {/* Primary Actions - Giant Focus Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                {/* CARD VERDE - Nova Venda */}
                <button 
                    onClick={() => onNavigate('add_sale')} 
                    className="card-acao bg-emerald-500 text-white min-h-[160px] md:min-h-[300px] md:text-3xl"
                >
                    <div className="mb-4 md:mb-6">
                        <ShoppingCartIcon className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    </div>
                    <h3 className="italic">Nova venda</h3>
                    <p className="text-emerald-50 text-xs md:text-lg font-medium opacity-90 px-4">Anotar uma venda nova no caderninho. 🌸</p>
                </button>

                {/* CARD AMARELO - Novo Pagamento */}
                <button 
                    onClick={() => onNavigate('add_payment')} 
                    className="card-acao bg-amber-500 text-white min-h-[160px] md:min-h-[300px] md:text-3xl"
                >
                    <div className="mb-4 md:mb-6">
                        <CreditCardIcon className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    </div>
                    <h3 className="italic">Receber</h3>
                    <p className="text-amber-50 text-xs md:text-lg font-medium opacity-90 px-4">Anotar um pagamento que você recebeu. 💰</p>
                </button>

                {/* CARD AZUL - Clientes */}
                <button 
                    onClick={() => onNavigate('clients')} 
                    className="card-acao bg-sky-500 text-white min-h-[160px] md:min-h-[300px] md:text-3xl"
                >
                    <div className="mb-4 md:mb-6">
                        <UsersIcon className="w-10 h-10 md:w-16 md:h-16 text-white" />
                    </div>
                    <h3 className="italic">Clientes</h3>
                    <p className="text-sky-50 text-xs md:text-lg font-medium opacity-90 px-4">Ver minha lista de clientes e o que elas compraram. 👤</p>
                </button>
            </div>
        </div>
    );
};
