import React, { useEffect } from 'react';
import { Card, CardContent } from './Card';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function Modal({ isOpen, onClose, title, children, className, maxWidth = 'md' }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <Card className={cn(
                "w-full relative shadow-2xl animate-in zoom-in-95 duration-200 border-[var(--color-divider)] bg-[var(--color-bg-card)]",
                maxWidthClasses[maxWidth] || maxWidth || maxWidthClasses.md,
                className
            )}>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors z-10 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
                >
                    <X size={18} />
                </button>

                <CardContent className="p-0">
                    {title && (
                        <div className="px-6 py-4 border-b border-[var(--color-divider)]">
                            <h3 className="text-lg font-bold text-[var(--color-secondary)]">{title}</h3>
                        </div>
                    )}
                    <div className="p-6">
                        {children}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
