import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    className={`bg-white rounded-[32px] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.15)] border border-gray-200 p-6 transition-all duration-300 ${className} ${onClick ? 'cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:scale-95' : ''}`}
    onClick={onClick}
  >
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = 'py-2 px-5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform active:scale-95';
  const variantClasses = {
    primary: 'bg-gradient-to-br from-[#e91e63] to-[#c2185b] text-white font-black shadow-[0_8px_20px_rgba(233,30,99,0.25)] hover:shadow-[0_12px_25px_rgba(233,30,99,0.35)] hover:-translate-y-0.5 focus:ring-[#e91e63]',
    secondary: 'bg-rose-50 text-[#e91e63] hover:bg-rose-100 focus:ring-[#e91e63] font-black border border-rose-100/50',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 font-black shadow-md hover:shadow-lg',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={id} className="block text-xs font-black text-rose-400 uppercase tracking-widest ml-1">{label}</label>}
    <input
      id={id}
      className={`w-full px-5 py-3 bg-white border-2 border-rose-100 rounded-2xl shadow-sm focus:outline-none focus:border-[#e91e63] focus:ring-4 focus:ring-rose-50 transition-all text-gray-900 font-medium placeholder:text-gray-300 ${className}`}
      {...props}
    />
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, className = '', ...props }) => (
  <div className="space-y-1.5">
    {label && <label htmlFor={id} className="block text-xs font-black text-rose-400 uppercase tracking-widest ml-1">{label}</label>}
    <textarea
      id={id}
      rows={3}
      className={`w-full px-5 py-3 bg-white border-2 border-rose-100 rounded-2xl shadow-sm focus:outline-none focus:border-[#e91e63] focus:ring-4 focus:ring-rose-50 transition-all text-gray-800 font-medium placeholder:text-gray-300 ${className}`}
      {...props}
    ></textarea>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, className = '', ...props }) => (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-xs font-black text-rose-400 uppercase tracking-widest ml-1">{label}</label>}
      <select
        id={id}
        className={`w-full px-5 py-3 border-2 bg-white border-rose-100 rounded-2xl shadow-sm focus:outline-none focus:border-[#e91e63] focus:ring-4 focus:ring-rose-50 transition-all font-medium ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
);


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName = '' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 modal-backdrop animate-backdrop-fade-in">
      <div className={`bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-pink-200 ${contentClassName} animate-modal-scale-in`}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-pink-600">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};