import React, { FC, useState } from 'react';
import { useData } from '../../contexto/DataContext';
import { Button, Input, TextArea } from '../common';
import { Client } from '../../types';

export const ClientForm: FC<{ client?: Client | null; onDone: () => void }> = ({ client, onDone }) => {
    const { addClient, updateClient } = useData();
    const [formData, setFormData] = useState({
        fullName: client?.fullName || '',
        cep: client?.cep || '',
        street: client?.street || '',
        number: client?.number || '',
        complement: client?.complement || '',
        neighborhood: client?.neighborhood || '',
        city: client?.city || '',
        state: client?.state || '',
        phone: client?.phone || '',
        email: client?.email || '',
        cpf: client?.cpf || '',
        observation: client?.observation || '',
    });
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [cepError, setCepError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const capitalizeWords = (str: string): string => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatPhone = (value: string): string => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const formatCep = (value: string): string => {
        if (!value) return '';
        return value
            .replace(/\D/g, '')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 9);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'fullName') {
            finalValue = capitalizeWords(value);
        } else if (name === 'phone') {
            finalValue = formatPhone(value);
        } else if (name === 'cep') {
            finalValue = formatCep(value);
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            if (cep.length > 0) setCepError('CEP inválido.');
            else setCepError('');
            return;
        }

        setIsCepLoading(true);
        setCepError('');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('Falha na busca');
            const data = await response.json();

            if (data.erro) {
                setCepError('CEP não encontrado.');
                setFormData(prev => ({
                    ...prev,
                    street: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    street: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf,
                    complement: data.complemento || '',
                }));
                document.getElementById('number')?.focus();
            }
        } catch (error) {
            setCepError('Erro ao buscar CEP. Verifique sua conexão.');
            console.error(error);
        } finally {
            setIsCepLoading(false);
        }
    };

    const handleEmailDomainClick = (domain: string) => {
        setFormData(prev => {
            const email = prev.email.split('@')[0];
            return { ...prev, email: email + domain };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if(client){
                await updateClient({ ...client, ...formData });
            } else {
                await addClient(formData);
            }
            onDone();
        } catch (error) {
            console.error(error);
            alert('Ocorreu um erro ao salvar o cliente. 🌸');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome Completo" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-1">
                    <Input label="CEP" id="cep" name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} maxLength={9} placeholder="00000-000" />
                    {isCepLoading && <p className="text-sm text-gray-500 mt-1">Buscando endereço...</p>}
                    {cepError && <p className="text-sm text-red-500 mt-1">{cepError}</p>}
                </div>
                <div className="md:col-span-2">
                    <Input label="Rua / Logradouro" id="street" name="street" value={formData.street} onChange={handleChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Número" id="number" name="number" value={formData.number} onChange={handleChange} />
                <div className="md:col-span-2">
                    <Input label="Complemento" id="complement" name="complement" value={formData.complement} onChange={handleChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Bairro" id="neighborhood" name="neighborhood" value={formData.neighborhood} onChange={handleChange} />
                <Input label="Cidade" id="city" name="city" value={formData.city} onChange={handleChange} />
                <Input label="Estado (UF)" id="state" name="state" value={formData.state} onChange={handleChange} maxLength={2} />
            </div>
            
            <Input label="Telefone" id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} maxLength={15} />
            <div>
                <Input label="E-mail" id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                <div className="flex gap-2 mt-1.5 flex-wrap">
                    {['@gmail.com', '@hotmail.com', '@yahoo.com', '@yahoo.com.br'].map(domain => (
                        <button
                            type="button"
                            key={domain}
                            onClick={() => handleEmailDomainClick(domain)}
                            className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors"
                        >
                            {domain}
                        </button>
                    ))}
                </div>
            </div>
            <Input label="CPF" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} />
            <TextArea label="Observação" id="observation" name="observation" value={formData.observation} onChange={handleChange} />
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Salvando...</span>
                        </div>
                    ) : (
                        client ? 'Atualizar Cliente' : 'Cadastrar Cliente'
                    )}
                </Button>
            </div>
        </form>
    );
};
