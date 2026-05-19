import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Users, Search, Eye, BadgeCheck, ShieldAlert, Check, X, ShieldCheck, Lock } from 'lucide-react';
import api from '../../lib/api';
import Notification from '../../components/common/Notification';

export default function RegistrationQueue({ onStatsUpdate }) {
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNutri, setSelectedNutri] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [previewLicenseImage, setPreviewLicenseImage] = useState(null);
    const [message, setMessage] = useState({ type: 'success', text: '' });
    useEffect(() => {
        if (selectedNutri || previewLicenseImage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedNutri, previewLicenseImage]);

    useEffect(() => {
        fetchNutritionists();
    }, []);

    const fetchNutritionists = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/nutritionists');
            setNutritionists(res.data);
        } catch (err) {
            console.error("Failed to fetch nutritionists", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (id, status) => {
        setProcessingId(id);
        try {
            await api.patch(`/admin/nutritionists/${id}/verify`, { status });
            setNutritionists(prev => prev.map(n => n.id === id ? { ...n, status } : n));
            if (onStatsUpdate) onStatsUpdate();
            setSelectedNutri(null);
            setMessage({ type: 'success', text: `Practitioner ${status}` });
        } catch (err) {
            console.error("Verification failed", err);
            setMessage({ type: 'error', text: 'Action failed' });
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

    const filteredNutritionists = nutritionists.filter(n => {
        const matchesSearch = n.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || n.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || n.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8">
            <Notification
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ ...message, text: '' })}
            />
            {/* Pending Queue & Search */}
            <div className="w-full space-y-6">
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
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === status
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
                        {loading ? (
                            <div className="p-20 text-center text-[var(--color-text-muted)] italic font-medium">Loading Queue...</div>
                        ) : (
                            <>
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
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${nutri.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
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
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${nutri.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
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
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal: Verification Inspector */}
            {selectedNutri && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center sm:bg-black/60 sm:backdrop-blur-md sm:p-6 animate-in sm:fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300"
                    onClick={() => setSelectedNutri(null)}
                >
                    <Card 
                        className="max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[3rem] overflow-hidden shadow-none sm:shadow-2xl bg-[var(--color-bg-card)] flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                            <button
                                onClick={() => setSelectedNutri(null)}
                                className="p-3 hover:bg-[var(--color-bg-page)] rounded-2xl transition-all text-[var(--color-text-muted)]"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <CardHeader className="bg-[var(--color-primary)]/5 border-b border-[var(--color-primary)]/10 p-6 shrink-0">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)]">Professional Audit</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 overflow-y-auto scrollbar-hide flex-1 pb-10 sm:pb-8">
                            <div className="flex flex-col items-center gap-4 mb-8 mt-2">
                                <div className="h-24 w-24 rounded-[2rem] bg-[var(--color-bg-page)] border-4 border-[var(--color-bg-card)] shadow-xl overflow-hidden flex items-center justify-center">
                                    {selectedNutri.profile_image_url ? (
                                        <img src={selectedNutri.profile_image_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <Users size={40} className="text-[var(--color-text-muted)] opacity-30" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight">{selectedNutri.full_name}</h3>
                                    <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-widest">{selectedNutri.specialization || 'Clinical Nutrition'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="p-5 bg-[var(--color-bg-page)] rounded-3xl border border-[var(--color-divider)]">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">PRC / License Verification</label>
                                    <p className="text-sm font-black text-[var(--color-text-main)] font-mono">{selectedNutri.license_no || 'PROVISIONING REQUIRED'}</p>
                                </div>
                                <div className="p-5 bg-[var(--color-bg-page)] rounded-3xl border border-[var(--color-divider)]">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">Clinic / Institution</label>
                                    <p className="text-sm font-black text-[var(--color-text-main)]">{selectedNutri.clinic || 'PRIVATE PRACTICE'}</p>
                                </div>
                                <div className="md:col-span-2 p-5 bg-[var(--color-bg-page)] rounded-3xl border border-[var(--color-divider)]">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">Contact Verification</label>
                                    <p className="text-sm font-black text-[var(--color-text-main)]">{selectedNutri.phone || 'NO PHONE LINKED'}</p>
                                </div>
                            </div>

                            {/* Professional ID Document Viewer */}
                            <div className="p-6 bg-[var(--color-bg-page)] rounded-[2.5rem] border border-[var(--color-divider)] mb-8">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-4 flex items-center gap-2">
                                    <span>Credential Document (PRC ID)</span>
                                    {selectedNutri.license_image_url && <BadgeCheck size={14} className="text-emerald-500" />}
                                </label>
                                {selectedNutri.license_image_url ? (
                                    <div
                                        className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-[var(--color-divider)] cursor-zoom-in bg-zinc-900 shadow-inner"
                                        onClick={() => setPreviewLicenseImage(selectedNutri.license_image_url)}
                                    >
                                        <img src={selectedNutri.license_image_url} alt="License" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/20 shadow-lg">
                                                Inspect Document
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video rounded-3xl border-2 border-dashed border-[var(--color-divider)] flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-white/5">
                                        <ShieldAlert className="text-[var(--color-text-muted)] opacity-30 mb-3" size={32} />
                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-relaxed">No digital credential document uploaded by practitioner.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-[var(--color-divider)]">
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleVerify(selectedNutri.id, 'rejected')}
                                        disabled={processingId === selectedNutri.id}
                                        className="flex-1 h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-rose-500/20"
                                    >
                                        <X size={16} /> Reject
                                    </Button>
                                    <Button
                                        onClick={() => handleVerify(selectedNutri.id, 'approved')}
                                        disabled={processingId === selectedNutri.id}
                                        className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Check size={16} /> Approve
                                    </Button>
                                </div>

                                <Button
                                    onClick={() => handleSuspend(selectedNutri.id, !selectedNutri.is_suspended)}
                                    disabled={processingId === selectedNutri.id}
                                    className={`w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all border-none shadow-sm ${selectedNutri.is_suspended
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                            : 'bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-amber-500 hover:text-white'
                                        }`}
                                >
                                    {selectedNutri.is_suspended ? <ShieldCheck size={16} /> : <Lock size={16} />}
                                    {selectedNutri.is_suspended ? 'Reactivate Account' : 'Suspend Account Access'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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
