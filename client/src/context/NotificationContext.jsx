import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const NotificationContext = createContext();

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'success', duration = 3500) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        
        setNotifications(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const icons = {
        success: <CheckCircle className="text-emerald-500 animate-pulse" size={18} />,
        error: <AlertCircle className="text-rose-500 animate-bounce" size={18} />,
        info: <Info className="text-blue-500" size={18} />,
    };

    const containerStyles = {
        success: 'border-[var(--color-divider)] bg-white/95 dark:bg-zinc-900/95 text-[var(--color-text-main)] border-l-4 border-l-emerald-500 shadow-2xl dark:border-l-emerald-600',
        error: 'border-[var(--color-divider)] bg-white/95 dark:bg-zinc-900/95 text-[var(--color-text-main)] border-l-4 border-l-rose-500 shadow-2xl dark:border-l-rose-600',
        info: 'border-[var(--color-divider)] bg-white/95 dark:bg-zinc-900/95 text-[var(--color-text-main)] border-l-4 border-l-blue-500 shadow-2xl dark:border-l-blue-600',
    };

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification }}>
            {children}
            {/* Stacked Notification Container */}
            <div className="fixed top-4 right-4 z-[250] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md pointer-events-auto transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right duration-300",
                            containerStyles[notif.type]
                        )}
                    >
                        <div className="flex-shrink-0">
                            {icons[notif.type]}
                        </div>
                        <div className="flex-1 text-xs font-bold tracking-tight text-[var(--color-text-main)] leading-tight pr-2 select-none">
                            {notif.message}
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ml-auto cursor-pointer"
                        >
                            <X size={14} className="text-[var(--color-text-muted)]" />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
