import React, { FC, useState } from 'react';
import { Modal, Button, Input } from '../common';
import { useAuth } from '../../contexto/AuthContext';

export const EditProfileModal: FC<{ isOpen: boolean; onClose: () => void; showToast: (msg: string) => void }> = ({ isOpen, onClose, showToast }) => {
    const { currentUser, updateUser, updatePassword } = useAuth();
    const [firstName, setFirstName] = useState(currentUser?.firstName || '');
    const [lastName, setLastName] = useState(currentUser?.lastName || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        try {
            updateUser({ id: currentUser.id, firstName, lastName });
            showToast('Perfil atualizado com sucesso!');
        } catch (error: any) {
            showToast(error.message);
        }
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (newPassword !== confirmPassword) {
            showToast('As senhas não coincidem.');
            return;
        }
        try {
            updatePassword(currentUser.id, newPassword, oldPassword);
            showToast('Senha atualizada com sucesso!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showToast(error.message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Meu Perfil">
            <div className="space-y-8">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <h3 className="font-bold text-rose-800 border-b border-rose-100 pb-2">Dados Pessoais</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                        <Input label="Sobrenome" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full">Salvar Alterações</Button>
                </form>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <h3 className="font-bold text-rose-800 border-b border-rose-100 pb-2">Alterar Senha</h3>
                    <Input label="Senha Atual" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Nova Senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        <Input label="Confirmar Nova Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full">Atualizar Senha</Button>
                </form>
            </div>
        </Modal>
    );
};
