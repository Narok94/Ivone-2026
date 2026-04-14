import React, { FC, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card } from '../common';
import { SparklesIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';

export const PendingPayments: FC<{onViewClient: (clientId: string) => void;}> = ({onViewClient}) => {
    const { clients, clientBalances } = useData();
    const pendingClients = useMemo(() => {
        return clients.map(c => ({
            ...c,
            balance: clientBalances.get(c.id) || 0
        })).filter(c => c.balance > 0).sort((a,b) => b.balance - a.balance);
    }, [clients, clientBalances]);

    return (
        <Card>
            <h1 className="text-2xl font-bold text-rose-800 mb-6">Clientes com Pagamentos Pendentes ⏰</h1>
             {pendingClients.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-pink-100/70 text-pink-800 font-semibold uppercase text-sm">
                                <th className="p-3 rounded-l-2xl">Cliente</th>
                                <th className="p-3">Telefone</th>
                                <th className="p-3 text-right rounded-r-2xl">Valor Pendente</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingClients.map(client => (
                                <tr key={client.id} onClick={() => onViewClient(client.id)} className="border-b border-pink-100/50 hover:bg-pink-50/50 cursor-pointer">
                                    <td className="p-3 font-medium">{client.fullName}</td>
                                    <td className="p-3">{client.phone}</td>
                                    <td className="p-3 text-right font-bold text-rose-600">{client.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <EmptyState icon={SparklesIcon} title="Tudo em dia!" message="Nenhum cliente com pagamentos pendentes no momento. 🎉"/>
            )}
        </Card>
    )
}
