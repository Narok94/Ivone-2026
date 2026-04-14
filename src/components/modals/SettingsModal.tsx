import React, { FC } from 'react';
import { Modal, Button, Select } from '../common';
import { PaletteIcon } from '../ui';
import { useAuth } from '../../contexto/AuthContext';

export const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; showToast: (msg: string) => void }> = ({ isOpen, onClose, showToast }) => {
    const { currentUser, logout } = useAuth();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
            <div className="space-y-6">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-sm text-rose-700">
                        Configurações de conta e sistema.
                    </p>
                </div>

                <Button 
                    onClick={() => {
                        logout();
                        onClose();
                    }} 
                    variant="danger" 
                    className="w-full"
                >
                    Sair da Conta
                </Button>

                <Button onClick={onClose} className="w-full">Concluir</Button>
            </div>
        </Modal>
    );
};
