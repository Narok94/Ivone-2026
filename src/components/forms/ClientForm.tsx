import React, { FC, useEffect, useRef, useState } from 'react';
import { useData } from '../../contexto/DataContext';
import { Button, Input, TextArea } from '../common';
import { Client } from '../../types';
import { validateClientData, type ClientData } from '../../lib/client-fields';

export const ClientForm: FC<{ client?: Client | null; initialData?: ClientData; onDone: () => void; onSave?: (data: ClientData) => Promise<void>; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void; onBusyChange?: (busy: boolean) => void; pendingSave?: boolean }> = ({ client: existing, initialData, onDone, onSave, onCancel, onDirtyChange, onBusyChange, pendingSave }) => {
    const client = existing ?? (initialData ? { ...initialData, id: '' } : undefined);
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
    const [saveError, setSaveError] = useState('');
    const baseline = useRef(JSON.stringify(formData));
    const current = useRef(formData); current.current = formData;
    const lookup = useRef(0);
    const [addressProposal, setAddressProposal] = useState<Partial<ClientData> | null>(null);
    useEffect(() => { onDirtyChange?.(JSON.stringify(formData) !== baseline.current); }, [formData, onDirtyChange]);
    useEffect(() => { onBusyChange?.(isSubmitting); }, [isSubmitting, onBusyChange]);
    useEffect(() => () => { lookup.current++; }, []);

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
        setSaveError('');
        if (name === 'cep') { lookup.current++; setAddressProposal(null); setIsCepLoading(false); }
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
        const request = ++lookup.current;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(8000), credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!response.ok) throw new Error('Falha na busca');
            const data = await response.json();
            if (request !== lookup.current || current.current.cep.replace(/\D/g, '') !== cep) return;

            if (data.erro) {
                setCepError('CEP não encontrado.');
            } else {
                const proposal: Partial<ClientData> = { street: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '' };
                const conflicts: Partial<ClientData> = {};
                const blanks: Partial<ClientData> = {};
                for (const [key, value] of Object.entries(proposal) as [keyof ClientData, string][]) {
                    if (!value) continue;
                    if (!current.current[key]) blanks[key] = value;
                    else if (current.current[key] !== value) conflicts[key] = value;
                }
                setFormData(prev => ({ ...prev, ...blanks }));
                setAddressProposal(Object.keys(conflicts).length ? conflicts : null);
            }
        } catch (error) {
            if (request === lookup.current) setCepError('Não consegui consultar o CEP. Você pode preencher o endereço manualmente.');
        } finally {
            if (request === lookup.current) setIsCepLoading(false);
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
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSaveError('');
        try {
            if (onSave) {
                const valid = validateClientData(formData);
                await onSave(valid);
            } else if(existing){
                await updateClient({ ...existing, ...formData });
            } else {
                await addClient(formData);
            }
            onDone();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Não consegui salvar. Confira os dados e tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (onSave) {
        const locked = isSubmitting || pendingSave;
        const input = (name: keyof ClientData, label: string, type = 'text') => <Input label={label} id={name} name={name} type={type} value={formData[name]} onChange={handleChange} onBlur={name === 'cep' ? handleCepBlur : undefined} required={name === 'fullName'} maxLength={name === 'fullName' ? 300 : name === 'cep' ? 9 : name === 'state' ? 2 : 1000} inputMode={['cep', 'cpf', 'number'].includes(name) ? 'numeric' : undefined} disabled={Boolean(locked)} />;
        return <form onSubmit={handleSubmit} className="client-modal-form">
            <fieldset disabled={Boolean(locked)}><legend>Dados pessoais</legend><div className="client-form-grid">{input('fullName', 'Nome Completo')}{input('phone', 'Telefone', 'tel')}{input('email', 'E-mail', 'email')}{input('cpf', 'CPF')}</div></fieldset>
            <fieldset disabled={Boolean(locked)}><legend>Endereço</legend><div className="client-form-grid">{input('cep', 'CEP')}{input('street', 'Rua / Logradouro')}{input('number', 'Número')}{input('complement', 'Complemento')}{input('neighborhood', 'Bairro')}{input('city', 'Cidade')}{input('state', 'Estado (UF)')}</div>
                {isCepLoading && <p role="status">Buscando endereço…</p>}{cepError && <p className="client-form-error" role="status">{cepError}</p>}
                {addressProposal && <div className="client-address-proposal"><p>O CEP encontrou um endereço diferente. Deseja substituir os campos preenchidos?</p><p>{Object.values(addressProposal).join(' · ')}</p><Button type="button" onClick={() => { setFormData(prev => ({ ...prev, ...addressProposal })); setAddressProposal(null); }}>Usar endereço do CEP</Button><Button type="button" variant="secondary" onClick={() => setAddressProposal(null)}>Manter meu endereço</Button></div>}
            </fieldset>
            <fieldset disabled={Boolean(locked)}><legend>Informações adicionais</legend><TextArea label="Observações" id="observation" name="observation" maxLength={2000} value={formData.observation} onChange={handleChange} /></fieldset>
            {saveError && <p role="alert" className="client-form-error">{saveError}</p>}
            <div className="client-form-actions"><Button type="button" variant="secondary" onClick={onCancel} disabled={Boolean(locked)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : pendingSave ? 'Verificar salvamento' : existing ? 'Salvar alterações' : 'Salvar cliente'}</Button></div>
        </form>;
    }
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
                {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}
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
