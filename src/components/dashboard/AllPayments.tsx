import React, { FC, useState, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button } from '../common';
import { ArrowLeftIcon, WalletIcon, EditIcon, TrashIcon } from '../ui/Icons';
import { Client, Payment } from '../../types';
import { EmptyState } from '../ui/EmptyState';

export const AllPayments: FC<{ onEditPayment: (payment: Payment) => void; showToast: (msg: string) => void; }> = ({ onEditPayment, showToast }) => {
    const { payments, clients, deletePayment } = useData();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const clientPaymentTotals = useMemo(() => {
        const totals = new Map<string, number>();
        payments.forEach(payment => {
            const currentTotal = totals.get(payment.clientId) || 0;
            totals.set(payment.clientId, currentTotal + payment.amount);
        });
        return totals;
    }, [payments]);
    
    const clientsWithPayments = useMemo(() => {
        return clients
            .filter(client => clientPaymentTotals.has(client.id) && (clientPaymentTotals.get(client.id) || 0) > 0)
            .sort((a,b) => a.fullName.localeCompare(b.fullName));
    }, [clients, clientPaymentTotals]);

    const clientPayments = useMemo(() => {
        if (!selectedClient) return [];
        return payments
            .filter(p => p.clientId === selectedClient.id)
            .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    }, [payments, selectedClient]);


    const handleDelete = async (paymentId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este recebimento?')) {
            await deletePayment(paymentId);
            showToast('Recebimento excluído com sucesso!');
        }
    };
    
    if (selectedClient) {
        return (
            <Card>
                <div className="flex items-center mb-6">
                     <Button variant="secondary" onClick={() => setSelectedClient(null)}>
                        <ArrowLeftIcon className="w-5 h-5 mr-2 inline-block"/>
                        Voltar para a Lista
                    </Button>
                </div>
                <h1 className="text-2xl font-bold text-rose-800 mb-6">Recebimentos de: {selectedClient.fullName} 💰</h1>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                     {clientPayments.length > 0 ? clientPayments.map(payment => {
                        return (
                            <div key={payment.id} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center flex-wrap gap-2">
                                <div className="flex-grow">
                                    <p className="font-bold text-gray-700">Pagamento recebido</p>
                                    {payment.observation && <p className="text-sm text-gray-500">{payment.observation}</p>}
                                    <p className="text-xs text-gray-500">{new Date(payment.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className="flex flex-col items-end justify-center ml-4">
                                    <p className="font-bold text-emerald-600 whitespace-nowrap">+{payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={() => onEditPayment(payment)} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors" aria-label="Editar recebimento"><EditIcon/></button>
                                        <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" aria-label="Excluir recebimento"><TrashIcon/></button>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : <EmptyState icon={WalletIcon} title="Nenhum pagamento recebido" message="Este cliente não possui pagamentos registrados."/>}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <h1 className="text-2xl font-bold text-rose-800 mb-6">Recebimentos por Cliente 💰</h1>
             {clientsWithPayments.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-pink-100/70 text-pink-800 font-semibold uppercase text-sm">
                            <tr>
                                <th className="p-3 rounded-l-2xl">Cliente</th>
                                <th className="p-3 text-right rounded-r-2xl">Total Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientsWithPayments.map(client => (
                                <tr key={client.id} onClick={() => setSelectedClient(client)} className="border-b border-pink-100/50 hover:bg-pink-50/50 cursor-pointer">
                                    <td className="p-3 font-medium">{client.fullName}</td>
                                    <td className="p-3 text-right font-bold text-emerald-600">
                                        {(clientPaymentTotals.get(client.id) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <EmptyState icon={WalletIcon} title="Nenhum pagamento recebido" message="Quando um pagamento for registrado, os clientes aparecerão aqui com o total pago."/>
            )}
        </Card>
    );
};
