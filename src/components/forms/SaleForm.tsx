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
        <div className="max-w-2xl mx-auto pb-10">
            <h1 className="text-3xl font-black text-rose-800 mb-8 flex items-center gap-3 italic">
                {isEditing ? 'Editar Venda' : 'Nova Venda'} 🛍️
            </h1>

            <Card className="p-6 md:p-10 border-rose-100 shadow-xl shadow-rose-200/20">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div ref={clientSelectRef} className="space-y-2">
                            <label className="block text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Quem comprou? * 👤</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    id="client-select-button"
                                    onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                    className="w-full px-6 py-4 text-left bg-white border-2 border-rose-50 rounded-[24px] shadow-sm focus:outline-none focus:border-rose-300 transition-all font-medium text-lg"
                                    aria-haspopup="listbox"
                                    aria-expanded={isClientDropdownOpen}
                                >
                                    {saleData.clientId ? clients.find(c => c.id === saleData.clientId)?.fullName : <span className="text-gray-400">Escolha a cliente...</span>}
                                </button>
                                {isClientDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-2 bg-white rounded-[24px] shadow-2xl border border-rose-100 max-h-60 overflow-y-auto animate-view-enter">
                                        <div className="p-3 sticky top-0 bg-white">
                                            <input
                                                type="text"
                                                value={clientSearch}
                                                onChange={e => setClientSearch(e.target.value)}
                                                placeholder="Buscar cliente..."
                                                className="w-full px-4 py-3 border-2 border-rose-50 rounded-xl focus:outline-none focus:border-rose-200"
                                                autoFocus
                                            />
                                        </div>
                                        <ul role="listbox" className="p-1">
                                            {filteredClients.map(c => (
                                                <li
                                                    key={c.id}
                                                    onClick={() => handleClientSelect(c.id)}
                                                    className="px-6 py-3 hover:bg-rose-50 cursor-pointer rounded-xl transition-colors font-medium"
                                                    role="option"
                                                    aria-selected={c.id === saleData.clientId}
                                                >
                                                    {c.fullName}
                                                </li>
                                            ))}
                                            {filteredClients.length === 0 && (
                                                <li className="px-6 py-3 text-gray-500 italic">Nenhum cliente encontrado.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {clientError && <p className="text-rose-500 text-sm font-bold mt-1 ml-1">{clientError}</p>}
                        </div>
                        <Input 
                            label="Data do Pedido 📅" 
                            name="saleDate" 
                            type="date" 
                            value={saleData.saleDate} 
                            onChange={handleChange}
                            className="text-lg py-4 px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Input 
                            label="Código (opcional) 🔢" 
                            name="productCode" 
                            type="number" 
                            placeholder="Ex: 12345" 
                            value={saleData.productCode} 
                            onChange={handleChange}
                            className="text-lg py-4 px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                        />
                        <Input 
                            label="Qual o produto? * 💄" 
                            name="productName" 
                            placeholder="Ex: Sabonete Tododia"
                            value={saleData.productName} 
                            onChange={handleChange} 
                            required
                            className="text-lg py-4 px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Input 
                            label="Quantos? 📦" 
                            name="quantity" 
                            type="number" 
                            min="1" 
                            value={saleData.quantity} 
                            onChange={handleChange} 
                            required
                            className="text-lg py-4 px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                        />
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Valor Unitário 💸</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-rose-300 text-xl">R$</span>
                                <Input
                                    label=""
                                    name="unitPrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={saleData.unitPrice}
                                    onChange={handleChange}
                                    onFocus={(e) => e.target.value === '0' && setSaleData(prev => ({...prev, unitPrice: ''}))}
                                    onBlur={(e) => e.target.value === '' && setSaleData(prev => ({...prev, unitPrice: '0'}))}
                                    required
                                    className="pl-16 text-xl font-black py-4 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Total</label>
                            <div className="bg-emerald-50 rounded-[24px] p-4 flex items-center justify-center border-2 border-emerald-100 h-[62px]">
                                <span className="text-2xl font-black text-emerald-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                    </div>

                    <Input 
                        label="Algum detalhe? 📝" 
                        name="observation" 
                        placeholder="Ex: Entrega no sábado..."
                        value={saleData.observation} 
                        onChange={handleChange}
                        className="text-xl py-4 px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[24px]"
                    />

                    <div className="pt-6">
                        <Button 
                            type="submit" 
                            disabled={!saleData.clientId}
                            className="w-full py-6 text-xl rounded-[32px] shadow-lg shadow-rose-200"
                        >
                            {isEditing ? 'Atualizar Venda ✨' : 'Colocar no Caderninho ✨'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
