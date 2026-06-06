import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { User, XCircle, Shield, Users, Eye, X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function UserDetailsModal({ selectedUserDetails, currentUser, onClose, loading }) {
    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [previewLicenseImage, setPreviewLicenseImage] = useState(null);
    
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
        if (selectedUserDetails) {
            setIsMounted(true);
            setIsClosing(false);
        } else {
            setIsMounted(false);
            setIsClosing(false);
        }
    }, [selectedUserDetails]);

    const triggerCloseAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    }, [onClose]);

    useEffect(() => {
        if (selectedUserDetails || loading || previewLicenseImage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedUserDetails, loading, previewLicenseImage]);

    if (loading) {
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300"
                onClick={onClose}
            >
                <Card
                    className="max-w-md w-full border-2 border-[var(--color-divider)] rounded-[3rem] overflow-hidden shadow-2xl bg-[var(--color-bg-card)] flex flex-col items-center justify-center p-12 text-center relative gap-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 blur-xl animate-pulse scale-150" />
                        <div className="h-20 w-20 rounded-[2rem] bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center animate-spin-slow shadow-lg shadow-[var(--color-primary)]/5 border-2 border-[var(--color-primary)]/20">
                            <User size={36} className="animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-[var(--color-text-main)] animate-pulse">Retrieving Profile</h3>
                        <p className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider">Synchronizing secure data packets from platform ledger...</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (!selectedUserDetails) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] flex items-center justify-center sm:p-6 transition-all duration-500 ease-out",
                isMounted && !isClosing ? "sm:bg-black/60 sm:backdrop-blur-md" : "sm:bg-black/0 sm:backdrop-blur-none"
            )}
            onClick={triggerCloseAnimation}
        >
            <Card
                className={cn(
                    "max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[2rem] overflow-hidden shadow-none sm:shadow-2xl bg-[var(--color-bg-card)] flex flex-col relative transition-all duration-500 ease-out transform",
                    isMounted && !isClosing ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="overflow-y-auto flex-1 scrollbar-hide p-5 space-y-5">
                    {/* Horizontal Header */}
                    <div className="flex justify-between items-start mb-1 mt-1">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0 overflow-hidden shadow-sm">
                                {selectedUserDetails.profile_image_url ? (
                                    <img src={selectedUserDetails.profile_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div className="min-w-0 text-left">
                                <h2 className={cn("text-base font-black text-[var(--color-text-main)] tracking-tight leading-snug truncate", currentUser?.privacy_mode && "privacy-blur")}>{selectedUserDetails.full_name}</h2>
                                <div className="flex flex-row items-center gap-2 mt-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20">
                                        {selectedUserDetails.role}
                                    </span>
                                    <span className="text-[10px] font-medium text-[var(--color-text-muted)] truncate max-w-[160px]">{selectedUserDetails.email}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={triggerCloseAnimation}
                            className="p-2 hover:bg-[var(--color-bg-page)] rounded-xl transition-all text-[var(--color-text-muted)] shrink-0 cursor-pointer"
                        >
                            <XCircle size={20} />
                        </button>
                    </div>

                    {/* Unified Metadata & Security list */}
                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] space-y-3">
                        <div className="flex justify-between items-center text-xs gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Joined Platform</span>
                            <span className="font-bold text-[var(--color-text-main)]">
                                {new Date(selectedUserDetails.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Contact Phone</span>
                            <span className="font-bold text-[var(--color-text-main)] truncate">{selectedUserDetails.phone || 'Not Provided'}</span>
                        </div>
                        <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Auth ID</span>
                            <span className="font-mono text-[9px] text-[var(--color-text-muted)] truncate max-w-[120px]">{selectedUserDetails.id}</span>
                        </div>
                        
                        {/* Nutritionist credentials fields */}
                        {selectedUserDetails.role === 'nutritionist' && (
                            <>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">License No</span>
                                    <span className="font-mono font-bold text-[var(--color-text-main)] truncate">{selectedUserDetails.professional_id || selectedUserDetails.license_no || 'NOT PROVIDED'}</span>
                                </div>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date of Birth</span>
                                    <span className="font-bold text-[var(--color-text-main)] truncate">
                                        {selectedUserDetails.date_of_birth 
                                            ? new Date(selectedUserDetails.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'Not Provided'}
                                    </span>
                                </div>
                                <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Affiliated Clinic</span>
                                    <span className="font-bold text-[var(--color-text-main)] truncate">{selectedUserDetails.clinic || 'Not Specified'}</span>
                                </div>
                            </>
                        )}
                        
                        <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Security Status</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${selectedUserDetails.role !== 'nutritionist' || selectedUserDetails.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="font-bold text-[var(--color-text-main)] uppercase text-[10px] tracking-wider">
                                    {selectedUserDetails.role === 'nutritionist' ? (selectedUserDetails.status || 'Pending Review') : 'Active Member'}
                                </span>
                            </div>
                        </div>

                        {selectedUserDetails.is_suspended && (
                            <div className="border-t border-[var(--color-divider)] pt-3 flex justify-between items-center text-xs gap-2">
                                <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Access Policy</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                    Suspended
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Nutritionist Digital License Viewer */}
                    {selectedUserDetails.role === 'nutritionist' && selectedUserDetails.license_image_url && (
                        <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2.5">Credentials Document</div>
                            <div className="flex items-center gap-3.5">
                                <div 
                                    className="relative w-32 aspect-[16/10] rounded-xl overflow-hidden border border-[var(--color-divider)] bg-zinc-900 shadow-sm shrink-0 cursor-zoom-in group"
                                    onClick={() => setPreviewLicenseImage(selectedUserDetails.license_image_url)}
                                >
                                    <img src={selectedUserDetails.license_image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye size={16} className="text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] leading-tight mb-1">PRC ID Document is verified and secure.</p>
                                    <button
                                        onClick={() => setPreviewLicenseImage(selectedUserDetails.license_image_url)}
                                        className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:underline cursor-pointer"
                                    >
                                        Inspect Document
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connected Children Profiles */}
                    {selectedUserDetails.role === 'parent' && (
                        <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Connected Patients</div>
                            {selectedUserDetails.profiles?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUserDetails.profiles.map(child => (
                                        <div key={child.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                            <div className="h-5 w-5 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0 overflow-hidden">
                                                {child.profile_image_url ? (
                                                    <img src={child.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={10} />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-[var(--color-text-main)] truncate max-w-[80px]">{child.child_name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] font-medium text-[var(--color-text-muted)] italic">No patient profiles linked.</div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Compact Footer */}
                <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-t border-[var(--color-divider)] flex justify-center pb-4">
                    <button
                        onClick={triggerCloseAnimation}
                        className="w-full h-10 bg-white dark:bg-zinc-900 border border-[var(--color-divider)] hover:bg-gray-50 dark:hover:bg-white/5 text-zinc-900 dark:text-zinc-100 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            </Card>

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
        </div>
    );
}
