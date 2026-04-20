import React, { FC, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card } from '../common';
import { BarChartIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';

export const Reports: FC = () => {
    const { sales, clients, getClientById } = useData();

    const topClients = useMemo(() => {
        const clientTotals = sales.reduce((acc: Record<string, number>, sale) => {
            acc[sale.clientId] = (acc[sale.clientId] || 0) + sale.total;
            return acc;
        }, {} as Record<string, number>);

        return (Object.entries(clientTotals) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([clientId, total]) => ({
                client: getClientById(clientId),
                total
            }));
    }, [sales, getClientById]);
    
    const topProducts = useMemo(() => {
        const productTotals = sales.reduce((acc: Record<string, { quantity: number; total: number }>, sale) => {
            if (!acc[sale.productName]) {
                 acc[sale.productName] = { quantity: 0, total: 0 };
            }
            acc[sale.productName].quantity += sale.quantity;
            acc[sale.productName].total += sale.total;
            return acc;
        }, {} as Record<string, { quantity: number; total: number }>);

        return (Object.entries(productTotals) as [string, { quantity: number; total: number }][])
            .sort((a, b) => b[1].quantity - a[1].quantity)
            .slice(0, 5)
            .map(([productName, data]) => ({ productName, ...data }));
    }, [sales]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-rose-800 text-center">Relatórios 📊</h1>
            {sales.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <h2 className="text-xl font-bold text-rose-800 mb-4">Top 5 Clientes (quem mais compra) 🏆</h2>
                        <ul className="space-y-3">
                            {topClients.map(({ client, total }, index) => (
                                <li key={client?.id || index} className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="font-medium text-gray-700">{index + 1}. {client?.fullName || 'Cliente Removido'}</span>
                                    <span className="font-bold text-rose-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card>
                        <h2 className="text-xl font-bold text-rose-800 mb-4">Top 5 Produtos (os favoritos) ⭐</h2>
                         <ul className="space-y-3">
                            {topProducts.map(({ productName, quantity }, index) => (
                                <li key={productName} className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="font-medium text-gray-700">{index + 1}. {productName}</span>
                                    <span className="font-bold text-rose-600">{quantity} unidades</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            ) : (
                <Card>
                    <EmptyState icon={BarChartIcon} title="Dê uma folheada no caderninho" message="Realize algumas encomendas para que os relatórios possam ser gerados." />
                </Card>
            )}
        </div>
    );
};
