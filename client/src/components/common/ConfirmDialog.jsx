import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export default function ConfirmDialog({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    isDestructive = false,
    loading = false,
    confirmDisabled = false,
    children
}) {
    const [isClosing, setIsClosing] = React.useState(false);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setIsClosing(false);
        } else {
            setIsMounted(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const triggerCloseAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    }, [onClose]);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen && !isMounted) return null;

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[250] flex items-center justify-center p-4 transition-all duration-500 ease-out",
                isMounted && !isClosing ? "bg-black/50 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
            )}
        >
            <div 
                className={cn(
                    "bg-[var(--color-bg-card)] rounded-2xl shadow-2xl max-w-sm w-full border border-[var(--color-divider)] overflow-hidden transition-all duration-500 ease-out transform",
                    isMounted && !isClosing ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                )}
            >
                <div className="p-6">
                    <div className="flex justify-center mb-4">
                        {isDestructive ? (
                            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center">
                                <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <AlertTriangle className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        )}
                    </div>
                    
                    <h2 className="text-xl font-bold text-center text-[var(--color-secondary)] mb-2">
                        {title}
                    </h2>
                    
                    <p className="text-sm text-center text-[var(--color-text-muted)] mb-4">
                        {message}
                    </p>

                    {children}
                    
                    <div className="flex gap-3 w-full mt-6">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={triggerCloseAnimation}
                            disabled={loading}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            className={cn(
                                "flex-1 shadow-lg",
                                isDestructive 
                                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20" 
                                : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[var(--color-primary)]/20"
                            )}
                            onClick={onConfirm}
                            disabled={loading || confirmDisabled}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                    Wait...
                                </span>
                            ) : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
