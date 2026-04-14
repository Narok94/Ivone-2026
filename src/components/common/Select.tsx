import React, { FC, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export const Select: FC<SelectProps> = ({ label, id, children, className = '', ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-sm font-bold text-rose-900/60 mb-1.5 ml-1 uppercase tracking-wider">{label}</label>}
        <select 
            id={id}
            className={`w-full px-5 py-3.5 bg-white/70 border-2 border-rose-100/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all appearance-none ${className}`}
            {...props}
        >
            {children}
        </select>
    </div>
);
