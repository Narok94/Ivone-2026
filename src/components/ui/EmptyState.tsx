import React, { FC, ReactNode } from 'react';

interface EmptyStateProps {
  icon: FC<{className?: string}>;
  title: string;
  message: string;
  actionButton?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon: Icon, title, message, actionButton }) => (
    <div className="text-center py-12 px-6 bg-pink-50/50 rounded-3xl border-2 border-dashed border-pink-200">
        <div className="p-4 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full inline-block mb-4">
            <Icon className="w-12 h-12 text-pink-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{message}</p>
        {actionButton}
    </div>
);
