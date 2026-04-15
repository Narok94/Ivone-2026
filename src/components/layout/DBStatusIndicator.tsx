import React, { FC } from 'react';
import { useData } from '../../contexto/DataContext';
import { HeartIcon } from '../ui/Icons';

export const DBStatusIndicator: FC = () => {
    const { dbStatus, dbErrorMessage } = useData();

    const getStatusColor = () => {
        switch (dbStatus) {
            case 'connected': return 'text-emerald-500';
            case 'error': return 'text-rose-500';
            case 'checking': return 'text-amber-400 animate-pulse';
            default: return 'text-gray-400';
        }
    };

    const getFillColor = () => {
        switch (dbStatus) {
            case 'connected': return 'currentColor';
            case 'error': return 'currentColor';
            case 'checking': return 'none';
            default: return 'none';
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
        <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] group">
            <div className={`${getStatusColor()} cursor-help transition-transform hover:scale-125`}>
                <HeartIcon className="w-5 h-5" fill={getFillColor()} />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                    {getStatusText()}
                </div>
            </div>
        </div>
    );
};
