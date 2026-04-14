import React, { FC, useMemo } from 'react';
import { useAuth } from '../../contexto/AuthContext';
import { Card } from '../common';
import { UsersIcon, ShieldIcon, UsersCogIcon } from '../ui/Icons';

export const AdminDashboard: FC = () => {
    const { users } = useAuth();

    const userStats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        standard: users.filter(u => u.role === 'user').length,
    }), [users]);
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-700">Visão Geral do Sistema</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="!bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-full">
                            <UsersIcon className="w-6 h-6 text-slate-600"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total de Usuários</p>
                            <p className="text-3xl font-bold text-slate-800">{userStats.total}</p>
                        </div>
                    </div>
                </Card>
                 <Card className="!bg-white">
                    <div className="flex items-center gap-4">
                         <div className="p-3 bg-slate-100 rounded-full">
                            <ShieldIcon className="w-6 h-6 text-slate-600"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Administradores</p>
                            <p className="text-3xl font-bold text-slate-800">{userStats.admins}</p>
                        </div>
                    </div>
                </Card>
                 <Card className="!bg-white">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-full">
                            <UsersCogIcon className="w-6 h-6 text-slate-600"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Usuários Padrão</p>
                            <p className="text-3xl font-bold text-slate-800">{userStats.standard}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
