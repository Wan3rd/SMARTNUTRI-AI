import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, Settings, Utensils, ChefHat, Users, History, LogOut, ShieldCheck, ChevronDown, Check, Plus, ChevronLeft, X, BrainCircuit, Database } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../lib/api';

export function Sidebar({ isOpen, onClose, isMobile }) {
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
                    const seenReviews = JSON.parse(localStorage.getItem('seen_meal_reviews') || '[]');
                    const count = res.data.filter(log => 
                        (log.status === 'reviewed' || log.status === 'verified') && 
                        !seenReviews.includes(log.id)
                    ).length;
                    setNewReviewsCount(count);
                } catch (err) {
                    console.error("Failed to fetch reviews for sidebar", err);
                }
            }
        };
        fetchReviewCount();
        const interval = setInterval(fetchReviewCount, 30000); // Check every 30s
        
        window.addEventListener('seen-reviews-updated', fetchReviewCount);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('seen-reviews-updated', fetchReviewCount);
        };
    }, [selectedProfile?.id, user?.role]);

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (window.innerWidth < 768 && onClose) {
            onClose();
        }
    };

    const parentNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: Utensils, label: 'Daily Plan', path: '/daily-plan' },
        { icon: History, label: 'Meal History', path: '/meal-history' },
        { icon: ChefHat, label: 'AI Kitchen', path: '/ai-kitchen' },
        { icon: Utensils, label: 'Meals', path: '/meals' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const nutritionistNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Utensils, label: 'Meal Library', path: '/meals' },
        { icon: User, label: 'My Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const adminNavItems = [
        { icon: ShieldCheck, label: 'Oversight', path: '/dashboard' },
        { icon: Users, label: 'All Users', path: '/admin/users' },
        { icon: Database, label: 'Data Oversight', path: '/admin/data' },
        { icon: History, label: 'Audit Logs', path: '/admin/audit' },
        { icon: BrainCircuit, label: 'AI Monitor', path: '/admin/ai-health' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const navItems = user?.role === 'admin' ? adminNavItems : user?.role === 'nutritionist' ? nutritionistNavItems : parentNavItems;

    return (
        <>
            <motion.aside
                initial={false}
                animate={{ 
                    x: isOpen ? 0 : "-100%",
                    width: isMobile ? '18rem' : '16rem'
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className={cn(
                    "flex flex-col border-r border-[var(--color-divider)] bg-[var(--color-bg-card)] z-50 overflow-hidden fixed inset-y-0 left-0",
                    isMobile ? "shadow-2xl rounded-r-3xl" : "h-screen"
                )}
            >
                <div className="flex flex-col h-full w-full flex-shrink-0 overflow-y-auto custom-scrollbar p-5 sm:p-6">
                    <div className="mb-6 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-9 w-9 object-contain rounded-full shadow-sm" />
                            <span className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tighter">SmartNutri</span>
                        </div>
                        {isMobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-9 w-9 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            >
                                <X size={20} />
                            </Button>
                        )}
                    </div>

                    {/* Premium, Simple User Profile Identity Card */}
                    {user && (
                        <div className="mb-6 p-3 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl overflow-hidden bg-[var(--color-primary)] text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                                {user.profile_image_url ? (
                                    <img src={user.profile_image_url} alt={user.full_name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="uppercase text-sm">{user.full_name?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black uppercase text-[var(--color-text-main)] truncate tracking-tight">
                                    {user.role === 'nutritionist' ? `Dr. ${user.full_name?.replace(/^dr\.?\s+/i, '')}` : user.full_name}
                                </h4>
                                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide truncate mt-0.5">
                                    {user.role === 'nutritionist' ? (user.specialization || 'Clinical Expert') : user.role === 'admin' ? 'System Oversight' : 'Caregiver'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Switch Profile Capsule for Caregivers */}
                    {user?.role === 'parent' && profiles.length > 0 && (
                        <div className="mb-6 relative">
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
                                    <p className="text-[11px] font-black uppercase tracking-tight text-[var(--color-text-main)] truncate">{selectedProfile?.child_name || 'Select Child'}</p>
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

                    <nav className="flex flex-1 flex-col gap-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => {
                                    if (isMobile && onClose) {
                                        onClose();
                                    }
                                }}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 relative group',
                                        isActive
                                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon size={18} className="transition-transform group-hover:scale-110" />
                                        <span className="flex-1 font-bold">{item.label}</span>
                                        {item.label === 'Meal History' && newReviewsCount > 0 && (
                                            <span className="flex items-center justify-center min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-emerald-500/20 animate-pulse">
                                                {newReviewsCount}
                                            </span>
                                        )}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-primary)] rounded-r-full" />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full mt-4 group"
                        >
                            <LogOut size={18} className="transition-transform group-hover:translate-x-1" />
                            Sign Out
                        </button>
                    </nav>

                    <div className="mt-auto">
                        <div className="rounded-xl bg-[var(--color-primary)]/5 p-4">
                            <p className="text-xs font-medium text-[var(--color-secondary)]">Daily Quote</p>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">"Apple a day keeps the doctor away."</p>
                        </div>
                    </div>
                </div>
            </motion.aside>

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
