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
        success: <CheckCircle className="text-emerald-500 animate-pulse flex-shrink-0" size={18} />,
        error: <AlertCircle className="text-rose-500 animate-bounce flex-shrink-0" size={18} />,
        info: <Info className="text-blue-500 flex-shrink-0" size={18} />,
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
                        <div className="flex-1 text-xs font-bold tracking-tight leading-tight pr-2 select-none">
                            {notif.message}
                        </div>
                        <button
                            onClick={() => removeNotification(notif.id)}
                            className={cn(
                                "flex-shrink-0 p-1 rounded-lg transition-colors ml-auto cursor-pointer",
                                closeButtonStyles[notif.type]
                            )}
                        >
                            <X size={14} />
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
