import React, { FC, useEffect } from 'react';
import { SparklesIcon } from './Icons';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div role="status" className="fixed top-24 right-6 max-w-[calc(100vw-3rem)] bg-[#edf7ef] border border-[#bedbc4] text-[#285d3c] py-3 px-5 rounded-2xl shadow-lg flex items-center justify-between z-50 animate-slide-in">
      <SparklesIcon className="w-5 h-5 mr-3"/>
      <p className="font-semibold">{message}</p>
      <button aria-label="Fechar mensagem" onClick={onClose} className="ml-4 min-h-11 min-w-11 text-xl font-semibold leading-none">&times;</button>
    </div>
  );
};
