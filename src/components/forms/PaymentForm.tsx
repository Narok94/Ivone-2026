import React, { FC, useState, useEffect } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input, Select } from '../common';
import { Payment } from '../../types';

export const PaymentForm: FC<{ 
    editingPayment?: Payment | null; 
    onPaymentSuccess: (isEditing: boolean) => void; 
    prefilledClientId: string | null; 
}> = ({ onPaymentSuccess, prefilledClientId, editingPayment }) => {
    const { clients, addPayment, updatePayment, clientBalances } = useData();
    const isEditing = !!editingPayment;

    const [paymentData, setPaymentData] = useState({
        clientId: prefilledClientId || '',
        paymentDate: new Date().toISOString().split('T')[0],
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
        } else if (prefilledClientId) {
            setPaymentData(prev => ({ ...prev, clientId: prefilledClientId, amount: '0', observation: '' }));
        }
    }, [editingPayment, prefilledClientId]);
    
    useEffect(() => {
        if (paymentData.clientId) {
            const balance = clientBalances.get(paymentData.clientId);
            const adjustedBalance = isEditing && editingPayment && paymentData.clientId === editingPayment.clientId
                ? (balance || 0) + editingPayment.amount
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
        if (Number(paymentData.amount) <= 0) {
            alert('O valor do pagamento deve ser maior que zero.');
            return;
        }
        const paymentPayload = {
            ...paymentData,
            amount: Number(paymentData.amount)
        };
        
        if (isEditing && editingPayment) {
            await updatePayment({ ...paymentPayload, id: editingPayment.id });
        } else {
            await addPayment(paymentPayload);
        }
        
        onPaymentSuccess(isEditing);
    };
    
    return (
         <Card>
            <h1 className="text-2xl font-bold text-rose-800 mb-6">{isEditing ? 'Editar Recebimento' : 'Receber Pagamento'} 💸</h1>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
                <Select label="Cliente" name="clientId" value={paymentData.clientId} onChange={handleChange} disabled={isEditing}>
                    <option value="">Selecione uma cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </Select>
                {selectedClientBalance !== null && (
                    <div className={`p-3 rounded-xl text-center ${selectedClientBalance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        Saldo devedor atual: <span className="font-bold">{selectedClientBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                    </div>
                )}
                 <Input label="Data do Pagamento" name="paymentDate" type="date" value={paymentData.paymentDate} onChange={handleChange} />
                 <div>
                    <Input
                        label="Valor Recebido (R$)"
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={handleChange}
                        onFocus={(e) => e.target.value === '0' && setPaymentData(prev => ({...prev, amount: ''}))}
                        onBlur={(e) => e.target.value === '' && setPaymentData(prev => ({...prev, amount: '0'}))}
                        required
                    />
                </div>
                <Input label="Observação (opcional)" name="observation" value={paymentData.observation} onChange={handleChange} />
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={!paymentData.clientId}>{isEditing ? 'Atualizar Recebimento' : 'Registrar Recebimento'}</Button>
                </div>
            </form>
        </Card>
    );
};
