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
        success: <CheckCircle className="text-[var(--color-success)] animate-pulse flex-shrink-0" size={20} />,
        error: <AlertCircle className="text-[var(--color-danger)] animate-bounce flex-shrink-0" size={20} />,
        info: <Info className="text-[var(--color-info)] flex-shrink-0" size={20} />,
    };

    const containerStyles = {
        success: 'border-[var(--color-success)]/20 bg-[var(--color-bg-card)]/95 text-[var(--color-text-main)] border-l-4 border-l-[var(--color-success)] shadow-2xl',
        error: 'border-[var(--color-danger)]/20 bg-[var(--color-bg-card)]/95 text-[var(--color-text-main)] border-l-4 border-l-[var(--color-danger)] shadow-2xl',
        info: 'border-[var(--color-info)]/20 bg-[var(--color-bg-card)]/95 text-[var(--color-text-main)] border-l-4 border-l-[var(--color-info)] shadow-2xl',
    };

    const closeButtonStyles = {
        success: 'text-[var(--color-success)]/70 hover:text-[var(--color-success)] hover:bg-[var(--color-success)]/10',
        error: 'text-[var(--color-danger)]/70 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10',
        info: 'text-[var(--color-info)]/70 hover:text-[var(--color-info)] hover:bg-[var(--color-info)]/10',
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
