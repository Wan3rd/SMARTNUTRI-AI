import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, Settings, Utensils, ChefHat, Users, History, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();

    const parentNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: History, label: 'Meal History', path: '/meal-history' },
        { icon: ChefHat, label: 'AI Kitchen', path: '/ai-kitchen' },
        { icon: Utensils, label: 'Meals', path: '/meals' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const nutritionistNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Utensils, label: 'Meal Library', path: '/meals' },
        // Dashboard acts as Client List for now, but we can add specific ones if needed
        { icon: User, label: 'My Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const navItems = user?.role === 'nutritionist' ? nutritionistNavItems : parentNavItems;

    return (
        <>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-[var(--color-divider)] bg-[var(--color-bg-card)] p-6 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:flex md:translate-x-0 md:h-screen",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="mb-10 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold">
                        S
                    </div>
                    <span className="text-xl font-bold text-[var(--color-secondary)]">SmartNutri</span>
                    {user?.role === 'nutritionist' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                            Pro
                        </span>
                    )}
                </div>

                <nav className="flex flex-1 flex-col gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                // Close sidebar on mobile when a link is clicked
                                if (window.innerWidth < 768 && onClose) {
                                    onClose();
                                }
                            }}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        : 'text-[var(--color-text-muted)] hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[var(--color-text-main)]'
                                )
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                    <button
                        onClick={() => {
                            logout();
                            if (window.innerWidth < 768 && onClose) {
                                onClose();
                            }
                        }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full mt-4"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </nav>

                <div className="mt-auto">
                    <div className="rounded-xl bg-[var(--color-primary)]/5 p-4">
                        <p className="text-xs font-medium text-[var(--color-secondary)]">Daily Quote</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">"Apple a day keeps the doctor away."</p>
                    </div>
                </div>
            </aside>
        </>
    );
}
