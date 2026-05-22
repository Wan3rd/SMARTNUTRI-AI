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
        success: <CheckCircle className="text-emerald-500 animate-pulse flex-shrink-0" size={20} />,
        error: <AlertCircle className="text-rose-500 animate-bounce flex-shrink-0" size={20} />,
        info: <Info className="text-blue-500 flex-shrink-0" size={20} />,
    };

    const containerStyles = {
        success: 'border-emerald-200/60 bg-emerald-50/95 dark:bg-zinc-900/95 text-emerald-900 dark:text-emerald-100 border-l-4 border-l-emerald-500 dark:border-l-emerald-600 dark:border-zinc-800/80 shadow-2xl',
        error: 'border-rose-200/60 bg-rose-50/95 dark:bg-zinc-900/95 text-rose-900 dark:text-rose-100 border-l-4 border-l-rose-500 dark:border-l-rose-600 dark:border-zinc-800/80 shadow-2xl',
        info: 'border-blue-200/60 bg-blue-50/95 dark:bg-zinc-900/95 text-blue-900 dark:text-blue-100 border-l-4 border-l-blue-500 dark:border-l-blue-600 dark:border-zinc-800/80 shadow-2xl',
    };

    const closeButtonStyles = {
        success: 'text-emerald-700/70 hover:text-emerald-900 hover:bg-emerald-100/50 dark:text-emerald-400/70 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/40',
        error: 'text-rose-700/70 hover:text-rose-900 hover:bg-rose-100/50 dark:text-rose-400/70 dark:hover:text-rose-200 dark:hover:bg-rose-950/40',
        info: 'text-blue-700/70 hover:text-blue-900 hover:bg-blue-100/50 dark:text-blue-400/70 dark:hover:text-blue-200 dark:hover:bg-blue-950/40',
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
                <div className="flex-1 text-[11px] sm:text-sm font-semibold tracking-wide leading-relaxed">
                    {message}
                </div>
                <button
                    onClick={onClose}
                    className={cn(
                        "flex-shrink-0 p-1.5 rounded-lg transition-colors ml-1",
                        closeButtonStyles[type]
                    )}
                >
                    <X size={14} className="sm:w-4 sm:h-4" />
                </button>
            </div>
        </div>
    );
}
