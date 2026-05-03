import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '../common/Button';

export function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)]">
            {/* Mobile Header */}
            <div className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center border-b border-[var(--color-divider)] bg-[var(--color-bg-card)] px-4 md:hidden transition-colors duration-300">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <Menu size={20} />
                </Button>
                <span className="ml-2 font-bold text-[var(--color-secondary)]">SmartNutri</span>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 overflow-auto p-4 pt-20 md:p-8 md:pt-8 bg-[var(--color-bg-page)] transition-colors duration-300">
                <div className="mx-auto max-w-7xl"> {/* Increased width for better use of space */}
                    {children}
                </div>
            </main>
        </div>
    );
}
