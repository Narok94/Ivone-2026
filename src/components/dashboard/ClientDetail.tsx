import React, { FC, useState, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Modal } from '../common';
import { HistoryIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { ClientForm } from '../forms/ClientForm';
import { Sale, Payment } from '../../types';

type View = 'dashboard' | 'clients' | 'add_client' | 'add_sale' | 'stock' | 'add_payment' | 'reports' | 'history' | 'pending_payments' | 'sales_view' | 'all_payments' | 'client_detail' | 'manage_users' | 'user_summary';

type ClientTransaction = (Sale & { type: 'sale' }) | (Payment & { type: 'payment' });

const groupClientTransactionsByMonth = (transactions: ClientTransaction[]) => {
    const groups = transactions.reduce((acc, tx) => {
        const date = new Date(tx.type === 'sale' ? tx.saleDate : tx.paymentDate);
        const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

        if (!acc[capitalizedMonth]) {
            acc[capitalizedMonth] = [];
        }
        acc[capitalizedMonth].push(tx);
        return acc;
    }, {} as Record<string, ClientTransaction[]>);
    return Object.entries(groups);
};

export const ClientDetail: FC<{ clientId: string; onNavigate: (view: View, clientId?: string) => void; }> = ({ clientId, onNavigate }) => {
    const { getClientById, sales, payments, clientBalances } = useData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const client = getClientById(clientId);
    const balance = clientBalances.get(clientId) || 0;
    
    const salePaymentStatus = useMemo(() => {
        const statusMap = new Map<string, 'paid' | 'partial' | 'unpaid'>();
        const clientSales = sales.filter(s => s.clientId === clientId);
        const clientPayments = payments.filter(p => p.clientId === clientId);
        // Get sales sorted oldest to newest to apply payments FIFO
        const sortedSales = [...clientSales].sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
        
        let totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);

        for (const sale of sortedSales) {
            if (totalPaid >= sale.total) {
                statusMap.set(sale.id, 'paid');
                totalPaid -= sale.total;
            } else if (totalPaid > 0 && totalPaid < sale.total) {
                statusMap.set(sale.id, 'partial');
                totalPaid = 0; // The rest of the payment is consumed here
            } else {
                statusMap.set(sale.id, 'unpaid');
            }
        }
        return statusMap;
    }, [sales, payments, clientId]);


    const transactions = useMemo(() => {
        const clientSales = sales.filter(s => s.clientId === clientId).map(s => ({ ...s, type: 'sale' as const }));
        const clientPayments = payments.filter(p => p.clientId === clientId).map(p => ({ ...p, type: 'payment' as const }));
        
        const all: ClientTransaction[] = [...clientSales, ...clientPayments];

        return all.sort((a, b) => {
            const dateA = new Date(a.type === 'sale' ? a.saleDate : a.paymentDate);
            const dateB = new Date(b.type === 'sale' ? b.saleDate : b.paymentDate);
            return dateB.getTime() - dateA.getTime();
        });
    }, [sales, payments, clientId]);

    const groupedTransactions = useMemo(() => groupClientTransactionsByMonth(transactions), [transactions]);

    if (!client) {
        return <Card><p className="text-center text-red-500">Cliente não encontrado.</p></Card>;
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-rose-800">{client.fullName}</h1>
                        <p className="text-gray-600">{client.phone}</p>
                        {client.street && (
                            <div className="mt-2 text-gray-600">
                                <p>{`${client.street}, ${client.number}`}</p>
                                <p>{`${client.neighborhood} - ${client.city}/${client.state}`}</p>
                                <p>{`CEP: ${client.cep}`}</p>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-500">Saldo Devedor</p>
                        <p className={`text-3xl font-extrabold ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
                <div className="border-t border-pink-200 mt-4 pt-4 flex gap-4 flex-wrap">
                    <Button onClick={() => onNavigate('add_sale', client.id)}>Nova Venda</Button>
                    <Button onClick={() => onNavigate('add_payment', client.id)} variant="secondary">Registrar Pagamento</Button>
                    <Button onClick={() => setIsEditModalOpen(true)} variant="secondary">Editar Cliente</Button>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-rose-800 mb-4">Extrato do Cliente</h2>
                {transactions.length > 0 ? (
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                        {groupedTransactions.map(([month, txsInMonth]) => (
                            <div key={month}>
                                <h3 className="font-bold text-gray-500 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm py-1">{month}</h3>
                                <div className="space-y-3">
                                {txsInMonth.map(tx => {
                                    if (tx.type === 'sale') {
                                        const status = salePaymentStatus.get(tx.id) || 'unpaid';
                                        const statusClasses = {
                                            paid: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
                                            partial: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
                                            unpaid: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600' },
                                        };
                                        const currentStatusStyle = statusClasses[status];
                                        
                                        return (
                                        <div key={`sale-${tx.id}`} className={`p-3 ${currentStatusStyle.bg} ${currentStatusStyle.border} rounded-xl flex justify-between items-center`}>
                                            <div>
                                                <p className="font-semibold text-gray-800">{tx.productName} (x{tx.quantity})</p>
                                                <p className="text-xs text-gray-500">{new Date(tx.saleDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <p className={`font-bold ${currentStatusStyle.text}`}>-{tx.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                        );
                                    } else {
                                        return (
                                        <div key={`payment-${tx.id}`} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-800">Pagamento Recebido</p>
                                                <p className="text-xs text-gray-500">{new Date(tx.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <p className="font-bold text-emerald-600">+{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                        )
                                    }
                                })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={HistoryIcon} title="Nenhuma transação" message="Este cliente ainda não possui vendas ou pagamentos registrados." />
                )}
            </Card>
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Cliente">
                <ClientForm client={client} onDone={() => setIsEditModalOpen(false)} />
            </Modal>
        </div>
    );
};
