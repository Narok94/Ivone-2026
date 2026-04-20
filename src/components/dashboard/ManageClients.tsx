import React, { FC, useState, useMemo } from 'react';
import { useData } from '../../contexto/DataContext';
import { Card, Button, Input } from '../common';
import { TrashIcon, UsersIcon } from '../ui/Icons';
import { EmptyState } from '../ui/EmptyState';
import { View } from '../../types';

export const ManageClients: FC<{ setActiveView: (view: View) => void; onViewClient: (clientId: string) => void; showToast: (msg: string) => void; }> = ({ setActiveView, onViewClient, showToast }) => {
    const { clients, deleteClient, clientBalances } = useData();
    const [filter, setFilter] = useState('');
   
    const filteredClients = useMemo(() => {
        if (!filter) return clients;
        const lowercasedFilter = filter.toLowerCase();
        return clients.filter(c =>
            c.fullName.toLowerCase().includes(lowercasedFilter) ||
            c.phone.toLowerCase().includes(lowercasedFilter) ||
            c.email.toLowerCase().includes(lowercasedFilter) ||
            (c.cep && c.cep.includes(lowercasedFilter)) ||
            (c.street && c.street.toLowerCase().includes(lowercasedFilter)) ||
            (c.neighborhood && c.neighborhood.toLowerCase().includes(lowercasedFilter)) ||
            (c.city && c.city.toLowerCase().includes(lowercasedFilter)) ||
            (c.state && c.state.toLowerCase().includes(lowercasedFilter))
        );
    }, [clients, filter]);

    const handleAdd = () => {
        setActiveView('add_client');
    };

    const handleDelete = async (e: React.MouseEvent, clientId: string) => {
        e.stopPropagation(); // Prevent row click when deleting
        if (window.confirm('Tem certeza que deseja excluir este cliente? Todas as vendas e pagamentos associados permanecerão no histórico, mas não será possível associar novas transações a ele.')) {
            await deleteClient(clientId);
            showToast('Cliente excluído com sucesso!');
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-rose-800">Gerenciar Clientes 📋</h1>
                <Button onClick={handleAdd}>Adicionar Cliente</Button>
            </div>
            <Input
                label="Buscar por nome, telefone, e-mail ou endereço"
                id="search-client"
                placeholder="Digite para buscar..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mb-6"
            />
             {filteredClients.length > 0 ? (
                <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-pink-100/70 text-pink-800 font-semibold uppercase text-sm">
                            <tr>
                                <th className="p-3 rounded-l-2xl">Nome</th>
                                <th className="p-3 hidden md:table-cell">Telefone</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 hidden lg:table-cell">E-mail</th>
                                <th className="p-3 rounded-r-2xl text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(client => {
                                const balance = clientBalances.get(client.id) || 0;
                                return (
                                <tr key={client.id} onClick={() => onViewClient(client.id)} className="border-b border-pink-100/50 hover:bg-pink-50/50 cursor-pointer">
                                    <td className="p-3 font-medium">{client.fullName}</td>
                                    <td className="p-3 hidden md:table-cell">{client.phone}</td>
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
                                    <td className="p-3 hidden lg:table-cell">{client.email}</td>
                                    <td className="p-3">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={(e) => handleDelete(e, client.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon/></button>
                                        </div>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <EmptyState 
                    icon={UsersIcon} 
                    title={clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"} 
                    message={clients.length === 0 ? "Vamos começar? Adicione seu primeiro cliente para registrar vendas e pagamentos." : "Tente refinar sua busca ou adicione um novo cliente."} 
                    actionButton={clients.length === 0 ? <Button onClick={handleAdd}>Cadastrar Primeiro Cliente</Button> : undefined}
                />
            )}
        </Card>
    );
};
