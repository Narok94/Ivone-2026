import React, { FC, useState } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { Card, Button, Input, Modal } from '../common';
import { EditIcon, KeyIcon, TrashIcon } from '../ui/Icons';
import { User } from '../../types';

export const ManageUsers: FC<{showToast: (msg: string) => void;}> = ({ showToast }) => {
    const { users, addUser, updateUser, updatePassword, deleteUser } = useAuth();
    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isPasswordModalOpen, setPasswordModalOpen] = useState<User | null>(null);

    const [newUser, setNewUser] = useState({ username: '', password: '', firstName: '', lastName: '' });
    const [newPassword, setNewPassword] = useState('');

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            addUser(newUser.username, newUser.password, newUser.firstName, newUser.lastName);
            showToast(`Usuário ${newUser.username} criado!`);
            setNewUser({ username: '', password: '', firstName: '', lastName: '' });
            setAddUserModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        }
    };
    
    const handleEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            updateUser(editingUser);
            showToast(`Usuário ${editingUser.username} atualizado!`);
            setEditingUser(null);
        } catch (error: any) {
            alert(error.message)
        }
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (isPasswordModalOpen && newPassword) {
            try {
                updatePassword(isPasswordModalOpen.id, newPassword);
                showToast(`Senha de ${isPasswordModalOpen.username} atualizada!`);
                setNewPassword('');
                setPasswordModalOpen(null);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleDeleteUser = (user: User) => {
        if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.username}? Esta ação não pode ser desfeita.`)) {
            try {
                deleteUser(user.id);
                showToast(`Usuário ${user.username} excluído!`);
            } catch (error: any) {
                alert(error.message);
            }
        }
    };
    
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                <Button onClick={() => setAddUserModalOpen(true)}>Criar Usuário</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-100 uppercase text-sm font-semibold">
                            <th className="p-3">Nome Completo</th>
                            <th className="p-3">Usuário</th>
                            <th className="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.filter(u => u.role !== 'admin').map(user => (
                            <tr key={user.id} className="border-b">
                                <td className="p-3 font-medium">{user.firstName} {user.lastName}</td>
                                <td className="p-3">{user.username}</td>
                                <td className="p-3 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:text-blue-800" title="Editar Usuário"><EditIcon /></button>
                                        <button onClick={() => setPasswordModalOpen(user)} className="text-slate-600 hover:text-slate-800" title="Mudar Senha"><KeyIcon /></button>
                                        {user.role !== 'admin' && <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-800" title="Excluir"><TrashIcon /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            <Modal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Criar Novo Usuário" contentClassName="theme-admin-dark">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <Input label="Nome" id="newFirstName" value={newUser.firstName} onChange={e => setNewUser(p => ({...p, firstName: capitalize(e.target.value)}))} />
                    <Input label="Sobrenome" id="newLastName" value={newUser.lastName} onChange={e => setNewUser(p => ({...p, lastName: capitalize(e.target.value)}))} />
                    <Input label="Nome de usuário" id="newUsername" value={newUser.username} onChange={e => setNewUser(p => ({...p, username: e.target.value}))} />
                    <Input label="Senha" id="newPassword" type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} />
                    <Button type="submit">Criar</Button>
                </form>
            </Modal>
            
            {/* Edit User Modal */}
            <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Editar ${editingUser?.firstName}`} contentClassName="theme-admin-dark">
                {editingUser && (
                    <form onSubmit={handleEditUser} className="space-y-4">
                        <Input label="Nome" id="editFirstName" value={editingUser.firstName} onChange={e => setEditingUser(p => p ? {...p, firstName: capitalize(e.target.value)} : null)} />
                        <Input label="Sobrenome" id="editLastName" value={editingUser.lastName} onChange={e => setEditingUser(p => p ? {...p, lastName: capitalize(e.target.value)} : null)} />
                        <Input label="Nome de usuário" id="editUsername" value={editingUser.username} onChange={e => setEditingUser(p => p ? {...p, username: e.target.value} : null)} />
                        <Button type="submit">Atualizar Usuário</Button>
                    </form>
                )}
            </Modal>

            {/* Password Modal */}
            <Modal isOpen={!!isPasswordModalOpen} onClose={() => setPasswordModalOpen(null)} title={`Mudar senha de ${isPasswordModalOpen?.username}`} contentClassName="theme-admin-dark">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <Input label="Nova Senha" id="editPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus/>
                    <Button type="submit">Atualizar Senha</Button>
                </form>
            </Modal>
        </Card>
    );
};
