import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    className={`bg-white/60 backdrop-blur-md rounded-3xl shadow-md border border-pink-100 p-6 transition-all duration-300 ${className} ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}`}
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
  const baseClasses = 'py-2 px-5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform';
  const variantClasses = {
    primary: 'bg-gradient-to-br from-pink-500 to-rose-500 text-white font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-rose-400',
    secondary: 'bg-pink-100 text-pink-700 hover:bg-pink-200 focus:ring-pink-500 font-semibold',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 font-semibold shadow-md hover:shadow-lg',
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

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      id={id}
      className="w-full px-4 py-2 bg-white/70 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-shadow text-gray-900"
      {...props}
    />
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <textarea
      id={id}
      rows={3}
      className="w-full px-4 py-2 bg-white/70 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-shadow"
      {...props}
    ></textarea>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        id={id}
        className="w-full px-4 py-2 border bg-white/70 border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-shadow"
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