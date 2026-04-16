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

    const getStatusGlow = () => {
        switch (dbStatus) {
            case 'connected': return 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'error': return 'drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]';
            default: return '';
        }
    };

    const getStatusText = () => {
        switch (dbStatus) {
            case 'connected': return 'Banco de Dados Conectado';
            case 'error': return dbErrorMessage || 'Erro de Conexão';
            case 'checking': return 'Verificando conexão...';
            default: return 'Status desconhecido';
        }
    };

    return (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-[100] group">
            <div className={`${getStatusColor()} ${getStatusGlow()} cursor-help transition-all duration-300 hover:scale-125`}>
                <HeartIcon className="w-5 h-5" fill={getFillColor()} />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[10px] font-bold py-2 px-3 rounded-xl whitespace-nowrap shadow-2xl border border-white/10">
                    {getStatusText()}
                </div>
            </div>
        </div>
    );
};
