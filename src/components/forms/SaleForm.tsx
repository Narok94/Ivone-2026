import React, { FC, useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input, TextArea } from '../common';
import { Sale } from '../../types';
import { Trash2Icon, PlusIcon } from 'lucide-react';

interface SaleItem {
    id: string;
    productCode: string;
    productName: string;
    quantity: string;
    unitPrice: string;
}

export const SaleForm: FC<{ editingSale?: Sale | null; onSaleSuccess: (sale: Sale, isEditing: boolean) => void; prefilledClientId: string | null; }> = ({ editingSale, onSaleSuccess, prefilledClientId }) => {
    const { clients, addSale, updateSale } = useData();
    const isEditing = !!editingSale;
    const clientSelectRef = useRef<HTMLDivElement>(null);

    const initialItem = (): SaleItem => ({
        id: Math.random().toString(36).substr(2, 9),
        productCode: '',
        productName: '',
        quantity: '1',
        unitPrice: '0',
    });

    const [clientId, setClientId] = useState(prefilledClientId || '');
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [observation, setObservation] = useState('');
    const [items, setItems] = useState<SaleItem[]>([initialItem()]);
    
    const [clientSearch, setClientSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientError, setClientError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredClients = useMemo(() => {
        const sortedClients = [...clients].sort((a,b) => a.fullName.localeCompare(b.fullName));
        if (!clientSearch) return sortedClients;
        return sortedClients.filter(c => c.fullName.toLowerCase().includes(clientSearch.toLowerCase()));
    }, [clients, clientSearch]);


    useEffect(() => {
        if (editingSale) {
            setClientId(editingSale.clientId);
            setSaleDate(editingSale.saleDate);
            setObservation(editingSale.observation);
            setItems([{
                id: editingSale.id,
                productCode: editingSale.productCode,
                productName: editingSale.productName,
                quantity: String(editingSale.quantity),
                unitPrice: String(editingSale.unitPrice),
            }]);
        } else {
             setClientId(prefilledClientId || '');
             setSaleDate(new Date().toISOString().split('T')[0]);
             setObservation('');
             setItems([initialItem()]);
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

    const handleClientSelect = (id: string) => {
        setClientId(id);
        setIsClientDropdownOpen(false);
        setClientSearch('');
        setClientError('');
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, initialItem()]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, name: keyof SaleItem, value: string) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [name]: value } : item));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientError('');

        if (!clientId) {
            setClientError('É obrigatório selecionar um cliente para registrar a encomenda.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && editingSale) {
                const item = items[0];
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                
                const updatedSale = await updateSale({ 
                    id: editingSale.id,
                    clientId,
                    saleDate,
                    observation,
                    productCode: item.productCode,
                    productName: item.productName,
                    quantity,
                    unitPrice,
                    total: 0 // recalculated in context
                });
                onSaleSuccess(updatedSale, true);
            } else {
                let firstSaleId = '';
                let lastSale: any = null;

                for (const item of items) {
                    const quantity = parseFloat(item.quantity) || 0;
                    const unitPrice = parseFloat(item.unitPrice) || 0;
                    
                    if (quantity <= 0) continue;

                    lastSale = await addSale({
                        clientId,
                        saleDate,
                        observation,
                        productCode: item.productCode,
                        productName: item.productName,
                        quantity,
                        unitPrice,
                    });
                }
                
                if (lastSale) {
                    onSaleSuccess(lastSale, false);
                }
            }
        } catch (error: any) {
            alert(`Erro ao salvar encomenda: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = useMemo(() => {
        return items.reduce((acc, item) => {
            const q = parseFloat(item.quantity) || 0;
            const p = parseFloat(item.unitPrice) || 0;
            return acc + (q * p);
        }, 0);
    }, [items]);

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <h1 className="text-3xl font-black text-rose-800 mb-8 flex items-center gap-3 italic">
                {isEditing ? 'Editar Venda' : 'Nova Venda'} 🛍️
            </h1>

            <Card className="p-4 md:p-10 border-rose-100 shadow-xl shadow-rose-200/20">
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div ref={clientSelectRef} className="space-y-2">
                            <label className="block text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Quem comprou? * 👤</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    id="client-select-button"
                                    onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                    className="w-full px-5 py-3 md:px-6 md:py-4 text-left bg-white border-2 border-rose-50 rounded-[20px] md:rounded-[24px] shadow-sm focus:outline-none focus:border-rose-300 transition-all font-medium text-base md:text-lg"
                                    aria-haspopup="listbox"
                                    aria-expanded={isClientDropdownOpen}
                                >
                                    {clientId ? clients.find(c => c.id === clientId)?.fullName : <span className="text-gray-400">Escolha a cliente...</span>}
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
                                                    aria-selected={c.id === clientId}
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
                            value={saleDate} 
                            onChange={e => setSaleDate(e.target.value)}
                            className="text-base md:text-lg py-3 md:py-4 px-5 md:px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[20px] md:rounded-[24px]"
                        />
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        {items.map((item, index) => (
                            <div key={item.id} className="p-4 md:p-6 bg-rose-50/30 rounded-[24px] md:rounded-[32px] border-2 border-rose-50 relative animate-view-enter">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-10 md:h-10 bg-white border-2 border-rose-100 text-rose-400 hover:text-rose-600 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90"
                                        title="Remover produto"
                                    >
                                        <Trash2Icon className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                                    <Input 
                                        label="Código (opcional) 🔢" 
                                        placeholder="Ex: 123" 
                                        value={item.productCode} 
                                        onChange={e => handleItemChange(index, 'productCode', e.target.value)}
                                        className="text-base md:text-lg py-3 md:py-4 px-5 md:px-6 border-2 border-white focus:border-rose-300 rounded-[20px] md:rounded-[24px]"
                                    />
                                    <Input 
                                        label="Qual o produto? * 💄" 
                                        placeholder="Ex: Batom Matte"
                                        value={item.productName} 
                                        onChange={e => handleItemChange(index, 'productName', e.target.value)} 
                                        required
                                        className="text-base md:text-lg py-3 md:py-4 px-5 md:px-6 border-2 border-white focus:border-rose-300 rounded-[20px] md:rounded-[24px]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                                    <Input 
                                        label="Quantos? 📦" 
                                        type="number" 
                                        min="1" 
                                        value={item.quantity} 
                                        onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                                        required
                                        className="text-base md:text-lg py-3 md:py-4 px-5 md:px-6 border-2 border-white focus:border-rose-300 rounded-[20px] md:rounded-[24px]"
                                    />
                                    <div className="space-y-1 md:space-y-2">
                                        <label className="block text-[10px] md:text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Preço Cada 💸</label>
                                        <div className="relative group">
                                            <span className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 font-black text-rose-300 text-sm md:text-xl transition-colors group-focus-within:text-rose-500">R$</span>
                                            <Input
                                                label=""
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                                onFocus={(e) => e.target.value === '0' && handleItemChange(index, 'unitPrice', '')}
                                                onBlur={(e) => e.target.value === '' && handleItemChange(index, 'unitPrice', '0')}
                                                required
                                                className="pl-9 md:pl-16 text-base md:text-xl font-black py-3 md:py-4 border-2 border-rose-100 bg-rose-50/50 focus:bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-200/50 rounded-[20px] md:rounded-[24px] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col justify-end">
                                        <div className="bg-white/80 rounded-[24px] p-4 flex items-center justify-center border-2 border-rose-50 h-[62px]">
                                            <span className="text-xl font-black text-emerald-600">
                                                {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!isEditing && (
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="w-full py-3 md:py-4 border-2 border-dashed border-rose-200 text-rose-500 font-black rounded-2xl md:rounded-[24px] hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-2 group"
                            >
                                <PlusIcon className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-125 transition-transform" />
                                Adicionar mais um produto
                            </button>
                        )}
                    </div>

                    <div className="space-y-4 md:space-y-6">
                        <Input 
                            label="Algum detalhe para todos? 📝" 
                            placeholder="Ex: Entrega no sábado..."
                            value={observation} 
                            onChange={e => setObservation(e.target.value)}
                            className="text-base md:text-xl py-3 md:py-4 px-5 md:px-6 border-2 border-rose-50 focus:border-rose-300 rounded-[20px] md:rounded-[24px]"
                        />

                        <div className="bg-emerald-500 rounded-[24px] md:rounded-[32px] p-4 md:p-6 text-white text-center shadow-lg shadow-emerald-200">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Total Geral do Pedido</p>
                            <p className="text-2xl md:text-4xl font-black">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>

                        <div className="pt-2">
                            <Button 
                                type="submit" 
                                disabled={!clientId || isSubmitting}
                                className="w-full py-4 md:py-6 text-lg md:text-xl rounded-[24px] md:rounded-[32px] shadow-lg shadow-rose-200"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Salvando...</span>
                                    </div>
                                ) : (
                                    isEditing ? 'Atualizar Venda ✨' : 'Colocar no Caderninho ✨'
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>
        </div>
    );
};
