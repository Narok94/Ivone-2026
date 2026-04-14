import React, { FC, useState } from 'react';
import { Modal, Button } from '../common';
import { DatabaseIcon } from '../ui';
import { useData } from '../../contexto/DataContext';
import { useAuth } from '../../contexto/AuthContext';

export const BackupRestoreModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { exportData, importData } = useData();
    const { users } = useAuth();
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const handleExport = () => {
        const data = exportData(selectedUserIds);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ivone_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (confirm('Isso irá substituir os dados atuais. Deseja continuar?')) {
                    importData(data);
                    alert('Dados importados com sucesso!');
                    onClose();
                }
            } catch (err) {
                alert('Erro ao importar dados. Verifique o arquivo.');
            }
        };
        reader.readAsText(file);
    };

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Backup & Restore">
            <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-700 font-bold mb-4">
                    <DatabaseIcon className="w-6 h-6" />
                    <h3>Gerenciar Dados</h3>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Selecione os usuários para backup:</p>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1">
                        {users.filter(u => u.role === 'user').map(user => (
                            <label key={user.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedUserIds.includes(user.id)}
                                    onChange={() => toggleUser(user.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="font-medium text-slate-700">{user.firstName} {user.lastName}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    <Button onClick={handleExport} disabled={selectedUserIds.length === 0} className="!bg-slate-900 !shadow-none">Exportar JSON</Button>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImport}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Button variant="secondary" className="w-full !border-slate-200 !text-slate-700">Importar JSON</Button>
                    </div>
                </div>
                
                <p className="text-xs text-slate-400 text-center">
                    O backup inclui clientes, estoque, vendas e pagamentos dos usuários selecionados.
                </p>
            </div>
        </Modal>
    );
};
