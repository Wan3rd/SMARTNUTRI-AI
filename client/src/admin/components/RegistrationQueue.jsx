import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Users, Search, Eye, BadgeCheck, ShieldAlert, Check, X, ShieldCheck, Lock, Loader2, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import api from '../../lib/api';
import Notification from '../../components/common/Notification';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { cn } from '../../lib/utils';

export default function RegistrationQueue({ onStatsUpdate }) {
    const [nutritionists, setNutritionists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNutri, setSelectedNutri] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [previewLicenseImage, setPreviewLicenseImage] = useState(null);
    const [message, setMessage] = useState({ type: 'success', text: '' });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        type: null, // 'approve' | 'reject' | 'suspend'
        targetId: null,
        targetStatus: null, // status for verify, isSuspended for suspend
        title: '',
        message: '',
        confirmText: 'Confirm',
        isDestructive: false
    });
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionPreset, setRejectionPreset] = useState('');

    // Zoom/Pan/Rotate states
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const imageRef = useRef(null);
    const scaleRef = useRef(scale);
    const positionRef = useRef(position);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const dragTotalDistRef = useRef(0);

    // Keep refs in sync
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    useEffect(() => {
        if (selectedNutri || previewLicenseImage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedNutri, previewLicenseImage]);

    useEffect(() => {
        const img = imageRef.current;
        if (!img) return;

        const onWheelEvent = (e) => {
            e.preventDefault();
            const zoomStep = 0.2;
            const direction = e.deltaY < 0 ? 1 : -1;
            
            const prevScale = scaleRef.current;
            const newScale = Math.max(1, Math.min(4, prevScale + direction * zoomStep));
            
            if (newScale === prevScale) return;
            
            if (newScale === 1) {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            } else {
                const container = img.parentElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const cursorX = e.clientX - (rect.left + rect.width / 2);
                    const cursorY = e.clientY - (rect.top + rect.height / 2);
                    
                    const prevPos = positionRef.current;
                    const factor = newScale / prevScale;
                    
                    setScale(newScale);
                    setPosition({
                        x: cursorX - (cursorX - prevPos.x) * factor,
                        y: cursorY - (cursorY - prevPos.y) * factor
                    });
                }
            }
        };

        img.addEventListener('wheel', onWheelEvent, { passive: false });
        return () => {
            img.removeEventListener('wheel', onWheelEvent);
        };
    }, [previewLicenseImage]);

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 4));
    };

    const handleZoomOut = () => {
        setScale(prev => {
            const next = Math.max(prev - 0.25, 1);
            if (next === 1) {
                setPosition({ x: 0, y: 0 });
            }
            return next;
        });
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    };

    const handlePointerDown = (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        try {
            e.target.setPointerCapture(e.pointerId);
        } catch (err) {
            console.error(err);
        }
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        dragStartPosRef.current = { ...position };
        dragTotalDistRef.current = 0;
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        dragTotalDistRef.current = Math.sqrt(dx * dx + dy * dy);
        
        setPosition({
            x: dragStartPosRef.current.x + dx,
            y: dragStartPosRef.current.y + dy
        });
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        try {
            e.target.releasePointerCapture(e.pointerId);
        } catch (err) {
            console.error(err);
        }
        setIsDragging(false);
        
        // Treat as click/tap if mouse didn't move significantly
        if (dragTotalDistRef.current < 5) {
            handleImageZoomToggle(e);
        }
    };

    const handleImageZoomToggle = (e) => {
        if (scale > 1) {
            handleReset();
        } else {
            const img = imageRef.current;
            const container = img?.parentElement;
            if (container) {
                const rect = container.getBoundingClientRect();
                const cursorX = e.clientX - (rect.left + rect.width / 2);
                const cursorY = e.clientY - (rect.top + rect.height / 2);
                
                const targetScale = 2.5;
                setScale(targetScale);
                setPosition({
                    x: cursorX - cursorX * targetScale,
                    y: cursorY - cursorY * targetScale
                });
            }
        }
    };

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

    const handleVerify = async (id, status, reason = null) => {
        setProcessingId(`${id}-${status}`);
        try {
            await api.patch(`/admin/nutritionists/${id}/verify`, { status, reason });
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

    const triggerVerifyConfirm = (id, status, name) => {
        const isReject = status === 'rejected';
        setRejectionReason('');
        setRejectionPreset('');
        setConfirmDialog({
            isOpen: true,
            type: isReject ? 'reject' : 'approve',
            targetId: id,
            targetStatus: status,
            title: isReject ? 'Reject Practitioner' : 'Approve Practitioner',
            message: isReject 
                ? `Are you sure you want to reject ${name}? Please specify the reason below.`
                : `Are you sure you want to approve ${name}? This will send a verification email and grant them clinical authority.`,
            confirmText: isReject ? 'Reject' : 'Approve',
            isDestructive: isReject
        });
    };

    const triggerSuspendConfirm = (id, isSuspended, name) => {
        setConfirmDialog({
            isOpen: true,
            type: 'suspend',
            targetId: id,
            targetStatus: isSuspended,
            title: isSuspended ? 'Suspend Practitioner' : 'Reactivate Practitioner',
            message: isSuspended
                ? `Are you sure you want to suspend ${name}? This will block their clinical access.`
                : `Are you sure you want to reactivate ${name}? This will restore their clinical access.`,
            confirmText: isSuspended ? 'Suspend' : 'Reactivate',
            isDestructive: isSuspended
        });
    };

    const handleConfirmSubmit = async () => {
        const { type, targetId, targetStatus } = confirmDialog;
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (type === 'approve' || type === 'reject') {
            await handleVerify(targetId, targetStatus, type === 'reject' ? rejectionReason : null);
        } else if (type === 'suspend') {
            await handleSuspend(targetId, targetStatus);
        }
    };

    const handleSuspend = async (id, isSuspended) => {
        setProcessingId(`${id}-suspend`);
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

                <Card className="border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
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
                                                <tr key={nutri.id} onClick={() => setSelectedNutri(nutri)} className="hover:bg-[var(--color-bg-page)] transition-colors group cursor-pointer">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] flex items-center justify-center font-black text-[var(--color-text-muted)] overflow-hidden border border-[var(--color-divider)]">
                                                                {nutri.profile_image_url ? <img src={nutri.profile_image_url} className="h-full w-full object-cover" /> : nutri.full_name?.[0]}
                                                            </div>
                                                            <div>
                                                                    <div className="text-sm font-black text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">{nutri.full_name}</div>
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
                    onClick={() => !processingId && setSelectedNutri(null)}
                >
                    <Card 
                        className="max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[2rem] overflow-hidden shadow-none sm:shadow-2xl bg-[var(--color-bg-card)] flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                            <button
                                onClick={() => !processingId && setSelectedNutri(null)}
                                disabled={processingId !== null}
                                className="p-2.5 hover:bg-[var(--color-bg-page)] rounded-xl transition-all text-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <CardHeader className="bg-[var(--color-primary)]/5 border-b border-[var(--color-primary)]/10 px-5 py-4 shrink-0">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)]">Professional Audit</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 overflow-y-auto scrollbar-hide flex-1 pb-6">
                            {/* Horizontal Header */}
                            <div className="flex flex-row items-center gap-4 mb-5 mt-1">
                                <div className="h-16 w-16 rounded-2xl bg-[var(--color-bg-page)] border-2 border-[var(--color-bg-card)] shadow-md overflow-hidden flex items-center justify-center shrink-0">
                                    {selectedNutri.profile_image_url ? (
                                        <img src={selectedNutri.profile_image_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <Users size={24} className="text-[var(--color-text-muted)] opacity-30" />
                                    )}
                                </div>
                                <div className="min-w-0 text-left">
                                    <h3 className="text-base font-black text-[var(--color-text-main)] tracking-tight truncate leading-snug">{selectedNutri.full_name}</h3>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-wider">{selectedNutri.specialization || 'Clinical Nutrition'}</p>
                                </div>
                            </div>

                            {/* Credentials List */}
                             <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] space-y-3 mb-4">
                                <div className="flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">License No</span>
                                    <span className="font-black text-[var(--color-text-main)] font-mono truncate">{selectedNutri.license_no || 'NOT PROVIDED'}</span>
                                </div>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date of Birth</span>
                                    <span className="font-black text-[var(--color-text-main)] truncate">
                                        {selectedNutri.date_of_birth 
                                            ? new Date(selectedNutri.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'NOT PROVIDED'}
                                    </span>
                                </div>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Clinic / Institution</span>
                                    <span className="font-black text-[var(--color-text-main)] truncate">{selectedNutri.clinic || 'PRIVATE PRACTICE'}</span>
                                </div>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Contact Phone</span>
                                    <span className="font-black text-[var(--color-text-main)] truncate">{selectedNutri.phone || 'NO PHONE LINKED'}</span>
                                </div>
                            </div>

                            {/* Document Viewer Thumbnail */}
                            <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] mb-5">
                                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                                    <span>PRC ID Document</span>
                                    {selectedNutri.license_image_url && <BadgeCheck size={12} className="text-emerald-500" />}
                                </label>
                                
                                {selectedNutri.license_image_url ? (
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className={`relative group w-32 aspect-[16/10] rounded-xl overflow-hidden border border-[var(--color-divider)] bg-zinc-900 shadow-sm shrink-0 ${processingId ? 'pointer-events-none opacity-50' : 'cursor-zoom-in'}`}
                                            onClick={() => !processingId && setPreviewLicenseImage(selectedNutri.license_image_url)}
                                        >
                                            <img src={selectedNutri.license_image_url} alt="License" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] leading-tight mb-1">Click the thumbnail to inspect credentials in high resolution.</p>
                                            <button 
                                                onClick={() => !processingId && setPreviewLicenseImage(selectedNutri.license_image_url)}
                                                className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:underline"
                                            >
                                                Inspect Document
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4 rounded-xl border border-dashed border-[var(--color-divider)] flex items-center justify-center gap-2 px-4 bg-zinc-50 dark:bg-white/5">
                                        <ShieldAlert className="text-[var(--color-text-muted)] opacity-30 shrink-0" size={18} />
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider text-center leading-relaxed">No credential document uploaded.</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions footer */}
                            <div className="flex gap-2.5 pt-4 border-t border-[var(--color-divider)]">
                                <button
                                    onClick={() => triggerVerifyConfirm(selectedNutri.id, 'rejected', selectedNutri.full_name)}
                                    disabled={processingId !== null}
                                    className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] gap-1.5 shadow-sm shadow-rose-500/10 flex justify-center items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {processingId === `${selectedNutri.id}-rejected` ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        <><X size={14} /> Reject</>
                                    )}
                                </button>
                                <button
                                    onClick={() => triggerVerifyConfirm(selectedNutri.id, 'approved', selectedNutri.full_name)}
                                    disabled={processingId !== null}
                                    className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] gap-1.5 shadow-sm shadow-emerald-500/10 flex justify-center items-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {processingId === `${selectedNutri.id}-approved` ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        <><Check size={14} /> Approve</>
                                    )}
                                </button>
                                <button
                                    onClick={() => triggerSuspendConfirm(selectedNutri.id, !selectedNutri.is_suspended, selectedNutri.full_name)}
                                    disabled={processingId !== null}
                                    className={`w-12 h-12 rounded-xl border-none shadow-sm flex justify-center items-center shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                                        selectedNutri.is_suspended
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-300'
                                    }`}
                                    title={selectedNutri.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                                >
                                    {processingId === `${selectedNutri.id}-suspend` ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        selectedNutri.is_suspended ? <ShieldCheck size={16} /> : <Lock size={16} />
                                    )}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Document Preview Lightbox */}
            {previewLicenseImage && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300"
                    onClick={() => { setPreviewLicenseImage(null); handleReset(); }}
                >
                    <button
                        onClick={() => { setPreviewLicenseImage(null); handleReset(); }}
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-4 bg-white/5 rounded-full border border-white/10 z-[210] cursor-pointer"
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
                        <div className="flex-1 w-full max-h-[70vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/50 flex items-center justify-center relative select-none">
                            <img
                                ref={imageRef}
                                src={previewLicenseImage}
                                alt="Credential Preview"
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                                    touchAction: 'none'
                                }}
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50 border border-white/10 select-none"
                            />
                        </div>
                        
                        {/* Control Toolbar */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-5 z-[210] animate-in slide-in-from-bottom-5">
                            <button
                                onClick={handleZoomOut}
                                className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer"
                                title="Zoom Out"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <span className="text-white/60 text-xs font-black font-mono w-10 text-center select-none">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer"
                                title="Zoom In"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <div className="w-px h-4 bg-white/20" />
                            <button
                                onClick={handleRotate}
                                className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer"
                                title="Rotate Clockwise"
                            >
                                <RotateCw size={18} />
                            </button>
                            <button
                                onClick={handleReset}
                                className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer"
                                title="Reset View"
                            >
                                <Maximize2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmSubmit}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                isDestructive={confirmDialog.isDestructive}
                confirmDisabled={confirmDialog.type === 'reject' && !rejectionReason.trim()}
            >
                {confirmDialog.type === 'reject' && (
                    <div className="space-y-3 mt-3 text-left">
                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-1">Rejection Reason Preset</label>
                        <select
                            value={rejectionPreset}
                            onChange={(e) => {
                                const val = e.target.value;
                                setRejectionPreset(val);
                                if (val && val !== 'Other') {
                                    setRejectionReason(val);
                                } else if (val === 'Other') {
                                    setRejectionReason('');
                                }
                            }}
                            className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-xs font-semibold outline-none focus:border-rose-500 cursor-pointer"
                        >
                            <option value="">Select a preset reason...</option>
                            <option value="Blurry ID / PRC Document photo provided. Please upload a clearer photo.">Blurry ID / PRC Document</option>
                            <option value="Invalid or expired professional registration license number.">Invalid / Expired License Number</option>
                            <option value="Incorrect Clinic / Hospital affiliation details.">Incorrect Clinic Details</option>
                            <option value="The practitioner name does not match the uploaded credential ID name.">Verification Name Discrepancy</option>
                            <option value="Other">Other (Write Custom Reason Below)</option>
                        </select>

                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-1">Detailed Reason (Mandatory)</label>
                        <textarea
                            placeholder="Enter detailed reason here so the practitioner knows what to correct..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-3 text-xs rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] outline-none focus:border-rose-500 min-h-[90px] font-medium resize-none"
                            required
                        />
                    </div>
                )}
            </ConfirmDialog>
        </div>
    );
}
