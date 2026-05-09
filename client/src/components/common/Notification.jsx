import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function Notification({ show, onClose, type = 'success', message, duration = 3000 }) {
    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    const containerStyles = {
        success: 'border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] border-l-4 border-l-green-600 shadow-2xl dark:border-green-800',
        error: 'border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] border-l-4 border-l-red-600 shadow-2xl dark:border-red-800',
        info: 'border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] border-l-4 border-l-blue-600 shadow-2xl dark:border-blue-800',
    };

    return (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-[200] animate-in slide-in-from-top-4 sm:slide-in-from-right-full duration-300">
            <div className={cn(
                "flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-2xl backdrop-blur-md max-w-full sm:min-w-[320px] sm:max-w-md",
                containerStyles[type]
            )}>
                <div className="flex-shrink-0">
                    {icons[type]}
                </div>
                <div className="flex-1 text-[11px] sm:text-sm font-black uppercase tracking-tight leading-tight">
                    {message}
                </div>
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ml-1"
                >
                    <X size={14} className="sm:w-4 sm:h-4" />
                </button>
            </div>
        </div>
    );
}
