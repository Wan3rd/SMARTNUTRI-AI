import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';

export function Layout({ children }) {
    // Start with false on mobile, true on desktop
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile && !sidebarOpen) {
                // Optional: auto-open when going to desktop if it was closed?
                // Or just leave it as is.
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [sidebarOpen]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)]">
            {/* Mobile Sidebar Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

                <div className={cn(
                    "flex-1 min-w-0 transition-all duration-400 ease-in-out",
                    !isMobile && sidebarOpen ? "lg:pl-64" : "pl-0"
                )}>
                    {/* Unified Header */}
                    <header className={cn(
                        "sticky top-0 z-30 flex h-16 items-center border-b border-[var(--color-divider)] bg-[var(--color-bg-card)]/80 backdrop-blur-md px-4 transition-all duration-300",
                        !isMobile && sidebarOpen ? "md:ml-0" : "ml-0"
                    )}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleSidebar}
                            className="mr-3 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                        >
                            {sidebarOpen ? (isMobile ? <Menu size={20} /> : <ChevronLeft size={20} />) : <Menu size={20} />}
                        </Button>
                        
                        {!sidebarOpen && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <img src="/SmartNutri-logo.png" alt="Logo" className="h-8 w-8 object-contain rounded-full" />
                                <span className="font-black text-[var(--color-secondary)] uppercase tracking-tight">
                                    SmartNutri
                                </span>
                            </div>
                        )}
                        
                        <div className="ml-auto flex items-center gap-2">
                            {/* Add other header actions here if needed */}
                        </div>
                    </header>

                    <main className={cn(
                        "p-4 md:p-8 transition-all duration-300",
                        // If sidebar is sticky on desktop, we don't need margin because it's in the flex flow.
                        // But if it's fixed, we do.
                    )}>
                        <div className="mx-auto max-w-7xl">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
