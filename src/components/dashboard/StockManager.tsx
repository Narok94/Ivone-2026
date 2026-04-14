import React, { FC, useState, useEffect } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input } from '../common';
import { ArchiveIcon, TrashIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';

export const StockManager: FC = () => {
    const { stockItems, addStockItem, updateStockItemQuantity, deleteStockItem } = useData();
    const [newItem, setNewItem] = useState({ name: '', size: '', code: '', quantity: '0' });
    const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});

    const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        await addStockItem({ ...newItem, quantity: parseInt(newItem.quantity, 10) || 0 });
        setNewItem({ name: '', size: '', code: '', quantity: '0' });
    };

    const handleQuantityChange = (itemId: string, value: string) => {
        setEditingQuantities(prev => ({...prev, [itemId]: value}));
    };

    const handleUpdateQuantity = async (itemId: string) => {
        const newQuantity = parseInt(editingQuantities[itemId], 10);
        if (!isNaN(newQuantity)) {
            await updateStockItemQuantity(itemId, newQuantity);
        }
    };
    
    useEffect(() => {
        const initialQuantities = stockItems.reduce((acc, item) => {
            acc[item.id] = String(item.quantity);
            return acc;
        }, {} as Record<string, string>);
        setEditingQuantities(initialQuantities);
    }, [stockItems]);

    return (
        <div className="space-y-8">
            <Card>
                <h2 className="text-xl font-bold text-rose-800 mb-4">Adicionar Item ao Estoque 📦</h2>
                <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <Input label="Nome do Produto" name="name" value={newItem.name} onChange={handleNewItemChange} />
                    <Input label="Tamanho" name="size" value={newItem.size} onChange={handleNewItemChange} />
                    <Input label="Código" name="code" type="number" value={newItem.code} onChange={handleNewItemChange} />
                    <Input
                        label="Quantidade"
                        name="quantity"
                        type="number"
                        min="0"
                        value={newItem.quantity}
                        onChange={handleNewItemChange}
                        onFocus={(e) => e.target.value === '0' && setNewItem(prev => ({...prev, quantity: ''}))}
                        onBlur={(e) => e.target.value === '' && setNewItem(prev => ({...prev, quantity: '0'}))}
                    />
                    <Button type="submit" className="md:col-start-5">Adicionar</Button>
                </form>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-rose-800 mb-4">Estoque Atual 🌸</h2>
                {stockItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                             <thead className="bg-pink-100/70 text-pink-800 font-semibold uppercase text-sm">
                                <tr>
                                    <th className="p-3 rounded-l-2xl">Produto</th>
                                    <th className="p-3 hidden sm:table-cell">Tamanho</th>
                                    <th className="p-3">Código</th>
                                    <th className="p-3">Quantidade</th>
                                    <th className="p-3 rounded-r-2xl">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockItems.map(item => (
                                    <tr key={item.id} className="border-b border-pink-100/50 hover:bg-pink-50/50">
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 hidden sm:table-cell">{item.size}</td>
                                        <td className="p-3">{item.code}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    value={editingQuantities[item.id] ?? item.quantity}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    onBlur={() => handleUpdateQuantity(item.id)}
                                                    className="w-20 px-2 py-1 border rounded-xl focus:ring-pink-400 focus:border-pink-400"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-3">
                                           <button onClick={() => deleteStockItem(item.id)} className="text-red-600 hover:text-red-800"><TrashIcon/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <EmptyState icon={ArchiveIcon} title="Estoque vazio" message="Adicione seu primeiro produto para começar a controlar o estoque." />
                 )}
            </Card>
        </div>
    );
};
