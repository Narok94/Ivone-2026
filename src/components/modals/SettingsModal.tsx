import React, { FC, useState, useEffect } from 'react';
import { Modal, Button } from '../common';
import { DatabaseIcon } from '../ui';
import { useAuth } from '../../contexto/AuthContext';

export const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; showToast: (msg: string) => void }> = ({ isOpen, onClose, showToast }) => {
    const { currentUser, logout } = useAuth();
    const [dbStatus, setDbStatus] = useState<{ status: string; message?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/health')
                .then(res => res.json())
                .then(data => setDbStatus(data))
                .catch(err => setDbStatus({ status: 'error', message: 'Não foi possível conectar ao servidor.' }));
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurações">
            <div className="space-y-6">
                {/* Database Status */}
                <div className="p-4 bg-white rounded-2xl border border-pink-100 shadow-sm">
                    <div className="flex items-center gap-3 text-rose-800 font-bold mb-3">
                        <DatabaseIcon className="w-5 h-5" />
                        <h3>Status do Banco de Dados</h3>
                    </div>
                    
                    {dbStatus?.status === 'connected' ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Conectado ao Neon (PostgreSQL)
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-rose-600 font-medium text-sm">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                Desconectado ou Erro de Configuração
                            </div>
                            <p className="text-[10px] text-gray-500 leading-tight">
                                Certifique-se de que a variável <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> está configurada corretamente no AI Studio.
                            </p>
                        </div>
                    )}
                </div>

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
