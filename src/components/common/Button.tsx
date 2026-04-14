import React, { FC, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-0.5',
        secondary: 'bg-white text-rose-500 border-2 border-rose-100 hover:bg-rose-50',
        danger: 'bg-rose-100 text-rose-600 hover:bg-rose-200',
    };

    return (
        <button 
            className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
