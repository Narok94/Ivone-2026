import React, { FC, useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input, TextArea } from '../common';
import { Sale } from '../../types';

export const SaleForm: FC<{ editingSale?: Sale | null; onSaleSuccess: (sale: Sale, isEditing: boolean) => void; prefilledClientId: string | null; }> = ({ editingSale, onSaleSuccess, prefilledClientId }) => {
    const { clients, addSale, updateSale } = useData();
    const isEditing = !!editingSale;
    const clientSelectRef = useRef<HTMLDivElement>(null);

    const initialFormState = {
        clientId: prefilledClientId || '',
        saleDate: new Date().toISOString().split('T')[0],
        productCode: '',
        productName: '',
        quantity: '1',
        unitPrice: '0',
        observation: '',
    };
    
    const [saleData, setSaleData] = useState(initialFormState);
    const [clientSearch, setClientSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientError, setClientError] = useState('');

    const filteredClients = useMemo(() => {
        const sortedClients = [...clients].sort((a,b) => a.fullName.localeCompare(b.fullName));
        if (!clientSearch) return sortedClients;
        return sortedClients.filter(c => c.fullName.toLowerCase().includes(clientSearch.toLowerCase()));
    }, [clients, clientSearch]);


    useEffect(() => {
        if (editingSale) {
            setSaleData({
                clientId: editingSale.clientId,
                saleDate: editingSale.saleDate,
                productCode: editingSale.productCode,
                productName: editingSale.productName,
                quantity: String(editingSale.quantity),
                unitPrice: String(editingSale.unitPrice),
                observation: editingSale.observation,
            });
        } else {
             setSaleData(initialFormState);
        }
    }, [editingSale, prefilledClientId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSelectRef.current && !clientSelectRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleClientSelect = (clientId: string) => {
        setSaleData(prev => ({ ...prev, clientId }));
        setIsClientDropdownOpen(false);
        setClientSearch('');
        setClientError('');
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSaleData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientError('');

        if (!saleData.clientId) {
            setClientError('É obrigatório selecionar um cliente para registrar a encomenda.');
            return;
        }

        const quantity = parseFloat(saleData.quantity) || 0;
        const unitPrice = parseFloat(saleData.unitPrice) || 0;

        if (quantity <= 0) {
            alert('A quantidade da encomenda deve ser maior que zero.');
            return;
        }

        const salePayload = {
            ...saleData,
            quantity: quantity,
            unitPrice: unitPrice,
        };

        try {
            if (isEditing && editingSale) {
                const updatedSale = await updateSale({ ...salePayload, id: editingSale.id, total: 0 }); // total is recalculated in context
                onSaleSuccess(updatedSale, true);
            } else {
                const newSale = await addSale(salePayload);
                onSaleSuccess(newSale, false);
            }
        } catch (error: any) {
            alert(`Erro ao salvar encomenda: ${error.message}`);
        }
    };

    const total = useMemo(() => (parseFloat(saleData.quantity) || 0) * (parseFloat(saleData.unitPrice) || 0), [saleData.quantity, saleData.unitPrice]);

    return (
        <Card>
            <h1 className="text-2xl font-bold text-rose-800 mb-6 italic">{isEditing ? 'Editar Venda' : 'Registrar uma Nova Venda'} 🛍️</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div ref={clientSelectRef}>
                        <label htmlFor="client-select-button" className="block text-sm font-medium text-gray-700 mb-1">Quem encomendou? *</label>
                        <div className="relative">
                            <button
                                type="button"
                                id="client-select-button"
                                onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                className="w-full px-4 py-2 text-left bg-white/70 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-shadow"
                                aria-haspopup="listbox"
                                aria-expanded={isClientDropdownOpen}
                            >
                                {saleData.clientId ? clients.find(c => c.id === saleData.clientId)?.fullName : <span className="text-gray-500">Selecione um cliente</span>}
                            </button>
                            {isClientDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white rounded-2xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <input
                                            type="text"
                                            value={clientSearch}
                                            onChange={e => setClientSearch(e.target.value)}
                                            placeholder="Buscar cliente..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-400"
                                            autoFocus
                                        />
                                    </div>
                                    <ul role="listbox">
                                        {filteredClients.map(c => (
                                            <li
                                                key={c.id}
                                                onClick={() => handleClientSelect(c.id)}
                                                className="px-4 py-2 hover:bg-pink-50 cursor-pointer"
                                                role="option"
                                                aria-selected={c.id === saleData.clientId}
                                            >
                                                {c.fullName}
                                            </li>
                                        ))}
                                        {filteredClients.length === 0 && (
                                            <li className="px-4 py-2 text-gray-500">Nenhum cliente encontrado.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {clientError && <p className="text-red-500 text-sm mt-1">{clientError}</p>}
                    </div>
                    <div className="self-end">
                      <Input label="Data do Pedido" name="saleDate" type="date" value={saleData.saleDate} onChange={handleChange} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Código do Produto (se tiver)" name="productCode" type="number" placeholder="Ex: 12345" value={saleData.productCode} onChange={handleChange} />
                    <Input label="Nome do Produto" name="productName" value={saleData.productName} onChange={handleChange} required/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Quantidade" name="quantity" type="number" min="1" value={saleData.quantity} onChange={handleChange} required/>
                    <Input
                        label="Valor Unitário (R$)"
                        name="unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={saleData.unitPrice}
                        onChange={handleChange}
                        onFocus={(e) => e.target.value === '0' && setSaleData(prev => ({...prev, unitPrice: ''}))}
                        onBlur={(e) => e.target.value === '' && setSaleData(prev => ({...prev, unitPrice: '0'}))}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                        <p className="w-full px-3 py-2 border bg-gray-100 border-gray-300 rounded-xl font-bold text-lg text-pink-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
                <TextArea label="Observação" name="observation" value={saleData.observation} onChange={handleChange} />
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={!saleData.clientId}>{isEditing ? 'Atualizar Encomenda' : 'Colocar no Caderninho'}</Button>
                </div>
            </form>
        </Card>
    );
};
