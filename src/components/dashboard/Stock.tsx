import React, { FC } from 'react';
import { Card } from '../common';
import { ArchiveIcon } from '../ui/Icons';

export const Stock: FC = () => {
    return (
        <div className="max-w-4xl mx-auto pb-10 animate-view-enter">
            <h1 className="text-3xl font-black text-rose-800 mb-8 flex items-center gap-3 italic">
                Meu Estoque 📦
            </h1>
            
            <Card className="p-10 text-center border-rose-100 shadow-xl shadow-rose-200/20">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ArchiveIcon className="w-10 h-10 text-rose-400" />
                </div>
                <h2 className="text-2xl font-black text-rose-900 mb-4">Em breve... ✨</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                    Ivone, estamos preparando essa área para você controlar seus produtos que já estão em mãos! 🌸
                </p>
            </Card>
        </div>
    );
};
