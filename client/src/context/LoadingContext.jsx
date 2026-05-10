import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Syncing Clinical Data...');
    const [progress, setProgress] = useState(0);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const timerRef = React.useRef(null);
    const progressIntervalRef = React.useRef(null);

    const startLoading = useCallback((message = 'Syncing Clinical Data...') => {
        setLoadingMessage(message);
        setIsLoading(true);
        setHasTimedOut(false);
        setProgress(0);

        // Clear existing timers
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        // Simulated progress up to 90%
        progressIntervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                // Move fast at first, then slow down
                const increment = prev < 40 ? 5 : prev < 70 ? 2 : 0.5;
                return prev + increment;
            });
        }, 150);

        // Start 10s timeout fallback
        timerRef.current = setTimeout(() => {
            setHasTimedOut(true);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }, 10000);
    }, []);

    const stopLoading = useCallback(() => {
        // Snap to 100% for feedback
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);

        // Slight delay so user sees the 100% completion
        setTimeout(() => {
            setIsLoading(false);
            setHasTimedOut(false);
            setProgress(0);
        }, 400);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, loadingMessage, progress, hasTimedOut, startLoading, stopLoading }}>
            {children}
        </LoadingContext.Provider>
    );
}

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
