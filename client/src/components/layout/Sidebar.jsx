import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, Settings, Utensils, ChefHat, Users, History, LogOut, ShieldCheck, ChevronDown, Check, Plus, ChevronLeft, X, BrainCircuit, Database, RefreshCw, Quote, Activity } from 'lucide-react';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../lib/api';

const HEALTH_QUOTES = [
    { content: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates" },
    { content: "It is health that is real wealth and not pieces of gold and silver.", author: "Mahatma Gandhi" },
    { content: "To keep the body in good health is a duty... otherwise we shall not be able to keep our mind strong and clear.", author: "Buddha" },
    { content: "He who has health has hope; and he who has hope has everything.", author: "Arabian Proverb" },
    { content: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { content: "Nurturing yourself is not selfish, it's essential to your survival and your well-being.", author: "Renee Peterson Trudeau" },
    { content: "Health is a state of complete physical, mental and social well-being.", author: "World Health Organization" },
    { content: "Healthy eating is a way of life, not a temporary diet.", author: "Unknown" },
    { content: "Every time you eat or drink, you are either feeding disease or fighting it.", author: "Heather Morgan" },
    { content: "Happiness is the highest form of health.", author: "Dalai Lama" },
    { content: "The food you eat can be either the safest and most powerful form of medicine or the slowest form of poison.", author: "Ann Wigmore" },
    { content: "Good health is not something we can buy. However, it can be an extremely valuable savings account.", author: "Anne Wilson Schaef" },
    { content: "A healthy outside starts from the inside.", author: "Robert Urich" },
    { content: "Eat food. Not too much. Mostly plants.", author: "Michael Pollan" },
    { content: "Wellness is a connection of path, plate, and purpose.", author: "Unknown" },
    { content: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { content: "Your body holds deep wisdom. Trust in it. Learn from it. Nourish it.", author: "Unknown" },
    { content: "An investment in health always pays the best interest.", author: "Unknown" },
    { content: "The groundwork of all happiness is health.", author: "Leigh Hunt" },
    { content: "A fit, healthy body—that is the best fashion statement.", author: "Jess C. Scott" }
];

export function Sidebar({ isOpen, onClose, isMobile }) {
    const { user, logout } = useAuth();
    const { profiles, selectedProfile, selectProfile } = useProfile();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [newReviewsCount, setNewReviewsCount] = React.useState(0);
    const [dailyQuote, setDailyQuote] = React.useState(null);
    const [quoteLoading, setQuoteLoading] = React.useState(false);
    const [quoteError, setQuoteError] = React.useState(false);

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
        const interval = setInterval(fetchReviewCount, 30000);
        window.addEventListener('seen-reviews-updated', fetchReviewCount);
        return () => {
            clearInterval(interval);
            window.removeEventListener('seen-reviews-updated', fetchReviewCount);
        };
    }, [selectedProfile?.id, user?.role]);

    const fetchQuote = React.useCallback(async (force = false) => {
        const today = new Date().toISOString().split('T')[0];
        const cached = JSON.parse(localStorage.getItem('smartnutri_daily_quote') || 'null');
        
        // If not force-refresh and we have a valid cached quote for today, use it
        if (!force && cached && cached.date === today) {
            setDailyQuote(cached);
            return;
        }

        setQuoteLoading(true);
        setQuoteError(false);

        // Add a premium micro-interaction feel: simulate a 350ms loading skeleton transition on manual refresh
        if (force) {
            await new Promise(resolve => setTimeout(resolve, 350));
        }

        try {
            // Find a quote that is different from the currently displayed one to guarantee it changes
            const currentContent = cached?.content;
            let availableQuotes = HEALTH_QUOTES;
            if (currentContent) {
                availableQuotes = HEALTH_QUOTES.filter(q => q.content !== currentContent);
            }
            if (availableQuotes.length === 0) {
                availableQuotes = HEALTH_QUOTES;
            }

            const randomQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
            const quote = { content: randomQuote.content, author: randomQuote.author, date: today };
            
            localStorage.setItem('smartnutri_daily_quote', JSON.stringify(quote));
            setDailyQuote(quote);
        } catch {
            setQuoteError(true);
        } finally {
            setQuoteLoading(false);
        }
    }, []);

    React.useEffect(() => { fetchQuote(); }, [fetchQuote]);

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (window.innerWidth < 768 && onClose) {
            onClose();
        }
    };

    const parentNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: History, label: 'Meal History', path: '/meal-history' },
        { icon: Utensils, label: 'Daily Plan', path: '/daily-plan' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
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
        { icon: Activity, label: 'System Telemetry', path: '/admin/telemetry' },
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
                                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium relative group transition-colors duration-200',
                                        isActive
                                            ? 'text-[var(--color-primary)]'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeSidebarLink"
                                                className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-xl"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            >
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-primary)] rounded-r-full" />
                                            </motion.div>
                                        )}
                                        <item.icon size={18} className="relative z-10 transition-transform group-hover:scale-110" />
                                        <span className="relative z-10 flex-1 font-bold">{item.label}</span>
                                        {item.label === 'Meal History' && newReviewsCount > 0 && (
                                            <span className="relative z-10 flex items-center justify-center min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-emerald-500/20 animate-pulse">
                                                {newReviewsCount}
                                            </span>
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

                    <div className="mt-auto pt-4">
                        <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 p-4 relative overflow-hidden">
                            {/* Decorative background quote mark */}
                            <div className="absolute -top-2 -right-1 opacity-[0.06] pointer-events-none">
                                <Quote size={64} className="text-[var(--color-primary)]" />
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5">
                                    <Quote size={12} className="text-[var(--color-primary)]" />
                                    <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">Daily Quote</span>
                                </div>
                                <button
                                    onClick={() => fetchQuote(true)}
                                    disabled={quoteLoading}
                                    className="h-6 w-6 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all disabled:opacity-40"
                                    title="Refresh quote"
                                >
                                    <RefreshCw size={11} className={cn(quoteLoading && 'animate-spin')} />
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {quoteLoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-2"
                                    >
                                        <div className="h-3 bg-[var(--color-primary)]/15 rounded-full animate-pulse w-full" />
                                        <div className="h-3 bg-[var(--color-primary)]/10 rounded-full animate-pulse w-4/5" />
                                        <div className="h-3 bg-[var(--color-primary)]/10 rounded-full animate-pulse w-3/5" />
                                        <div className="h-2 bg-[var(--color-primary)]/10 rounded-full animate-pulse w-2/5 mt-3" />
                                    </motion.div>
                                ) : quoteError ? (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <p className="text-[11px] text-[var(--color-text-muted)] italic leading-relaxed">
                                            "Let food be thy medicine and medicine be thy food."
                                        </p>
                                        <p className="text-[10px] font-black text-[var(--color-primary)]/60 mt-2 uppercase tracking-widest">— Hippocrates</p>
                                    </motion.div>
                                ) : dailyQuote ? (
                                    <motion.div
                                        key={dailyQuote.content}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed italic">
                                            &ldquo;{dailyQuote.content}&rdquo;
                                        </p>
                                        <p className="text-[10px] font-black text-[var(--color-primary)]/70 mt-2 uppercase tracking-widest">
                                            — {dailyQuote.author}
                                        </p>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
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
