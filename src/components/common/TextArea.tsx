import React, { FC, TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const TextArea: FC<TextAreaProps> = ({ label, id, className = '', ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-sm font-bold text-rose-900/60 mb-1.5 ml-1 uppercase tracking-wider">{label}</label>}
        <textarea 
            id={id}
            className={`w-full px-5 py-3.5 bg-white/70 border-2 border-rose-100/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all placeholder:text-rose-200 min-h-[100px] ${className}`}
            {...props}
        />
    </div>
);
