import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Users, BadgeCheck, ShieldAlert, Clock, Search, ExternalLink, Check, X, ShieldCheck, UserCheck, Activity, BarChart3, Lock, Eye } from 'lucide-react';
import api from '../lib/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, profiles: 0, pendingApprovals: 0, totalMealsLogged: 0 });
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNutri, setSelectedNutri] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, nutriRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/nutritionists')
            ]);
            setStats(statsRes.data);
            setNutritionists(nutriRes.data);
        } catch (err) {
            console.error("Admin fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id, status) => {
        setProcessingId(id);
        try {
            await api.patch(`/admin/nutritionists/${id}/verify`, { status });
            // Update local state
            setNutritionists(prev => prev.map(n => n.id === id ? { ...n, status } : n));
            // Update stats
            if (status === 'approved') {
                setStats(prev => ({ ...prev, pendingApprovals: Math.max(0, prev.pendingApprovals - 1) }));
            }
            setSelectedNutri(null);
        } catch (err) {
            console.error("Verification failed", err);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredNutritionists = nutritionists.filter(n => {
        const matchesSearch = n.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || n.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || n.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) return <div className="p-8 text-center">Loading Administrative Console...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* ── ADMIN HERO ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--color-divider)] shadow-2xl bg-[var(--color-bg-card)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 via-transparent to-[var(--color-secondary)]/5 opacity-50" />
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--color-primary)]/5 to-transparent" />
                
                <div className="relative p-10 flex flex-col md:flex-row items-center justify-between gap-8 font-outfit">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                <ShieldCheck className="text-[var(--color-primary)]" size={24} />
                            </div>
                            <span className="text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-[0.3em]">System Administrator Console</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-[var(--color-text-main)] tracking-tighter mb-2">
                            Platform <span className="text-[var(--color-primary)]">Oversight</span>
                        </h1>
                        <p className="text-[var(--color-text-muted)] max-w-md font-medium">Manage clinical access, monitor system health, and verify professional credentials.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500' },
                            { label: 'Pending', value: stats.pendingApprovals, icon: Clock, color: 'text-amber-500' },
                            { label: 'Profiles', value: stats.profiles, icon: UserCheck, color: 'text-emerald-500' },
                            { label: 'Total Meals', value: stats.totalMealsLogged, icon: Activity, color: 'text-violet-500' }
                        ].map((s, i) => (
                            <div key={i} className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] min-w-[140px] shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <s.icon size={16} className={`${s.color} transition-transform group-hover:scale-110`} />
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</span>
                                </div>
                                <div className="text-xl font-black text-[var(--color-text-main)]">{s.value.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── MAIN WORKSPACE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Pending Queue & Search */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-grow max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm shadow-sm text-[var(--color-text-main)]"
                            />
                        </div>
                        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-[var(--color-divider)]">
                            {['all', 'pending', 'approved', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        filterStatus === status 
                                        ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm' 
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                        <CardHeader className="bg-[var(--color-bg-page)] border-b border-[var(--color-divider)]">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Users size={18} className="text-emerald-500" /> Professional Registration Queue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[var(--color-bg-page)] text-left border-b border-[var(--color-divider)]">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Practitioner</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">License No</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Registered</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-divider)]">
                                        {filteredNutritionists.map(nutri => (
                                            <tr key={nutri.id} className="hover:bg-[var(--color-bg-page)] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] flex items-center justify-center font-black text-[var(--color-text-muted)] overflow-hidden border border-[var(--color-divider)]">
                                                            {nutri.profile_image_url ? <img src={nutri.profile_image_url} className="h-full w-full object-cover" /> : nutri.full_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-[var(--color-text-main)]">{nutri.full_name}</div>
                                                            <div className="text-[10px] text-zinc-400 font-medium">{nutri.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-[var(--color-text-muted)] font-mono tracking-tighter">
                                                    {nutri.license_no || 'NOT PROVIDED'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-[var(--color-text-muted)]">
                                                    {new Date(nutri.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        nutri.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                        nutri.status === 'rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                        'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                                                    }`}>
                                                        {nutri.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedNutri(nutri)}
                                                        className="p-2 hover:bg-[var(--color-bg-page)] rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredNutritionists.length === 0 && (
                                <div className="p-20 text-center text-zinc-400 italic">No registration records match your filters.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Verification Inspector */}
                <div className="space-y-6">
                    {selectedNutri ? (
                        <Card className="border-2 border-[var(--color-primary)]/30 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right-10 duration-500 bg-[var(--color-bg-card)]">
                            <CardHeader className="bg-[var(--color-primary)]/5 border-b border-[var(--color-primary)]/10 p-6">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)]">Professional Audit</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="flex flex-col items-center gap-4 mb-8">
                                    <div className="h-24 w-24 rounded-[2rem] bg-[var(--color-bg-page)] border-4 border-[var(--color-bg-card)] shadow-xl overflow-hidden flex items-center justify-center">
                                        {selectedNutri.profile_image_url ? (
                                            <img src={selectedNutri.profile_image_url} className="h-full w-full object-cover" />
                                        ) : (
                                            <Users size={40} className="text-[var(--color-text-muted)] opacity-30" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black text-[var(--color-text-main)] tracking-tight">{selectedNutri.full_name}</h3>
                                        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-widest">{selectedNutri.specialization || 'Clinical Nutrition'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                        <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">PRC / License Verification</label>
                                        <p className="text-sm font-black text-[var(--color-text-main)] font-mono">{selectedNutri.license_no || 'PROVISIONING REQUIRED'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                        <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">Clinic / Institution</label>
                                        <p className="text-sm font-black text-[var(--color-text-main)]">{selectedNutri.clinic || 'PRIVATE PRACTICE'}</p>
                                    </div>
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                        <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">Contact Verification</label>
                                        <p className="text-sm font-black text-[var(--color-text-main)]">{selectedNutri.phone || 'NO PHONE LINKED'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-[var(--color-divider)]">
                                    <Button 
                                        onClick={() => handleVerify(selectedNutri.id, 'rejected')}
                                        disabled={processingId === selectedNutri.id}
                                        className="flex-1 h-12 bg-[var(--color-danger)] hover:opacity-90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-red-500/20"
                                    >
                                        <X size={14} /> Reject
                                    </Button>
                                    <Button 
                                        onClick={() => handleVerify(selectedNutri.id, 'approved')}
                                        disabled={processingId === selectedNutri.id}
                                        className="flex-1 h-12 bg-[var(--color-success)] hover:opacity-90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Check size={14} /> Approve
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex items-center justify-center p-12 bg-[var(--color-bg-page)] border-2 border-dashed border-[var(--color-divider)] rounded-[2.5rem]">
                            <div className="text-center">
                                <Lock className="mx-auto text-[var(--color-text-muted)] opacity-30 mb-4" size={48} />
                                <h3 className="text-sm font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Auditor Offline</h3>
                                <p className="text-xs text-[var(--color-text-muted)]/60 mt-2">Select a professional from the queue to begin the verification audit.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
