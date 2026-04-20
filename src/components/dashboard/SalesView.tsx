import React, { FC, useState, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input } from '../common';
import { ArrowLeftIcon, ShoppingCartIcon, EditIcon, TrashIcon, UsersIcon } from '../ui/Icons';
import { Client, Sale } from '../../types';
import { EmptyState } from '../ui/EmptyState';

const groupSalesByMonth = (sales: Sale[]) => {
    const groups = sales.reduce((acc, sale) => {
        const date = new Date(sale.saleDate + 'T00:00:00'); // Ensure timezone consistency
        const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        
        if (!acc[capitalizedMonth]) {
            acc[capitalizedMonth] = [];
        }
        acc[capitalizedMonth].push(sale);
        return acc;
    }, {} as Record<string, Sale[]>);
    return Object.entries(groups);
};

export const SalesView: FC<{ onEditSale: (sale: Sale) => void; showToast: (msg: string) => void; }> = ({ onEditSale, showToast }) => {
    const { clients, sales, deleteSale, clientBalances, payments } = useData();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [filter, setFilter] = useState('');

    const salePaymentStatus = useMemo(() => {
        if (!selectedClient) return new Map();

        const statusMap = new Map<string, 'paid' | 'partial' | 'unpaid'>();
        const clientSales = sales.filter(s => s.clientId === selectedClient.id);
        const clientPayments = payments.filter(p => p.clientId === selectedClient.id);
        const sortedSales = [...clientSales].sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
        
        let totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);

        for (const sale of sortedSales) {
            if (totalPaid >= sale.total) {
                statusMap.set(sale.id, 'paid');
                totalPaid -= sale.total;
            } else if (totalPaid > 0 && totalPaid < sale.total) {
                statusMap.set(sale.id, 'partial');
                totalPaid = 0;
            } else {
                statusMap.set(sale.id, 'unpaid');
            }
        }
        return statusMap;
    }, [sales, payments, selectedClient]);


    const filteredClients = useMemo(() => {
        const sorted = [...clients].sort((a,b) => a.fullName.localeCompare(b.fullName));
        if (!filter) return sorted;
        const lowercasedFilter = filter.toLowerCase();
        return sorted.filter(c =>
            c.fullName.toLowerCase().includes(lowercasedFilter) ||
            c.phone.toLowerCase().includes(lowercasedFilter) ||
            c.email.toLowerCase().includes(lowercasedFilter)
        );
    }, [clients, filter]);

    const clientSales = useMemo(() => {
        if (!selectedClient) return [];
        return sales
            .filter(s => s.clientId === selectedClient.id)
            .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [sales, selectedClient]);

    const groupedSales = useMemo(() => groupSalesByMonth(clientSales), [clientSales]);

    const handleDelete = async (e: React.MouseEvent, saleId: string) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir esta encomenda?')) {
            await deleteSale(saleId);
            showToast('Encomenda excluída com sucesso!');
        }
    };

    const handleEdit = (e: React.MouseEvent, sale: Sale) => {
        e.stopPropagation();
        onEditSale(sale);
    };

    if (selectedClient) {
        return (
            <Card>
                <div className="flex items-center mb-6">
                     <Button variant="secondary" onClick={() => setSelectedClient(null)}>
                        <ArrowLeftIcon className="w-5 h-5 mr-2 inline-block"/>
                        Voltar para Clientes
                    </Button>
                </div>
                <h1 className="text-2xl font-bold text-rose-800 mb-4">Caderninho de Encomendas: {selectedClient.fullName}</h1>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                    {clientSales.length > 0 ? groupedSales.map(([month, salesInMonth]) => (
                        <div key={month}>
                            <h3 className="font-bold text-gray-500 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm py-1">{month}</h3>
                            <div className="space-y-4">
                            {salesInMonth.map(sale => {
                                const status = salePaymentStatus.get(sale.id) || 'unpaid';
                                const statusClasses = {
                                    paid: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
                                    partial: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
                                    unpaid: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600' },
                                };
                                const currentStatusStyle = statusClasses[status];
                                
                                return (
                                    <div key={sale.id} className={`p-4 ${currentStatusStyle.bg} ${currentStatusStyle.border} rounded-2xl flex justify-between items-center flex-wrap gap-2`}>
                                        <div className="flex-grow">
                                            <p className="font-bold text-gray-700">{sale.productName}</p>
                                            <p className="text-sm text-gray-600">{sale.quantity}x {sale.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                            <p className="text-xs text-gray-500">{new Date(sale.saleDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-center ml-4">
                                            <p className={`font-bold ${currentStatusStyle.text} whitespace-nowrap`}>{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                            <div className="flex gap-3 mt-2">
                                                <button onClick={(e) => handleEdit(e, sale)} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors" aria-label="Editar venda"><EditIcon/></button>
                                                <button onClick={(e) => handleDelete(e, sale.id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" aria-label="Excluir venda"><TrashIcon/></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )) : (
                        <EmptyState icon={ShoppingCartIcon} title="Nenhuma encomenda encontrada" message={`${selectedClient.fullName} ainda não tem nenhum pedido na revista.`} />
                    )}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-rose-800">Encomendas por Cliente 🛒</h1>
            </div>
             <Input
                label="Buscar cliente..."
                id="search-client-sales-view"
                placeholder="Digite para buscar..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mb-6"
            />
             {filteredClients.length > 0 ? (
                <div className="space-y-4">
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-pink-100/70 text-pink-800 font-semibold uppercase text-sm">
                                <tr>
                                    <th className="p-3 rounded-l-2xl">Nome</th>
                                    <th className="p-3">Telefone</th>
                                    <th className="p-3 rounded-r-2xl">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map(client => {
                                    const balance = clientBalances.get(client.id) || 0;
                                    return (
                                    <tr key={client.id} onClick={() => setSelectedClient(client)} className="border-b border-pink-100/50 hover:bg-pink-50/50 cursor-pointer">
                                        <td className="p-3 font-medium">{client.fullName}</td>
                                        <td className="p-3">{client.phone}</td>
                                        <td className="p-3">
                                            {balance > 0 ? (
                                                <span className="text-xs font-semibold inline-block py-1 px-2 rounded-full text-rose-700 bg-rose-100 whitespace-nowrap">
                                                    Devendo {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold inline-block py-1 px-2 rounded-full text-emerald-700 bg-emerald-100 whitespace-nowrap">
                                                    Em dia
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredClients.map(client => {
                            const balance = clientBalances.get(client.id) || 0;
                            return (
                                <div 
                                    key={client.id} 
                                    onClick={() => setSelectedClient(client)}
                                    className="bg-white border border-pink-100 p-4 rounded-2xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between"
                                >
                                    <div>
                                        <h3 className="font-bold text-[#e91e63] leading-tight">{client.fullName}</h3>
                                        <p className="text-[10px] text-gray-500 font-medium">{client.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        {balance > 0 ? (
                                            <p className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 leading-none">
                                                Falta {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 leading-none">
                                                Em dia
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                 <EmptyState 
                    icon={UsersIcon} 
                    title={clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"} 
                    message={clients.length === 0 ? "Cadastre um cliente primeiro para poder visualizar suas vendas." : "Tente refinar sua busca."} 
                />
            )}
        </Card>
    );
};
