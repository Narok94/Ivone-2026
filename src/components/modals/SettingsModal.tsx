import React, { FC, useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../common';
import { DatabaseIcon } from '../ui';
import { useAuth } from '../../contexto/AuthContext';

export const SettingsModal: FC<{ isOpen: boolean; onClose: () => void; showToast: (msg: string) => void }> = ({ isOpen, onClose, showToast }) => {
    const { currentUser, logout } = useAuth();
    const [dbStatus, setDbStatus] = useState<{ status: string; message?: string } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/health')
                .then(res => res.json())
                .then(data => setDbStatus(data))
                .catch(() => setDbStatus({ status: 'error', message: 'Nao foi possivel conectar ao servidor.' }));
        }
    }, [isOpen]);

    const handleExportBackup = async () => {
        if (!currentUser?.id) return;
        
        setIsExporting(true);
        try {
            const response = await fetch(`/api/backup?userId=${currentUser.id}`);
            const data = await response.json();
            
            // Create and download file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-ivone-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Backup exportado com sucesso!');
        } catch (error) {
            showToast('Erro ao exportar backup');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportBackup = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser?.id) return;
        
        setIsImporting(true);
        try {
            const text = await file.text();
            let data: any;
            
            // Try to parse as JSON first
            try {
                data = JSON.parse(text);
            } catch {
                // If not JSON, try to extract data from JS file
                // Look for patterns like: export const clients = [...] or const clients = [...]
                const extractArray = (name: string): any[] => {
                    const patterns = [
                        new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(\\[.*?\\]);`, 's'),
                        new RegExp(`const\\s+${name}\\s*=\\s*(\\[.*?\\]);`, 's'),
                        new RegExp(`"${name}"\\s*:\\s*(\\[.*?\\])`, 's'),
                    ];
                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            try {
                                return JSON.parse(match[1]);
                            } catch {
                                // Try eval as last resort (for JS syntax)
                                try {
                                    return eval(match[1]);
                                } catch {
                                    continue;
                                }
                            }
                        }
                    }
                    return [];
                };
                
                data = {
                    data: {
                        clients: extractArray('clients') || extractArray('clientes'),
                        stockItems: extractArray('stockItems') || extractArray('estoque') || extractArray('stock'),
                        sales: extractArray('sales') || extractArray('vendas'),
                        payments: extractArray('payments') || extractArray('pagamentos')
                    }
                };
            }
            
            // Check if data has the expected structure
            const backupData = data.data || data;
            
            const response = await fetch('/api/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    data: backupData,
                    clearExisting: true // Replace existing data
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(`Backup restaurado! Clientes: ${result.imported.clients}, Estoque: ${result.imported.stockItems}, Vendas: ${result.imported.sales}, Pagamentos: ${result.imported.payments}`);
            } else {
                showToast(result.error || 'Erro ao restaurar backup');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Erro ao ler arquivo de backup');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuracoes">
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
                                Desconectado ou Erro de Configuracao
                            </div>
                            <p className="text-[10px] text-gray-500 leading-tight">
                                Certifique-se de que a variavel <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> esta configurada corretamente.
                            </p>
                        </div>
                    )}
                </div>

                {/* Backup & Restore */}
                <div className="p-4 bg-white rounded-2xl border border-pink-100 shadow-sm">
                    <div className="flex items-center gap-3 text-rose-800 font-bold mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" x2="12" y1="3" y2="15" />
                        </svg>
                        <h3>Backup e Restauracao</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <Button 
                            onClick={handleExportBackup}
                            disabled={isExporting || dbStatus?.status !== 'connected'}
                            className="w-full"
                        >
                            {isExporting ? 'Exportando...' : 'Exportar Backup (JSON)'}
                        </Button>
                        
                        <Button 
                            onClick={handleImportBackup}
                            disabled={isImporting || dbStatus?.status !== 'connected'}
                            variant="secondary"
                            className="w-full"
                        >
                            {isImporting ? 'Importando...' : 'Restaurar Backup (JSON/JS)'}
                        </Button>
                        
                        <input 
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.js"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        
                        <p className="text-[10px] text-gray-500 leading-tight">
                            O backup inclui: clientes, estoque, vendas e pagamentos. Restaurar substituira todos os dados existentes.
                        </p>
                    </div>
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
