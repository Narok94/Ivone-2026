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
    <div className="fixed top-24 right-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-5 rounded-2xl shadow-lg flex items-center justify-between z-50 animate-slide-in">
      <SparklesIcon className="w-5 h-5 mr-3"/>
      <p className="font-semibold">{message}</p>
      <button onClick={onClose} className="ml-4 text-xl font-semibold leading-none hover:text-pink-100">&times;</button>
    </div>
  );
};
