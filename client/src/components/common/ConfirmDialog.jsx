import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export default function ConfirmDialog({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    isDestructive = false,
    loading = false 
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl max-w-sm w-full border border-[var(--color-divider)] overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-center mb-4">
                        {isDestructive ? (
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
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
                    
                    <p className="text-sm text-center text-[var(--color-text-muted)] mb-6">
                        {message}
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            className="flex-1 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border-[var(--color-divider)]"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            className={`flex-1 text-white ${
                                isDestructive 
                                ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20' 
                                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] shadow-md shadow-[var(--color-primary)]/20'
                            }`}
                            onClick={onConfirm}
                            disabled={loading}
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
