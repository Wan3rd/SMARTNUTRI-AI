import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, UserCheck, Activity, Clock } from 'lucide-react';
import api from '../lib/api';
import RegistrationQueue from '../admin/components/RegistrationQueue';
import BroadcastTool from '../admin/components/BroadcastTool';
import { AdminDashboardSkeleton } from '../components/SkeletonShell';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, profiles: 0, pendingApprovals: 0, totalMealsLogged: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const statsRes = await api.get('/admin/stats');
            setStats(statsRes.data);
        } catch (err) {
            console.error("Admin fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <AdminDashboardSkeleton />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            {/* ── ADMIN HERO ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--color-divider)] shadow-2xl bg-[var(--color-bg-card)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 via-transparent to-[var(--color-secondary)]/5 opacity-50" />

                <div className="relative p-6 md:p-10 flex flex-col xl:flex-row items-center justify-between gap-8 font-outfit">
                    <div className="text-center xl:text-left">
                        <div className="flex items-center justify-center xl:justify-start gap-3 mb-4">
                            <div className="p-2 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                <ShieldCheck className="text-[var(--color-primary)]" size={24} />
                            </div>
                            <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-[0.3em]">System Administrator Console</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-[var(--color-text-main)] tracking-tighter mb-2">
                            Platform <span className="text-[var(--color-primary)]">Oversight</span>
                        </h1>
                        <p className="text-[var(--color-text-muted)] max-w-md font-medium mx-auto xl:mx-0">Manage clinical access, monitor system health, and verify professional credentials.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 md:gap-4 w-full xl:w-auto">
                        {[
                            { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500' },
                            { label: 'Pending', value: stats.pendingApprovals, icon: Clock, color: 'text-amber-500' },
                            { label: 'Profiles', value: stats.profiles, icon: UserCheck, color: 'text-emerald-500' },
                            { label: 'Total Meals', value: stats.totalMealsLogged, icon: Activity, color: 'text-violet-500' }
                        ].map((s, i) => (
                            <div key={i} className="p-3 md:p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] min-w-[120px] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <s.icon size={14} className={`${s.color} transition-transform group-hover:scale-110`} />
                                    <span className="text-[8px] md:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</span>
                                </div>
                                <div className="text-lg md:text-xl font-black text-[var(--color-text-main)]">{s.value?.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── MAIN WORKSPACE ── */}
            <RegistrationQueue onStatsUpdate={fetchStats} />

            {/* ── PLATFORM BROADCAST TOOL ── */}
            <BroadcastTool />
        </div>
    );
}
