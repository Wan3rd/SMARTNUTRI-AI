import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const ThemeProviderContext = createContext({
    theme: "system",
    setTheme: () => null,
});

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}) {
    const { user, updateUser } = useAuth();
    const [theme, setThemeState] = useState(
        () => localStorage.getItem(storageKey) || defaultTheme
    );

    // Initial Sync from Database when user logs in
    useEffect(() => {
        if (user?.theme_preference && user.theme_preference !== theme) {
            setThemeState(user.theme_preference);
            localStorage.setItem(storageKey, user.theme_preference);
        }
    }, [user?.theme_preference]);

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light";

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    const setTheme = async (newTheme) => {
        const updateTheme = () => {
            setThemeState(newTheme);
            localStorage.setItem(storageKey, newTheme);
        };

        const syncBackend = async () => {
            if (user) {
                try {
                    await api.put('/auth/theme', { theme: newTheme });
                    updateUser({ ...user, theme_preference: newTheme });
                } catch (err) {
                    console.error('Failed to sync theme to backend:', err);
                }
            }
        };

        if (document.startViewTransition) {
            const root = window.document.documentElement;
            
            // Temporarily disable CSS transitions/animations to prevent paint lag during screenshot capture
            root.classList.add("no-transition");

            const transition = document.startViewTransition(() => {
                flushSync(() => {
                    updateTheme();
                });
            });

            try {
                await transition.finished;
            } catch (err) {
                console.error("View transition failed:", err);
            } finally {
                root.classList.remove("no-transition");
            }

            // Sync to backend asynchronously
            syncBackend();
        } else {
            // Fallback for browsers that do not support View Transitions
            updateTheme();
            
            // Sync to backend asynchronously to prevent UI blocking
            syncBackend();
        }
    };

    const value = {
        theme,
        setTheme,
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
