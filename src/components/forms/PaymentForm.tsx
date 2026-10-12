import React, { FC, useState, useEffect } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input, Select } from '../common';
import { Payment } from '../../types';
import { motion } from 'motion/react';
import { cents, today } from '../../lib/finance';
import { useFinancialCommit } from '../../lib/useFinancialCommit';

export const PaymentForm: FC<{ 
    editingPayment?: Payment | null; 
    onPaymentSuccess: (isEditing: boolean) => void; 
    prefilledClientId: string | null; 
}> = ({ onPaymentSuccess, prefilledClientId, editingPayment }) => {
    const { clients, clientBalances, isRefreshing, dataError } = useData();
    const financial = useFinancialCommit();
    const isEditing = !!editingPayment;
    const [isLoading, setIsLoading] = useState(false);

    const [paymentData, setPaymentData] = useState({
        clientId: prefilledClientId || '',
        paymentDate: today(),
        amount: '0',
        observation: ''
    });
    const [selectedClientBalance, setSelectedClientBalance] = useState<number | null>(null);

    useEffect(() => {
        if (editingPayment) {
            setPaymentData({
                clientId: editingPayment.clientId,
                paymentDate: editingPayment.paymentDate,
                amount: String(editingPayment.amount),
                observation: editingPayment.observation
            });
        } else {
            setPaymentData({ clientId: prefilledClientId || '', paymentDate: today(), amount: '0', observation: '' });
        }
    }, [editingPayment, prefilledClientId]);
    
    useEffect(() => {
        if (paymentData.clientId) {
            const balance = clientBalances.get(paymentData.clientId);
            const adjustedBalance = isEditing && editingPayment && paymentData.clientId === editingPayment.clientId
                ? (cents(balance || 0) + cents(editingPayment.amount)) / 100
                : balance;
            setSelectedClientBalance(adjustedBalance || 0);
        } else {
            setSelectedClientBalance(null);
        }
    }, [paymentData.clientId, clientBalances, editingPayment, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPaymentData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Number(paymentData.amount) <= 0 && !financial.locked) {
            alert('O valor do pagamento deve ser maior que zero.');
            return;
        }
        
        setIsLoading(true);
        try {
            const amountCents = financial.locked ? 1 : cents(paymentData.amount);
            const result = await financial.execute({ kind: isEditing ? 'edit_payment' : 'payment', targetId: editingPayment?.id, clientId: paymentData.clientId, date: paymentData.paymentDate, observation: paymentData.observation, amountCents, allowCredit: amountCents > cents(selectedClientBalance ?? 0) });
            if (result) { if (result.completedKind === 'payment' || result.completedKind === 'edit_payment') onPaymentSuccess(result.completedKind === 'edit_payment'); else alert('A confirmação anterior foi resolvida. Confira o histórico antes de iniciar este recebimento.'); }
        } catch (error: any) {
            alert(error.message || 'Erro ao registrar pagamento. Reenvie a mesma confirmação.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="max-w-2xl mx-auto pb-10">
            <h1 className="text-3xl font-black text-rose-800 mb-8 flex items-center gap-3 italic">
                Anotar Pagamento 💰
            </h1>
            
            <Card className="p-6 md:p-10 border-rose-100 shadow-xl shadow-rose-200/20">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {financial.locked && <p role="alert" className="whitespace-pre-line text-rose-800 text-sm">Há uma confirmação anterior. Reenvie a mesma confirmação para evitar duplicação.{`\n${financial.pendingSummary}`}</p>}
                    <fieldset disabled={financial.locked || isLoading} className="contents space-y-8">
                    <Select 
                        label="Para qual cliente? 👤"
                        name="clientId" 
                        value={paymentData.clientId} 
                        onChange={handleChange} 
                        disabled={isEditing}
                        className="text-lg py-4 px-6 border-2 border-rose-100 focus:border-rose-300 rounded-[24px]"
                    >
                        <option value="">Selecione uma cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                    </Select>

                    {selectedClientBalance !== null && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-[28px] text-center shadow-inner ${selectedClientBalance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                            <p className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">Dívida atual desta cliente</p>
                            <span className="text-3xl font-black">{selectedClientBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input 
                            label="Quando ela pagou? 📅"
                            name="paymentDate" 
                            type="date" 
                            value={paymentData.paymentDate} 
                            onChange={handleChange}
                            className="text-lg py-4 px-6 border-2 border-rose-100 focus:border-rose-300 rounded-[24px]"
                        />
                        <div className="space-y-2">
                            <label className="block text-sm font-black text-rose-400 uppercase tracking-widest ml-1">Quanto ela deu? 💸</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-rose-300 text-xl">R$</span>
                                <Input
                                    label=""
                                    aria-label="Valor recebido"
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={paymentData.amount}
                                    onChange={handleChange}
                                    onFocus={(e) => e.target.value === '0' && setPaymentData(prev => ({...prev, amount: ''}))}
                                    onBlur={(e) => e.target.value === '' && setPaymentData(prev => ({...prev, amount: '0'}))}
                                    required
                                    className="pl-16 text-2xl font-black py-4 border-2 border-rose-100 bg-white focus:border-[#e91e63] rounded-[24px] text-rose-600"
                                />
                            </div>
                        </div>
                    </div>

                    <Input 
                        label="Alguma observação? 📝"
                        name="observation" 
                        placeholder="Ex: Pagou no Pix, deixou para depois..."
                        value={paymentData.observation} 
                        onChange={handleChange}
                        className="text-lg py-4 px-6 border-2 border-rose-100 focus:border-rose-300 rounded-[24px]"
                    />

                    </fieldset>
                    <div className="pt-6">
                        <Button 
                            type="submit" 
                            disabled={(!paymentData.clientId && !financial.locked) || isLoading || isRefreshing || !!dataError}
                            className="w-full py-6 text-xl rounded-[32px] shadow-lg shadow-rose-200"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Registrando...</span>
                                </div>
                            ) : (
                                isEditing ? 'Atualizar Recebimento ✨' : 'Confirmar Recebimento ✨'
                            )}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
