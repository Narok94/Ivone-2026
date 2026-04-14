import React, { FC } from 'react';
import { Modal, Button, Select } from '../common';
import { PaletteIcon } from '../ui';
import { useAuth } from '../../contexto/AuthContext';

export const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; showToast: (msg: string) => void }> = ({ isOpen, onClose, showToast }) => {
    const { currentUser, updateUser } = useAuth();

    const handleThemeChange = (theme: string) => {
        if (!currentUser) return;
        updateUser({ id: currentUser.id, theme: theme as any });
        showToast(`Tema alterado para ${theme}!`);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-rose-800 font-bold mb-2">
                        <PaletteIcon className="w-5 h-5" />
                        <h3>Personalização</h3>
                    </div>
                    <Select 
                        label="Tema do Sistema" 
                        value={currentUser?.theme || 'default'} 
                        onChange={e => handleThemeChange(e.target.value)}
                    >
                        <option value="default">Padrão (Rosa Ivone)</option>
                        <option value="ocean">Oceano (Azul)</option>
                        <option value="forest">Floresta (Verde)</option>
                        <option value="sunset">Pôr do Sol (Laranja)</option>
                    </Select>
                </div>
                
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-sm text-rose-700">
                        As configurações de tema são salvas localmente no seu navegador e aplicadas sempre que você fizer login neste dispositivo.
                    </p>
                </div>

                <Button onClick={onClose} className="w-full">Concluir</Button>
            </div>
        </Modal>
    );
};
