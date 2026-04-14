import React, { FC, ReactNode } from 'react';
import { XIcon } from '../ui/Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    contentClassName?: string;
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName = '' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${contentClassName}`}>
                <div className="p-8 flex justify-between items-center border-b border-rose-50">
                    <h2 className="text-2xl font-black text-rose-900 italic tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-xl transition-colors text-rose-300 hover:text-rose-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
