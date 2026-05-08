import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, Settings, Utensils, ChefHat, Users, History, LogOut, ShieldCheck, ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../lib/api';

export function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const { profiles, selectedProfile, selectProfile } = useProfile();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [newReviewsCount, setNewReviewsCount] = React.useState(0);

    React.useEffect(() => {
        const fetchReviewCount = async () => {
            if (user?.role === 'parent' && selectedProfile) {
                try {
                    const res = await api.get(`/logs/profile/${selectedProfile.id}`);
                    const count = res.data.filter(log => log.status === 'reviewed' || log.status === 'verified').length;
                    setNewReviewsCount(count);
                } catch (err) {
                    console.error("Failed to fetch reviews for sidebar", err);
                }
            }
        };
        fetchReviewCount();
        const interval = setInterval(fetchReviewCount, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [selectedProfile?.id, user?.role]);

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (window.innerWidth < 768 && onClose) {
            onClose();
        }
    };

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
        { icon: User, label: 'My Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const adminNavItems = [
        { icon: ShieldCheck, label: 'Oversight', path: '/' },
        { icon: Users, label: 'All Users', path: '/admin/users' },
        { icon: History, label: 'Audit Logs', path: '/admin/audit' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const navItems = user?.role === 'admin' ? adminNavItems : user?.role === 'nutritionist' ? nutritionistNavItems : parentNavItems;

    return (
        <>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-[var(--color-divider)] bg-[var(--color-bg-card)] p-6 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:flex md:translate-x-0 md:h-screen",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="mb-10 flex items-center gap-2">
                    <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-12 w-12 object-contain rounded-full shadow-sm" />
                    <span className="text-xl font-black text-[var(--color-secondary)] uppercase tracking-tighter">SmartNutri</span>
                </div>

                {user?.role === 'parent' && profiles.length > 0 && (
                    <div className="mb-8 relative">
                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-2 block">Switch Profile</label>
                        <button 
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-primary)]/5 border-2 border-[var(--color-primary)]/10 hover:border-[var(--color-primary)] transition-all group"
                        >
                            <div className="h-10 w-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-black overflow-hidden shadow-lg shadow-[var(--color-primary)]/10">
                                {selectedProfile?.profile_image_url ? (
                                    <img src={selectedProfile.profile_image_url} className="h-full w-full object-cover" alt="Child" />
                                ) : (
                                    <span>{selectedProfile?.child_name?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight text-[var(--color-text-main)] truncate">{selectedProfile?.child_name || 'Select Child'}</p>
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">Active Patient</p>
                            </div>
                            <ChevronDown size={16} className={cn("text-[var(--color-text-muted)] transition-transform", isProfileMenuOpen && "rotate-180")} />
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-[60] animate-in slide-in-from-top-2 duration-200">
                                {profiles.map(profile => (
                                    <button
                                        key={profile.id}
                                        onClick={() => {
                                            selectProfile(profile.id);
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-[var(--color-primary)]/10 group",
                                            selectedProfile?.id === profile.id ? "bg-[var(--color-primary)]/5" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs overflow-hidden",
                                            selectedProfile?.id === profile.id ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {profile.profile_image_url ? (
                                                <img src={profile.profile_image_url} className="h-full w-full object-cover" alt="" />
                                            ) : (
                                                <span>{profile.child_name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-[11px] font-black uppercase tracking-tight truncate",
                                            selectedProfile?.id === profile.id ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"
                                        )}>{profile.child_name}</span>
                                        {selectedProfile?.id === profile.id && <Check size={14} className="ml-auto text-[var(--color-primary)]" />}
                                    </button>
                                ))}
                                <NavLink
                                    to="/profile"
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="w-full flex items-center gap-3 p-2 mt-2 rounded-xl bg-gray-50 dark:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all"
                                >
                                    <Plus size={14} className="ml-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Manage Profiles</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}

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
                                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors relative',
                                    isActive
                                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        : 'text-[var(--color-text-muted)] hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[var(--color-text-main)]'
                                )
                            }
                        >
                            <item.icon size={20} />
                            <span className="flex-1">{item.label}</span>
                            {item.label === 'Meal History' && newReviewsCount > 0 && (
                                <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-emerald-500/20">
                                    {newReviewsCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
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

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Sign Out"
                message="Are you sure you want to end your current session?"
                confirmText="Sign Out"
                isDestructive={false}
            />
        </>
    );
}
