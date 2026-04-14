import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { useData } from '../../contexto/DataContext';
import { Card, Button } from '../common';
import { ArrowLeftIcon, UsersIcon, TrendingUpIcon, WalletIcon, ClockIcon } from '../ui/Icons';
import { User, Client, StockItem, Sale, Payment } from '../../types';

interface RawData {
  clients: Client[];
  stockItems: StockItem[];
  sales: Sale[];
  payments: Payment[];
}

const UserDetailSummary: FC<{ user: User }> = ({ user }) => {
    const { getRawData } = useData();
    const [userData, setUserData] = useState<RawData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await getRawData(user.id);
                setUserData(data);
            } catch (error) {
                console.error("Failed to load user data:", error);
                setUserData(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user.id, getRawData]);

    const stats = useMemo(() => {
        if (!userData) return { totalSales: 0, totalReceived: 0, totalPending: 0, clientCount: 0 };
        const totalSales = userData.sales.reduce((sum, s) => sum + s.total, 0);
        const totalReceived = userData.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
            totalSales,
            totalReceived,
            totalPending: totalSales - totalReceived,
            clientCount: userData.clients.length,
        };
    }, [userData]);

    if (isLoading) {
        return <Card><p className="text-center">Carregando dados do usuário...</p></Card>;
    }

    if (!userData) {
        return <Card><p className="text-center text-red-500">Não foi possível carregar os dados para este usuário.</p></Card>;
    }
    
    const summaryItems = [
        { title: 'Clientes', value: stats.clientCount, icon: UsersIcon },
        { title: 'Vendas Totais', value: stats.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUpIcon },
        { title: 'Total Recebido', value: stats.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: WalletIcon },
        { title: 'Pendente', value: stats.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: ClockIcon },
    ];

    return (
        <div className="mt-6 space-y-6">
            <h2 className="text-2xl font-bold text-slate-700">Resumo de {user.firstName} {user.lastName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryItems.map(item => (
                    <Card key={item.title} className="!bg-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-full">
                                <item.icon className="w-6 h-6 text-slate-600"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{item.title}</p>
                                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            
            <Card className="!bg-white">
                 <h3 className="font-bold text-lg mb-4 text-slate-700">Clientes de {user.firstName}</h3>
                 {userData.clients.length > 0 ? (
                    <div className="overflow-x-auto max-h-80">
                         <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 uppercase text-xs font-semibold text-slate-600">
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Telefone</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userData.clients.map(client => (
                                    <tr key={client.id}>
                                        <td className="p-3 font-medium text-slate-800">{client.fullName}</td>
                                        <td className="p-3 text-slate-600">{client.phone}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4">Este usuário ainda não cadastrou clientes.</p>
                )}
            </Card>
        </div>
    );
};

export const UserSummaryView: FC = () => {
    const { users } = useAuth();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    if (selectedUser) {
        return (
            <div>
                <Button onClick={() => setSelectedUser(null)} variant="secondary" className="mb-4">
                    <ArrowLeftIcon className="w-5 h-5 mr-2 inline-block"/>
                    Voltar para a Lista de Usuários
                </Button>
                <UserDetailSummary user={selectedUser} />
            </div>
        )
    }

    return (
        <Card>
            <h2 className="text-2xl font-bold text-slate-700 mb-4">Selecione um Usuário para Ver o Resumo</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-100 uppercase text-sm font-semibold">
                            <th className="p-3">Nome Completo</th>
                            <th className="p-3">Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.filter(u => u.role === 'user').map(user => (
                            <tr key={user.id} onClick={() => setSelectedUser(user)} className="border-b hover:bg-slate-50 cursor-pointer">
                                <td className="p-3 font-medium">{user.firstName} {user.lastName}</td>
                                <td className="p-3">{user.username}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
