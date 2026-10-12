import React, { FC, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-[#b73565] text-white shadow-md shadow-rose-200 hover:bg-[#98284f]',
        secondary: 'bg-[#fff1f5] text-[#853b55] border border-[#e3b8c7] hover:bg-rose-100',
        danger: 'bg-[#fff0f0] text-[#a3313f] border border-[#e8b6bc] hover:bg-red-100',
    };

    return (
        <button 
            className={`min-h-11 px-6 py-3 rounded-2xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#853b55] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
