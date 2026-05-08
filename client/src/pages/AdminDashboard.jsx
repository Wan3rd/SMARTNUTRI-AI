import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Users, BadgeCheck, ShieldAlert, Clock, Search, ExternalLink, Check, X, ShieldCheck, UserCheck, Activity, BarChart3, Lock, Eye, Megaphone, Send, Info, Settings, Trash2 } from 'lucide-react';
import api from '../lib/api';
import AnnouncementBanner from '../components/AnnouncementBanner';
import Notification from '../components/common/Notification';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, profiles: 0, pendingApprovals: 0, totalMealsLogged: 0 });
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNutri, setSelectedNutri] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [previewLicenseImage, setPreviewLicenseImage] = useState(null);
    const [message, setMessage] = useState({ type: 'success', text: '' });
    
    // Broadcast State
    const [broadcast, setBroadcast] = useState({ title: '', content: '', target_role: 'all', priority: 'normal' });
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);

    useEffect(() => {
        fetchData();
        fetchAnnouncements();
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setPreviewLicenseImage(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
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

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/admin/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            console.error("Failed to fetch announcements", err);
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

    const handleSuspend = async (id, isSuspended) => {
        setProcessingId(id);
        try {
            await api.patch(`/admin/users/${id}/suspend`, { is_suspended: isSuspended });
            setNutritionists(prev => prev.map(n => n.id === id ? { ...n, is_suspended: isSuspended } : n));
            if (selectedNutri?.id === id) {
                setSelectedNutri(prev => ({ ...prev, is_suspended: isSuspended }));
            }
            setMessage({ type: 'success', text: `Account ${isSuspended ? 'suspended' : 'reactivated'} successfully` });
        } catch (err) {
            console.error("Suspension failed", err);
            setMessage({ type: 'error', text: 'Action failed' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcast.title || !broadcast.content) {
            setMessage({ type: 'error', text: 'Broadcast requires title and content' });
            return;
        }
        setIsBroadcasting(true);
        try {
            if (editingAnnouncement) {
                await api.patch(`/admin/announcements/${editingAnnouncement.id}`, broadcast);
                setMessage({ type: 'success', text: 'Broadcast updated' });
            } else {
                await api.post('/admin/broadcast', broadcast);
                setMessage({ type: 'success', text: 'Broadcast transmitted system-wide' });
            }
            setBroadcast({ title: '', content: '', target_role: 'all', priority: 'normal' });
            setEditingAnnouncement(null);
            fetchAnnouncements();
        } catch (err) {
            console.error("Broadcast failed", err);
            setMessage({ type: 'error', text: 'Action failed' });
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm("Permanent delete this broadcast?")) return;
        try {
            await api.delete(`/admin/announcements/${id}`);
            setMessage({ type: 'success', text: 'Broadcast removed' });
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
        }
    };

    const startEditAnnouncement = (ann) => {
        setEditingAnnouncement(ann);
        setBroadcast({
            title: ann.title,
            content: ann.content,
            target_role: ann.target_role,
            priority: ann.priority
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const filteredNutritionists = nutritionists.filter(n => {
        const matchesSearch = n.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || n.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || n.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) return <div className="p-8 text-center">Loading Administrative Console...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            {message.text && (
                <Notification 
                    type={message.type} 
                    message={message.text} 
                    onClose={() => setMessage({ ...message, text: '' })} 
                />
            )}

            <AnnouncementBanner />
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
                                <div className="text-lg md:text-xl font-black text-[var(--color-text-main)]">{s.value.toLocaleString()}</div>
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
                        <div className="relative w-full sm:flex-grow sm:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search practitioners..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm shadow-sm text-[var(--color-text-main)]"
                            />
                        </div>
                        <div className="flex gap-1 md:gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-[var(--color-divider)] overflow-x-auto no-scrollbar">
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
                        <CardHeader className="bg-[var(--color-bg-page)] border-b border-[var(--color-divider)] p-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Users size={18} className="text-emerald-500" /> Professional Registration Queue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop View Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[var(--color-bg-page)] text-left border-b border-[var(--color-divider)]">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Practitioner</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">License No</th>
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
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-xs font-black text-[var(--color-text-muted)] font-mono tracking-tight">
                                                            {nutri.professional_id || nutri.license_no || 'NOT PROVIDED'}
                                                        </div>
                                                        {nutri.license_image_url && (
                                                            <div className="flex items-center gap-1 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                                                                <Eye size={10} /> Document Attached
                                                            </div>
                                                        )}
                                                    </div>
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
                                                        onClick={(e) => { e.stopPropagation(); setSelectedNutri(nutri); }}
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

                            {/* Mobile View Card List */}
                            <div className="md:hidden divide-y divide-[var(--color-divider)]">
                                {filteredNutritionists.map(nutri => (
                                    <div key={nutri.id} className="p-5 flex items-center justify-between gap-4 active:bg-gray-50 transition-colors" onClick={() => setSelectedNutri(nutri)}>
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-12 w-12 rounded-2xl bg-[var(--color-bg-page)] flex items-center justify-center font-black text-[var(--color-text-muted)] overflow-hidden border border-[var(--color-divider)] shrink-0">
                                                {nutri.profile_image_url ? <img src={nutri.profile_image_url} className="h-full w-full object-cover" /> : nutri.full_name?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-[var(--color-text-main)] truncate">{nutri.full_name}</div>
                                                <div className="text-[10px] text-zinc-400 font-medium truncate mb-1">{nutri.email}</div>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                    nutri.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    nutri.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-amber-50 text-amber-600 animate-pulse'
                                                }`}>
                                                    {nutri.status}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="h-10 w-10 flex items-center justify-center bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] text-[var(--color-text-muted)] shrink-0">
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                ))}
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

                                    {/* Professional ID Document Viewer */}
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                        <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-3 flex items-center justify-between">
                                            <span>Credential Document (PRC ID)</span>
                                            {selectedNutri.license_image_url && <BadgeCheck size={12} className="text-emerald-500" />}
                                        </label>
                                        {selectedNutri.license_image_url ? (
                                            <div 
                                                className="relative group aspect-[1.6/1] rounded-xl overflow-hidden border-2 border-[var(--color-divider)] cursor-zoom-in bg-zinc-900"
                                                onClick={() => setPreviewLicenseImage(selectedNutri.license_image_url)}
                                            >
                                                <img src={selectedNutri.license_image_url} alt="License" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/20">
                                                        Inspect Document
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="aspect-[1.6/1] rounded-xl border-2 border-dashed border-[var(--color-divider)] flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-white/5">
                                                <ShieldAlert className="text-[var(--color-text-muted)] opacity-30 mb-2" size={24} />
                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-tight">No digital credential document uploaded by practitioner.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-[var(--color-divider)]">
                                    <div className="flex gap-3">
                                        <Button 
                                            onClick={() => handleVerify(selectedNutri.id, 'rejected')}
                                            disabled={processingId === selectedNutri.id}
                                            className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-rose-500/20"
                                        >
                                            <X size={14} /> Reject
                                        </Button>
                                        <Button 
                                            onClick={() => handleVerify(selectedNutri.id, 'approved')}
                                            disabled={processingId === selectedNutri.id}
                                            className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            <Check size={14} /> Approve
                                        </Button>
                                    </div>
                                    
                                    <Button 
                                        onClick={() => handleSuspend(selectedNutri.id, !selectedNutri.is_suspended)}
                                        disabled={processingId === selectedNutri.id}
                                        className={`w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all border-none shadow-sm ${
                                            selectedNutri.is_suspended 
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-500 hover:text-white' 
                                            : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-amber-500 hover:text-white'
                                        }`}
                                    >
                                        {selectedNutri.is_suspended ? <ShieldCheck size={14} /> : <Lock size={14} />}
                                        {selectedNutri.is_suspended ? 'Reactivate Account' : 'Suspend Account Access'}
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

            {/* ── PLATFORM BROADCAST TOOL ── */}
            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--color-divider)]">
                    <div className="md:w-1/3 p-8 bg-zinc-50 dark:bg-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl">
                                <Megaphone size={24} />
                            </div>
                            <h3 className="text-xl font-black text-[var(--color-text-main)] tracking-tight">System Broadcast</h3>
                        </div>
                        <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed mb-6">
                            Transmit high-priority notifications to specific clinical roles or the entire user base. Announcements appear in real-time on target dashboards.
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-[var(--color-divider)] shadow-sm">
                                <Info size={16} className="text-blue-500 mt-1" />
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight">Use broadcasts for maintenance updates, clinical alerts, or platform news.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Announcement Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. System Maintenance Update"
                                    value={broadcast.title}
                                    onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                                    className="w-full px-5 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm text-[var(--color-text-main)]"
                                />
                            </div>
                            <div className="flex gap-6">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Target Audience</label>
                                    <select 
                                        value={broadcast.target_role}
                                        onChange={(e) => setBroadcast({ ...broadcast, target_role: e.target.value })}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl outline-none font-bold text-sm text-[var(--color-text-main)] cursor-pointer"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="nutritionist">Nutritionists Only</option>
                                        <option value="parent">Parents Only</option>
                                    </select>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Priority Level</label>
                                    <select 
                                        value={broadcast.priority}
                                        onChange={(e) => setBroadcast({ ...broadcast, priority: e.target.value })}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl outline-none font-bold text-sm text-[var(--color-text-main)] cursor-pointer"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="high">High Alert</option>
                                        <option value="critical">Critical (Immediate)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Broadcast Content</label>
                            <textarea 
                                placeholder="Describe the update or alert in detail..."
                                value={broadcast.content}
                                onChange={(e) => setBroadcast({ ...broadcast, content: e.target.value })}
                                className="w-full px-5 py-4 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm text-[var(--color-text-main)] min-h-[120px] resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            {editingAnnouncement && (
                                <Button 
                                    onClick={() => {
                                        setEditingAnnouncement(null);
                                        setBroadcast({ title: '', content: '', target_role: 'all', priority: 'normal' });
                                    }}
                                    className="h-14 px-10 bg-zinc-100 dark:bg-white/5 text-[var(--color-text-main)] rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs border border-[var(--color-divider)]"
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button 
                                onClick={handleSendBroadcast}
                                disabled={isBroadcasting}
                                className="h-14 px-10 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs gap-3 shadow-xl shadow-[var(--color-primary)]/20"
                            >
                                <Send size={18} className={isBroadcasting ? 'animate-pulse' : ''} />
                                {isBroadcasting ? 'Transmitting...' : editingAnnouncement ? 'Update Broadcast' : 'Initiate Broadcast'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Announcement History / Management List */}
                {announcements.length > 0 && (
                    <div className="border-t border-[var(--color-divider)] p-8">
                        <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-6">Active & Past Broadcasts</h4>
                        <div className="space-y-3">
                            {announcements.map(ann => (
                                <div key={ann.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] group hover:border-[var(--color-primary)]/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                            ann.priority === 'critical' ? 'bg-rose-500/10 text-rose-500' : 
                                            ann.priority === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        }`}>
                                            <Megaphone size={14} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-[var(--color-text-main)]">{ann.title}</span>
                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded-full text-[var(--color-text-muted)] uppercase tracking-tighter">To: {ann.target_role}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{new Date(ann.created_at).toLocaleDateString()} • {ann.admin?.full_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => startEditAnnouncement(ann)}
                                            className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-blue-500"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteAnnouncement(ann.id)}
                                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-rose-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {/* Document Preview Lightbox */}
            {previewLicenseImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300"
                    onClick={() => setPreviewLicenseImage(null)}
                >
                    <button 
                        onClick={() => setPreviewLicenseImage(null)}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-4 bg-white/5 rounded-full border border-white/10 z-[210]"
                    >
                        <X size={32} />
                    </button>
                    <div 
                        className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Credential Audit</h2>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Official Professional Regulation Commission Document</p>
                        </div>
                        <div className="flex-1 w-full relative group">
                            <img 
                                src={previewLicenseImage} 
                                alt="Credential Preview" 
                                className="w-full h-full object-contain rounded-3xl shadow-2xl shadow-black/50 border border-white/10"
                            />
                        </div>
                        <p className="text-[10px] font-bold text-white/40 italic">Scroll or drag to inspect document security features</p>
                    </div>
                </div>
            )}
        </div>
    );
}
