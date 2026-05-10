import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Users, ClipboardList, Settings, UserPlus, Search, BadgeCheck, User, Stethoscope, Star, Activity, Clock, ShieldAlert, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import api from '../lib/api';
import AnnouncementBanner from '../components/AnnouncementBanner';

import AddClientModal from '../components/AddClientModal';
import CreatePatientModal from '../components/CreatePatientModal';
import ReviewLogModal from '../components/ReviewLogModal';
import Notification from '../components/common/Notification';

export default function NutritionistDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [pendingLogs, setPendingLogs] = useState([]);
    const [stats, setStats] = useState({ clients: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfilingOpen, setIsProfilingOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [clientsRes, pendingRes] = await Promise.all([
                api.get('/nutritionist/clients'),
                api.get('/nutritionist/logs/pending')
            ]);
            setClients(clientsRes.data);
            setPendingLogs(pendingRes.data);
            setStats({
                clients: clientsRes.data.length,
                pending: pendingRes.data.length
            });
        } catch (err) {
            console.error("Failed to fetch nutritionist data", err);
        } finally {
            setLoading(false);
        }
    };

    if (user?.role === 'nutritionist' && user?.status !== 'approved') {
        return (
            <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[var(--color-bg-page)] font-outfit">
                <div className="w-full max-w-xl space-y-12 text-center animate-in fade-in zoom-in duration-700">
                    {/* ── MINIMAL STATUS INDICATOR ── */}
                    <div className="relative inline-flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                        <div className="relative h-20 w-20 rounded-[1.5rem] bg-white dark:bg-zinc-900 border-2 border-[var(--color-divider)] flex items-center justify-center text-emerald-500 shadow-xl">
                            <ShieldAlert size={32} />
                        </div>
                    </div>

                    {/* ── WELL-INFORMED MESSAGING ── */}
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-tight">Clinical Verification <span className="text-emerald-500">Pending</span></h1>
                        <p className="text-[var(--color-text-muted)] text-lg font-medium leading-relaxed max-w-lg mx-auto">
                            Hello, <span className="text-[var(--color-text-main)] font-bold">Dr. {user?.full_name?.replace(/^dr\.?\s+/i, '').split(' ')[0]}</span>. Your professional registration is currently being audited to ensure clinical compliance and data security.
                        </p>
                    </div>

                    {/* ── INFORMATION GRID ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="p-6 bg-[var(--color-bg-card)] rounded-[2rem] border-2 border-[var(--color-divider)] shadow-sm hover:shadow-md transition-all group">
                            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4 transition-transform group-hover:scale-110">
                                <Clock size={20} />
                            </div>
                            <h3 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] mb-1 font-outfit">Audit Timeline</h3>
                            <p className="text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">Standard verification typically takes <span className="text-[var(--color-text-main)] font-bold">12-24 business hours</span>.</p>
                        </div>
                        <div className="p-6 bg-[var(--color-bg-card)] rounded-[2rem] border-2 border-[var(--color-divider)] shadow-sm hover:shadow-md transition-all group">
                            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-4 transition-transform group-hover:scale-110">
                                <Lock size={20} />
                            </div>
                            <h3 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] mb-1 font-outfit">Data Status</h3>
                            <p className="text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">All patient clinical profiles remain <span className="text-[var(--color-text-main)] font-bold">encrypted & secure</span> during this audit.</p>
                        </div>
                    </div>

                    {/* ── ACTIONS ── */}
                    <div className="pt-4 flex flex-col items-center gap-6">
                        <p className="text-xs text-[var(--color-text-muted)] font-bold flex items-center gap-2">
                            Require assistance? <a href="mailto:clinical@smartnutri.ai" className="text-emerald-500 border-b border-emerald-500/20">Contact Support</a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-8 animate-in fade-in duration-500 pb-20">
            <AnnouncementBanner />
            {/* ── NUTRITIONIST HERO BANNER ── */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl bg-[var(--color-bg-card)]">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

                <div className="relative p-3 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 group">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden bg-white/20 backdrop-blur-sm rounded-3xl border-2 border-white/40 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-2xl">
                            {user?.profile_image_url ? (
                                <img src={user.profile_image_url} alt="Nutri" className="h-full w-full object-cover" />
                            ) : (
                                <User size={28} className="text-white/40" />
                            )}
                        </div>
                        {user?.status === 'approved' && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 bg-emerald-400 rounded-xl border-2 border-white flex items-center justify-center z-20 shadow-lg">
                                <BadgeCheck size={12} className="text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row justify-center sm:justify-start items-center gap-2 mb-2 sm:mb-1">
                            <h1 className={cn("text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight", user?.privacy_mode && "privacy-blur")}>
                                Welcome, Dr. {user?.full_name?.replace(/^dr\.?\s+/i, '').split(' ')[0]}!
                            </h1>
                            <span className="px-3 py-1 bg-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full border border-white/30 backdrop-blur-sm">
                                Clinical Nutritionist
                            </span>
                        </div>
                        <p className="text-blue-100 font-medium text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2 opacity-90">
                            <Stethoscope size={14} className="shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-none">{user?.specialization || 'Pediatric Specialist'} &bull; {user?.clinic || 'SmartNutri Clinical'}</span>
                        </p>
                    </div>

                    <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-xl shadow-emerald-900/20 font-black uppercase tracking-widest text-[8px] xs:text-[10px] sm:text-[10px] h-12 sm:h-12 px-2 xs:px-4 sm:px-8 rounded-2xl sm:rounded-3xl flex-1 sm:flex-none flex flex-col xs:flex-row items-center justify-center gap-1 xs:gap-2 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <UserPlus size={14} className="xs:w-4 xs:h-4" />
                            <span className="whitespace-nowrap">Link Parent</span>
                        </Button>
                        <Button
                            className="bg-white text-blue-600 hover:bg-blue-50 border-none shadow-lg font-black uppercase tracking-widest text-[8px] xs:text-[10px] sm:text-[10px] h-12 sm:h-12 px-2 xs:px-4 sm:px-8 rounded-2xl sm:rounded-3xl flex-1 sm:flex-none flex flex-col xs:flex-row items-center justify-center gap-1 xs:gap-2 transition-all hover:scale-[1.02]"
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
                            <h2 className="text-[10px] sm:text-3xl font-black text-[var(--color-text-main)] leading-none sm:mt-0.5">{stats.clients}</h2>
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
                            <h2 className="text-[10px] sm:text-3xl font-black text-[var(--color-text-main)] leading-none sm:mt-0.5">{stats.pending}</h2>
                        </div>
                    </CardContent>
                </Card>
            </div>



            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
                    <h2 className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tight">My Clients</h2>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={14} />
                        <input
                            placeholder="Search clinical profiles..."
                            className="w-full sm:w-64 pl-10 pr-4 h-12 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs font-bold focus:border-[var(--color-primary)] outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {clients.map(client => {
                        const clientPendingCount = pendingLogs.filter(log => log.profiles?.user_id === client.id).length;
                        return (
                            <Card
                                key={client.id}
                                onClick={() => navigate(`/nutritionist/client/${client.id}`, { state: { clientName: client.full_name } })}
                                className="hover:shadow-lg transition-all cursor-pointer border-2 border-[var(--color-divider)] relative group rounded-[2rem] overflow-hidden"
                            >
                                <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] relative shrink-0">
                                        <Users size={20} className="sm:w-6 sm:h-6" />
                                        {clientPendingCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white dark:border-zinc-900 text-[8px] font-black text-white items-center justify-center">
                                                    {clientPendingCount}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={cn("font-black text-sm sm:text-base text-[var(--color-secondary)] truncate", user?.privacy_mode && "privacy-blur")}>{client.full_name}</h3>
                                        <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-medium truncate">{client.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {client.status}
                                        </div>
                                        {clientPendingCount > 0 && (
                                            <span className="text-[7px] sm:text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest animate-pulse">Needs Review</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {clients.length === 0 && (
                        <p className="col-span-full text-center py-12 text-[var(--color-text-muted)] font-bold bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                            No clients linked yet. Start by adding a parent portal account.
                        </p>
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

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />
        </div>
    );
}
