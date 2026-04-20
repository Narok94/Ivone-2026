import React, { FC, ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: FC<CardProps> = ({ children, className = '', onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-[24px] md:rounded-3xl shadow-xl border border-white/50 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]' : ''} ${className}`}
    >
        {children}
    </div>
);
