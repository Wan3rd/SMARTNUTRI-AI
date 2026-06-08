import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Users, ClipboardList, Settings, UserPlus, Search, BadgeCheck, User, Stethoscope, Star, Activity, Clock, ShieldAlert, Lock, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { cn } from '../lib/utils';
import api from '../lib/api';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { motion } from 'framer-motion';

import AddClientModal from '../components/AddClientModal';
import CreatePatientModal from '../components/CreatePatientModal';
import ReviewLogModal from '../components/ReviewLogModal';
import { useNotification } from '../context/NotificationContext';
import { DashboardSkeleton, SkeletonLoader } from '../components/SkeletonShell';
import AnimatedNumber from '../components/common/AnimatedNumber';
import ConfirmDialog from '../components/common/ConfirmDialog';


export default function NutritionistDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [clients, setClients] = useState([]);
    const [pendingLogs, setPendingLogs] = useState([]);
    const { isLoading, startLoading, stopLoading } = useLoading();
    const [stats, setStats] = useState({ clients: 0, pending: 0 });
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfilingOpen, setIsProfilingOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewStatus, setViewStatus] = useState('active');
    const { showNotification } = useNotification();

    // --- Long Press / Unlink Caregiver State & Refs ---
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: true });
    const touchStartTimer = React.useRef(null);
    const hasTriggeredLongPress = React.useRef(false);

    const triggerQuickUnlink = (client) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Quick Unlink Connection',
            message: `Are you sure you want to unlink caregiver "${client.full_name}" from your clinical station? This will immediately revoke access to their patient and child profiles.`,
            isDestructive: true,
            onConfirm: () => {
                startLoading('Unlinking caregiver...');
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                api.delete(`/nutritionist/clients/${client.id}`)
                    .then(() => {
                        showNotif(`Successfully unlinked caregiver "${client.full_name}".`);
                        fetchData();
                    })
                    .catch((err) => {
                        console.error("Failed to unlink client:", err);
                        showNotif(err.response?.data?.message || "An error occurred while unlinking caregiver.", "error");
                    })
                    .finally(() => {
                        stopLoading();
                    });
            }
        });
    };

    const startPressTimer = (client) => {
        hasTriggeredLongPress.current = false;
        touchStartTimer.current = setTimeout(() => {
            hasTriggeredLongPress.current = true;
            if (navigator.vibrate) {
                try {
                    navigator.vibrate(50);
                } catch (e) {}
            }
            triggerQuickUnlink(client);
        }, 750); // 750ms hold
    };

    const cancelPressTimer = () => {
        if (touchStartTimer.current) {
            clearTimeout(touchStartTimer.current);
            touchStartTimer.current = null;
        }
    };

    const handleCardClick = (client, e) => {
        if (hasTriggeredLongPress.current) {
            e.preventDefault();
            e.stopPropagation();
            hasTriggeredLongPress.current = false;
            return;
        }
        navigate(`/nutritionist/client/${client.id}`, { state: { clientName: client.full_name } });
    };

    const showNotif = (message, type = 'success') => {
        showNotification(message, type);
    };

    useEffect(() => {
        const loadNutritionistData = async () => {
            if (user?.role === 'nutritionist' && user?.status === 'approved') {
                await fetchData();
                setIsInitialSync(false);
            } else {
                setIsInitialSync(false);
            }
        };
        loadNutritionistData();
    }, [user?.id, user?.status]);

    const fetchData = async () => {
        try {
            const [clientsRes, pendingRes] = await Promise.all([
                api.get('/nutritionist/clients'),
                api.get('/nutritionist/logs/pending')
            ]);
            setClients(clientsRes.data);
            setPendingLogs(pendingRes.data);
            setStats({
                clients: clientsRes.data.filter(c => c.status === 'active').length,
                pending: pendingRes.data.length
            });
        } catch (err) {
            console.error("Failed to fetch nutritionist data", err);
        }
    };



    if (isInitialSync) return <DashboardSkeleton />;

    if (user?.role === 'nutritionist' && user?.status !== 'approved') {
        return (
            <div className="min-h-[60vh] w-full flex items-center justify-center p-4 relative overflow-hidden font-outfit py-4 rounded-3xl animate-in fade-in duration-500">
                {/* Mesh Background */}
                <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 rounded-3xl">
                    <div className="absolute inset-0 mesh-emerald opacity-60" />
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-md glass rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl p-6 text-center relative z-10 space-y-4"
                >
                    {/* ── MINIMAL STATUS INDICATOR ── */}
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative h-14 w-14 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl transition-all"
                        >
                            <ShieldAlert size={24} className="animate-bounce" />
                        </motion.div>
                    </div>

                    {/* ── WELL-INFORMED MESSAGING ── */}
                    <div className="space-y-1.5">
                        <h1 className="text-xl sm:text-2xl font-black text-[var(--color-text-main)] tracking-tight leading-tight uppercase">
                            Verification <span className="text-emerald-500">Pending</span>
                        </h1>
                        <p className="text-[var(--color-text-muted)] text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                            Hello, <span className="text-[var(--color-text-main)] font-black">{user?.full_name?.replace(/^dr\.?\s+/i, '').split(' ')[0]}</span>. Your professional registration is currently being audited to ensure clinical compliance.
                        </p>
                    </div>

                    {/* ── INFORMATION LIST ── */}
                    <div className="border border-[var(--color-divider)] bg-white/30 dark:bg-black/5 backdrop-blur-md rounded-2xl p-4 text-left divide-y divide-[var(--color-divider)]">
                        <div className="flex gap-3 pb-3 items-start">
                            <div className="flex-shrink-0 h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                <Clock size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.1em]">Audit Timeline</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-bold leading-normal">Typically verified within <span className="text-[var(--color-text-main)] font-black">12-24 business hours</span>.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-3 items-start">
                            <div className="flex-shrink-0 h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                                <Lock size={16} />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.1em]">Data Status</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-bold leading-normal">Patient profiles are <span className="text-[var(--color-text-main)] font-black">encrypted & secure</span> during this audit.</p>
                            </div>
                        </div>
                    </div>

                    {/* ── ACTIONS ── */}
                    <div className="pt-2 flex flex-col items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full"
                        >
                            <Button
                                onClick={logout}
                                className="w-full px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 border border-red-500/30 hover:border-red-500/50 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg transition-all"
                            >
                                <LogOut size={12} />
                                Sign Out
                            </Button>
                        </motion.div>
                        
                        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider flex items-center gap-2">
                            Require assistance? <a href="mailto:clinical@smartnutri.ai" className="text-emerald-500 border-b border-emerald-500/20 hover:border-emerald-500 transition-all pb-0.5">Contact Support</a>
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-8 animate-in fade-in duration-500 pb-20">
            <AnnouncementBanner />
            {/* ── NUTRITIONIST HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl bg-[var(--color-bg-card)]">
                {/* Premium Theme-Responsive Mesh Gradient Backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-bg-card)] to-[var(--color-info)]/5" />
                {/* Soft ambient decorative glowing blobs for high-end aesthetic depth */}
                <div className="absolute top-[-50%] right-[-10%] w-[350px] h-[350px] rounded-full bg-[var(--color-primary)]/8 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-30%] left-[20%] w-[250px] h-[250px] rounded-full bg-[var(--color-info)]/8 blur-[60px] pointer-events-none" />

                <div className="relative p-3 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 group">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden bg-[var(--color-bg-page)] rounded-3xl border-2 border-[var(--color-divider)] flex items-center justify-center text-[var(--color-primary)] text-2xl sm:text-3xl font-black shadow-md transition-all group-hover:border-[var(--color-primary)]/50">
                            {user?.profile_image_url ? (
                                <img src={user.profile_image_url} alt="Nutri" className="h-full w-full object-cover" />
                            ) : (
                                <User size={28} className="text-[var(--color-text-muted)]" />
                            )}
                        </div>
                        {user?.status === 'approved' && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 bg-emerald-500 rounded-xl border-2 border-[var(--color-bg-card)] flex items-center justify-center z-20 shadow-lg">
                                <BadgeCheck size={12} className="text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row justify-center sm:justify-start items-center gap-2 mb-2 sm:mb-1.5">
                            <h1 className={cn("text-xl sm:text-2xl md:text-3xl font-black text-[var(--color-text-main)] tracking-tight leading-tight", user?.privacy_mode && "privacy-blur")}>
                                Welcome, {user?.full_name?.replace(/^dr\.?\s+/i, '').split(' ')[0]}!
                            </h1>
                            <span className="px-2.5 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full border border-[var(--color-primary)]/20 backdrop-blur-sm">
                                Clinical Nutritionist
                            </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] font-medium text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2">
                            <Stethoscope size={14} className="shrink-0 text-[var(--color-primary)]" />
                            <span className="truncate max-w-[200px] sm:max-w-none">{user?.specialization || 'Pediatric Specialist'} &bull; {user?.clinic || 'SmartNutri Clinical'}</span>
                        </p>
                    </div>

                    <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button
                            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white border-none shadow-lg shadow-emerald-500/10 font-black uppercase tracking-widest text-[8px] xs:text-[9px] sm:text-[10px] h-10 sm:h-12 px-1.5 xs:px-3 sm:px-6 rounded-2xl sm:rounded-3xl flex-1 sm:flex-none flex flex-row items-center justify-center gap-1 xs:gap-2 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <UserPlus size={14} className="xs:w-4 xs:h-4" />
                            <span className="whitespace-nowrap">Link Parent</span>
                        </Button>
                        <Button
                            className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 shadow-sm hover:shadow-md font-black uppercase tracking-widest text-[8px] xs:text-[9px] sm:text-[10px] h-10 sm:h-12 px-1.5 xs:px-3 sm:px-6 rounded-2xl sm:rounded-3xl flex-1 sm:flex-none flex flex-row items-center justify-center gap-1 xs:gap-2 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => setIsProfilingOpen(true)}
                        >
                            <Stethoscope size={14} className="xs:w-4 xs:h-4" />
                            <span className="whitespace-nowrap">Create Patient</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-6">
                <Card className="bg-white dark:bg-white/5 border border-[var(--color-divider)] shadow-sm rounded-xl sm:rounded-3xl overflow-hidden hover:shadow-md transition-all group">
                    <CardContent className="p-2 sm:p-6 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-4">
                        <div className="h-6 w-6 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg sm:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110 shrink-0">
                            <Users size={12} className="sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex items-center gap-1 sm:block">
                            <p className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter sm:tracking-widest truncate">Clients:</p>
                            <h2 className="text-[10px] sm:text-3xl font-black text-[var(--color-text-main)] leading-none sm:mt-0.5"><AnimatedNumber value={stats.clients} /></h2>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-white/5 border border-[var(--color-divider)] shadow-sm rounded-xl sm:rounded-3xl overflow-hidden hover:shadow-md transition-all group">
                    <CardContent className="p-2 sm:p-6 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-4">
                        <div className="h-6 w-6 sm:h-12 sm:w-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg sm:rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 transition-transform group-hover:scale-110 shrink-0">
                            <ClipboardList size={12} className="sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex items-center gap-1 sm:block">
                            <p className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter sm:tracking-widest truncate">Pending:</p>
                            <h2 className="text-[10px] sm:text-3xl font-black text-[var(--color-text-main)] leading-none sm:mt-0.5"><AnimatedNumber value={stats.pending} /></h2>
                        </div>
                    </CardContent>
                </Card>
            </div>



            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <h2 className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tight">My Clients</h2>
                        <div className="flex bg-[var(--color-bg-card)] p-1 rounded-xl border border-[var(--color-divider)]">
                            <button 
                                onClick={() => setViewStatus('active')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    viewStatus === 'active' ? "bg-[var(--color-primary)] text-white shadow-md" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                                )}
                            >
                                Active
                            </button>
                            <button 
                                onClick={() => setViewStatus('archived')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    viewStatus === 'archived' ? "bg-zinc-600 text-white shadow-md" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                                )}
                            >
                                Archived
                            </button>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={14} />
                        <input
                            placeholder="Search clinical profiles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 h-12 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs font-bold focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {isLoading ? (
                        // Skeleton State
                        [1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden bg-white/50 dark:bg-white/5">
                                <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                                    <SkeletonLoader className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <SkeletonLoader className="h-4 w-3/4 rounded-lg" />
                                        <SkeletonLoader className="h-3 w-1/2 rounded-lg opacity-50" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <SkeletonLoader className="h-4 w-12 rounded-full" />
                                        <SkeletonLoader className="h-2 w-16 rounded-full opacity-30" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        clients
                            .filter(client => client.status === viewStatus)
                            .filter(client => 
                                client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                client.email?.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((client, index) => {
                            const clientPendingCount = pendingLogs.filter(log => (log.profile?.user_id || log.profiles?.user_id) === client.id).length;
                            const isArchived = client.status === 'archived';
                            return (
                                <motion.div
                                    key={client.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Card
                                        onTouchStart={() => startPressTimer(client)}
                                        onTouchEnd={cancelPressTimer}
                                        onTouchMove={cancelPressTimer}
                                        onMouseDown={() => startPressTimer(client)}
                                        onMouseUp={cancelPressTimer}
                                        onMouseLeave={cancelPressTimer}
                                        onClick={(e) => handleCardClick(client, e)}
                                        className={cn(
                                            "h-full hover:shadow-lg transition-all cursor-pointer border-2 relative group rounded-[2rem] overflow-hidden select-none",
                                            isArchived ? "border-dashed border-[var(--color-divider)] opacity-80 grayscale-[0.5]" : "border-[var(--color-divider)]"
                                        )}
                                    >
                                        <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                                            <div className={cn(
                                                "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center relative shrink-0",
                                                isArchived ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                            )}>
                                                {client.profile_image_url ? (
                                                    <img src={client.profile_image_url} alt={client.full_name} className="h-full w-full object-cover rounded-2xl" />
                                                ) : (
                                                    <Users size={20} className="sm:w-6 sm:h-6" />
                                                )}
                                                {!isArchived && clientPendingCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 z-10">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white dark:border-zinc-900 text-[8px] font-black text-white items-center justify-center">
                                                            {clientPendingCount}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={cn("font-black text-sm sm:text-base truncate", isArchived ? "text-[var(--color-text-muted)]" : "text-[var(--color-secondary)]", user?.privacy_mode && "privacy-blur")}>
                                                    {client.full_name}
                                                </h3>
                                                <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-medium truncate">
                                                    {isArchived ? `Deactivated: ${client.deactivation_reason || 'No reason'}` : client.email}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <div className={cn(
                                                    "px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider",
                                                    isArchived ? "bg-zinc-200 text-zinc-600" : "bg-green-100 text-green-700"
                                                )}>
                                                    {client.status}
                                                </div>
                                                {!isArchived && clientPendingCount > 0 && (
                                                    <span className="text-[7px] sm:text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest animate-pulse">Needs Review</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })
                    )}
                    {!isLoading && clients
                        .filter(c => c.status === viewStatus)
                        .filter(c =>
                            c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="col-span-full flex flex-col items-center justify-center py-16 px-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-dashed border-[var(--color-divider)] text-center gap-5"
                        >
                            {/* Animated SVG Illustration */}
                            <motion.div
                                animate={{ rotate: [0, -8, 8, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                                className="relative"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-[var(--color-primary)]/10 flex items-center justify-center shadow-xl shadow-[var(--color-primary)]/10">
                                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="17" cy="17" r="11" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="25.5" y1="25.5" x2="35" y2="35" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round"/>
                                        <line x1="13" y1="17" x2="21" y2="17" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                                        <line x1="17" y1="13" x2="17" y2="21" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-orange-400 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center"
                                >
                                    <span className="text-white text-[8px] font-black">0</span>
                                </motion.div>
                            </motion.div>

                            <div className="space-y-1.5">
                                <h3 className="text-base font-black text-[var(--color-text-main)] uppercase tracking-tight">
                                    {viewStatus === 'active' ? 'No Patients Found' : 'No Archived Patients'}
                                </h3>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium max-w-xs mx-auto leading-relaxed">
                                    {searchQuery
                                        ? `No results for "${searchQuery}". Try a different name or email.`
                                        : viewStatus === 'active'
                                            ? 'Link a parent account or create a new patient profile to get started.'
                                            : 'Archived clients will appear here once deactivated.'}
                                </p>
                            </div>

                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[var(--color-primary)]/30"
                                >
                                    Clear Search
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </section>

            <AddClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onClientAdded={() => {
                    fetchData();
                    showNotif("Client link request sent!");
                }}
            />

            <CreatePatientModal
                isOpen={isProfilingOpen}
                onClose={() => setIsProfilingOpen(false)}
                onClientAdded={() => {
                    fetchData();
                    showNotif("Patient profile created successfully!");
                }}
            />

            <ReviewLogModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                log={selectedLog}
                onReviewComplete={() => {
                    fetchData();
                    showNotif("Review finalized and saved!");
                }}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                isDestructive={confirmDialog.isDestructive}
            />
        </div>
    );
}
