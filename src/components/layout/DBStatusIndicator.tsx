import React, { FC } from 'react';
import { useData } from '../../contexto/DataContext';

export const DBStatusIndicator: FC = () => {
    const { dbStatus, dbErrorMessage } = useData();

    const getStatusColor = () => {
        switch (dbStatus) {
            case 'connected': return 'bg-emerald-500';
            case 'error': return 'bg-rose-500';
            case 'checking': return 'bg-amber-400 animate-pulse';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = () => {
        switch (dbStatus) {
            case 'connected': return 'Banco de Dados Conectado';
            case 'error': return `Erro de Conexão: ${dbErrorMessage || 'Falha desconhecida'}`;
            case 'checking': return 'Verificando conexão...';
            default: return 'Status desconhecido';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-[100] group">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} shadow-sm cursor-help transition-transform hover:scale-125`} />
            
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                    {getStatusText()}
                </div>
            </div>
        </div>
    );
};
