import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X, ChevronLeft, ChevronRight, Activity, AlertTriangle, RefreshCw, Home, Calendar, ChefHat, User, Plus, Camera, Clock, Utensils, Settings, History, Users } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../context/LoadingContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { useMealLoggerStore } from '../../context/MealLoggerContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { io } from 'socket.io-client';

export function Layout({ children }) {
    const { user } = useAuth();
    // Start with false on mobile, true on desktop
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedProfile } = useProfile();
    const { setAutoOpenWebcam, setAutoQuickLog } = useMealLoggerStore();
    const [fabMenuOpen, setFabMenuOpen] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        if (!user) return;

        // Secure connection path: localhost construct fallback or production origin
        const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:5000' 
            : window.location.origin;

        console.log(`[WebSocket] Connecting to SmartNutri-AI backend: ${socketUrl}`);
        const socket = io(socketUrl, {
            withCredentials: true
        });

        socket.on('connect', () => {
            console.log('[WebSocket] Connection established successfully! Socket ID:', socket.id);
            // Join user-specific private room
            socket.emit('join', user.id);
        });

        // Listen for targeted clinical review alerts
        socket.on('meal-review-updated', (data) => {
            console.log('[WebSocket] Real-time review alert received:', data);
            
            const actionText = data.status === 'verified' 
                ? 'verified' 
                : (data.status === 'rejected' ? 'flagged for correction' : 'reviewed');
                
            const alertType = data.status === 'rejected' ? 'error' : (data.status === 'verified' ? 'success' : 'info');
            const messageText = `${data.childName}'s ${data.mealCategory} has been ${actionText} by your nutritionist.`;
            
            showNotification(messageText, alertType, 6000);

            // Dispatch global event for instant background dashboard reloads
            const event = new CustomEvent('meal-log-reviewed', { detail: data });
            window.dispatchEvent(event);
        });

        socket.on('disconnect', () => {
            console.log('[WebSocket] Client disconnected from server');
        });

        return () => {
            console.log('[WebSocket] Disconnecting client socket...');
            socket.disconnect();
        };
    }, [user, showNotification]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const { isLoading, loadingMessage, progress, hasTimedOut, stopLoading } = useLoading();

    const handleNavClick = (path) => {
        setFabMenuOpen(false);
        navigate(path);
    };

    const getMobileNavItems = () => {
        if (user?.role === 'admin') {
            return [
                { icon: Home, path: '/', label: 'Home' },
                { icon: Users, path: '/admin/users', label: 'Users' },
                { icon: History, path: '/admin/audit', label: 'Audit' },
                { icon: Settings, path: '/settings', label: 'Settings' },
            ];
        }
        if (user?.role === 'nutritionist') {
            return [
                { icon: Home, path: '/', label: 'Home' },
                { icon: Utensils, path: '/meals', label: 'Meals' },
                { icon: User, path: '/profile', label: 'Profile' },
                { icon: Settings, path: '/settings', label: 'Settings' },
            ];
        }
        return [
            { icon: Home, path: '/', label: 'Home' },
            { icon: Calendar, path: '/calendar', label: 'Calendar' },
            { isFab: true },
            { icon: ChefHat, path: '/ai-kitchen', label: 'AI Kitchen' },
            { icon: User, path: '/profile', label: 'Profile' },
        ];
    };

    const mobileNavItems = getMobileNavItems();



    return (
        <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)] overflow-x-hidden">
            {/* Global Transition Orchestrator */}
            <AnimatePresence mode="wait">
                {isLoading && (
                    /* GPU layer: overlay fade is a one-shot — fine on main thread */
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center mesh-emerald overflow-hidden"
                    >
                        {/* Content entrance: one-shot scale-in — fine on main thread */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="relative z-10 text-center"
                        >
                            {/* ── CLINICAL PULSE RINGS (GPU-accelerated via CSS) ── */}
                            <div className="relative mb-8 flex justify-center">
                                {/* Outer ring: rotates + pulses entirely on GPU */}
                                <div className="absolute h-32 w-32 rounded-full border-4 border-[var(--color-primary)]/20 animate-clinical-outer" />
                                {/* Inner ring: counter-rotates on GPU */}
                                <div className="absolute h-40 w-40 rounded-full border-2 border-[var(--color-primary)]/10 animate-clinical-inner" />
                                <div className="relative h-24 w-24 rounded-3xl glass flex items-center justify-center shadow-2xl border border-white/40">
                                    <Activity size={48} className="text-[var(--color-primary)] animate-pulse" />
                                </div>
                            </div>

                            {/* Loading Content */}
                            <div className="glass px-8 py-6 rounded-[2rem] border border-white/40 shadow-2xl backdrop-blur-xl max-w-sm mx-auto">
                                <h2 className="text-xl font-black text-[var(--color-secondary)] uppercase tracking-tighter mb-2">SMARTNUTRI-AI</h2>

                                {/* State switch: one-shot transition — fine on main thread */}
                                <AnimatePresence mode="wait">
                                    {!hasTimedOut ? (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col items-center gap-3"
                                        >
                                            {/* ── PROGRESS BAR (CSS transition — zero JS overhead) ── */}
                                            <div className="h-1.5 w-48 bg-[var(--color-primary)]/10 rounded-full overflow-hidden relative border border-[var(--color-primary)]/5">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-primary)] to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                    style={{
                                                        width: `${progress}%`,
                                                        transition: 'width 0.4s ease-out',
                                                        willChange: 'width',
                                                    }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">
                                                {loadingMessage}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="timeout"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col items-center gap-4"
                                        >
                                            <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-xl border border-red-100 dark:border-red-500/20">
                                                <AlertTriangle size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Synchronization Failed</span>
                                            </div>
                                            <p className="text-[11px] font-medium text-[var(--color-text-muted)] text-center leading-relaxed">
                                                The clinical server is taking longer than usual to respond. This may be due to a slow network connection.
                                            </p>
                                            <Button
                                                onClick={stopLoading}
                                                className="w-full h-12 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-95"
                                            >
                                                <RefreshCw size={14} className={isLoading ? "animate-spin-slow" : ""} />
                                                Dismiss & Retry
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Mobile FAB Backdrop Dismiss Click */}
            {fabMenuOpen && (
                <div
                    className="fixed inset-0 z-[45] bg-black/25 backdrop-blur-[2px] animate-in fade-in duration-200 lg:hidden"
                    onClick={() => setFabMenuOpen(false)}
                />
            )}

            <div className="flex">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />

                <motion.div 
                    initial={false}
                    animate={{
                        paddingLeft: !isMobile && sidebarOpen ? '16rem' : '0rem'
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="flex-1 min-w-0"
                >
                    <motion.header
                        initial={false}
                        animate={{
                            left: !isMobile && sidebarOpen ? '16rem' : '0rem'
                        }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        className="fixed top-0 right-0 z-40 flex items-center border-b border-[var(--color-divider)] bg-[var(--color-bg-card)]/80 backdrop-blur-md px-3 sm:px-4"
                        style={{ height: isMobile ? 'var(--header-height-mobile)' : 'var(--header-height)' }}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="mr-2 sm:mr-3 h-9 w-9 sm:h-10 sm:w-10 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                        >
                            {sidebarOpen ? (isMobile ? <Menu size={18} /> : <ChevronLeft size={20} />) : <Menu size={20} />}
                        </Button>

                        {!sidebarOpen && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <img src="/SmartNutri-logo.png" alt="Logo" className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-full" />
                                <span className="font-black text-sm sm:text-base text-[var(--color-secondary)] uppercase tracking-tight">
                                    SmartNutri
                                </span>
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                        </div>
                    </motion.header>

                    {/* Header Spacer to prevent content from going under fixed header */}
                    <div style={{ height: isMobile ? 'var(--header-height-mobile)' : 'var(--header-height)' }} />

                    <main className={cn(
                        "p-4 sm:p-6 md:p-8 transition-all duration-300",
                        isMobile ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-8"
                    )}>
                        <div className="mx-auto max-w-7xl">
                            {children}
                        </div>
                    </main>
                </motion.div>
            </div>

            {/* ── ERGONOMIC MOBILE BOTTOM NAVIGATION BAR & FAB (lg:hidden) ── */}
            {isMobile && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-card)]/80 backdrop-blur-lg border-t border-[var(--color-divider)] px-4 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
                    <div className="flex items-center justify-between max-w-md mx-auto relative h-12">
                        {/* Speed Dial Quick Actions overlay floating menu */}
                        <AnimatePresence>
                            {fabMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                    className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[var(--color-bg-card)]/90 backdrop-blur-xl border border-[var(--color-divider)] p-4 rounded-3xl shadow-2xl flex flex-col gap-3 w-56 z-[60]"
                                >
                                    <div className="text-center pb-1.5 border-b border-[var(--color-divider)] select-none">
                                        <span className="text-[10px] font-black uppercase text-[var(--color-primary)] tracking-widest">quick log options</span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setAutoOpenWebcam(true);
                                            setFabMenuOpen(false);
                                            navigate('/');
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-primary)]/10 text-left transition-colors active:scale-95 group"
                                    >
                                        <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                            <Camera size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-tight leading-none mb-1">AI Camera Scan</span>
                                            <span className="text-[8px] font-medium text-[var(--color-text-muted)] leading-none uppercase">Scan plate with camera</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAutoQuickLog(true);
                                            setFabMenuOpen(false);
                                            navigate('/');
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--color-primary)]/10 text-left transition-colors active:scale-95 group"
                                    >
                                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                            <Clock size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-tight leading-none mb-1">Log Last Meal</span>
                                            <span className="text-[8px] font-medium text-[var(--color-text-muted)] leading-none uppercase">Copy yesterday's meal</span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {mobileNavItems.map((item, idx) => {
                            if (item.isFab) {
                                return (
                                    <div key="fab" className="relative -top-4">
                                        <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-full blur-md animate-pulse" />
                                        <motion.button
                                            whileTap={{ scale: 0.92 }}
                                            onClick={() => setFabMenuOpen(!fabMenuOpen)}
                                            className="relative z-10 w-14 h-14 bg-gradient-to-tr from-[var(--color-primary)] to-emerald-400 text-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                                        >
                                            <Plus size={28} className={cn("stroke-[2.5] transition-transform duration-300", fabMenuOpen && "rotate-45")} />
                                        </motion.button>
                                    </div>
                                );
                            }

                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavClick(item.path)}
                                    className="flex flex-col items-center justify-center flex-1 h-full relative"
                                >
                                    <Icon
                                        size={20}
                                        className={isActive ? "text-[var(--color-primary)] transition-colors duration-200" : "text-[var(--color-text-muted)]"}
                                    />
                                    <span className={`text-[9px] font-black uppercase mt-1 tracking-wider ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                                        {item.label}
                                    </span>

                                    {isActive && (
                                        <motion.div
                                            layoutId="bottomTabIndicator"
                                            className="absolute bottom-0 w-8 h-[2px] bg-[var(--color-primary)] rounded-full"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}


        </div>
    );
}
