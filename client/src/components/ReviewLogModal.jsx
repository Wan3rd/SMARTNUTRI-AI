import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, CheckCircle, AlertTriangle, Save, Edit2, Info, ChefHat, Eye, EyeOff, Activity, Droplets, Pill, PieChart, ShieldAlert, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Notification from './common/Notification';
import ConfirmDialog from './common/ConfirmDialog';

export default function ReviewLogModal({ isOpen, onClose, log, onReviewComplete }) {
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState('');
    const [editedAnalysis, setEditedAnalysis] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollRef = useRef(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const handleImageScroll = (e) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const cardWidth = e.currentTarget.clientWidth * 0.85; // card takes 85% width
        const newIndex = Math.round(scrollLeft / cardWidth);
        setActiveImageIndex(Math.min(1, Math.max(0, newIndex)));
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const handleScroll = () => setIsScrolled(el.scrollTop > 80);
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isOpen]);

    const isDirty = () => {
        if (!log) return false;
        const initialReview = log.nutritionist_review?.comment || '';
        const initialAnalysis = JSON.stringify(log.ai_analysis || { items: [], total_calories_est: 0, macros_est: { protein_g: 0, carbs_g: 0, fat_g: 0 } });
        const currentAnalysis = JSON.stringify(editedAnalysis);

        return review !== initialReview || initialAnalysis !== currentAnalysis;
    };

    const handleDismiss = () => {
        if (isDirty()) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Clinical Edits?',
                message: 'You have modified the nutritional analysis or added professional comments. Are you sure you want to discard these changes?',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    onClose();
                }
            });
        } else {
            onClose();
        }
    };

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (previewImage) {
                    setPreviewImage(null);
                    setZoomScale(1);
                } else {
                    handleDismiss();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, previewImage]);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setNotif({ show: false, message: '', type: 'success' });
        }
    }, [isOpen]);

    useEffect(() => {
        if (log) {
            setReview(log.nutritionist_review?.comment || '');
            setEditedAnalysis(log.ai_analysis || { items: [], total_calories_est: 0, macros_est: { protein_g: 0, carbs_g: 0, fat_g: 0 } });
            setNotif({ show: false, message: '', type: 'success' });
        }
    }, [log]);

    const macros = editedAnalysis?.macros_est || {};
    const allergies = log?.profile?.allergies || [];

    const detectedAllergens = React.useMemo(() => {
        if (!log || !allergies || allergies.length === 0 || !editedAnalysis?.items) return [];
        const found = [];
        editedAnalysis.items.forEach(item => {
            const itemName = (item.name || "").toLowerCase().trim();
            if (!itemName) return;

            allergies.forEach(allergy => {
                const allergen = (allergy || "").toLowerCase().trim();
                if (!allergen || allergen === 'none') return;

                const allergenSingular = (allergen.length > 3 && allergen.endsWith('s')) 
                    ? allergen.slice(0, -1) 
                    : allergen;

                const isMatch = itemName.includes(allergen) || 
                               itemName.includes(allergenSingular) || 
                               allergen.includes(itemName) ||
                               allergenSingular.includes(itemName);

                if (isMatch) {
                    found.push({ item: item.name, allergen: allergy });
                }
            });
        });
        return found;
    }, [editedAnalysis?.items, allergies, log]);

    if (!isOpen || !log) return null;

    const handleApprove = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await api.patch(`/nutritionist/logs/${log.id}/review`, {
                nutritionist_review: {
                    title: "Nutritionist Verified",
                    comment: review,
                    verified_analysis: editedAnalysis
                },
                status: 'verified'
            });
            showNotif("Meal log successfully verified", "success");
            
            // Premium Sequence: Close modal first, then update background data after animation
            setTimeout(() => {
                onClose();
                setTimeout(() => {
                    onReviewComplete?.();
                }, 300); // Wait for exit animation to complete
            }, 1000);
        } catch (err) {
            console.error("Failed to submit review", err);
            showNotif(err.response?.data?.message || "Failed to save review. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await api.patch(`/nutritionist/logs/${log.id}/review`, {
                nutritionist_review: {
                    title: "Review in Progress",
                    comment: review,
                    verified_analysis: editedAnalysis
                },
                status: 'reviewed'
            });
            showNotif("Progress saved successfully", "success");
            onReviewComplete?.(); // Refresh data in background
        } catch (err) {
            console.error("Failed to save draft", err);
            showNotif(err.response?.data?.message || "Failed to save progress", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await api.patch(`/nutritionist/logs/${log.id}/review`, {
                nutritionist_review: {
                    title: "Action Required",
                    comment: review || "Nutritionist requested correction/clarification.",
                    verified_analysis: editedAnalysis
                },
                status: 'rejected'
            });
            showNotif("Meal log rejected", "info");
            
            // Premium Sequence: Close modal first, then update background data after animation
            setTimeout(() => {
                onClose();
                setTimeout(() => {
                    onReviewComplete?.();
                }, 300); // Wait for exit animation to complete
            }, 1000);
        } catch (err) {
            console.error("Failed to reject log", err);
            showNotif(err.response?.data?.message || "Failed to process rejection", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (idx, field, value) => {
        const newItems = [...editedAnalysis.items];
        newItems[idx] = { ...newItems[idx], [field]: parseFloat(value) || 0 };

        // Recalculate totals with precision fix
        const total_calories_est = Math.round(newItems.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0));
        const macros_est = {
            protein_g: parseFloat(newItems.reduce((sum, item) => sum + (parseFloat(item.protein_g) || 0), 0).toFixed(1)),
            carbs_g: parseFloat(newItems.reduce((sum, item) => sum + (parseFloat(item.carbs_g) || 0), 0).toFixed(1)),
            fat_g: parseFloat(newItems.reduce((sum, item) => sum + (parseFloat(item.fat_g) || 0), 0).toFixed(1))
        };

        setEditedAnalysis(prev => ({
            ...prev,
            items: newItems,
            total_calories_est,
            macros_est
        }));
    };


    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: "spring",
                duration: 0.5,
                staggerChildren: 0.1
            }
        },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.3 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <AnimatePresence>
            <div key="modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden" onClick={(e) => {
                if (e.target === e.currentTarget) handleDismiss();
            }}>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full sm:max-w-6xl relative h-full sm:h-[90vh] flex shadow-2xl sm:rounded-[2.5rem] overflow-hidden border-0 sm:border-2 border-white/10 transition-all duration-500"
                >
                    {/* Left Side: Images & Profile (Dark Theme) */}
                    <div className="hidden lg:flex flex-col w-[30%] bg-zinc-950 border-r border-white/5 p-6 overflow-y-auto scrollbar-hide shrink-0">
                        <div className="flex flex-col gap-4 mb-6">
                            <motion.div
                                variants={itemVariants}
                                onClick={() => setPreviewImage(log.image_url)}
                                className="relative group rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg bg-zinc-900 aspect-video cursor-zoom-in"
                            >
                                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase z-10 border border-white/10">Before</span>
                                <img src={log.image_url} alt="Before" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                    <div className="bg-[var(--color-primary)] text-white p-2 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <Eye size={14} /> View
                                    </div>
                                </div>
                            </motion.div>
                            {log.image_after_url && (
                                <motion.div
                                    variants={itemVariants}
                                    onClick={() => setPreviewImage(log.image_after_url)}
                                    className="relative group rounded-2xl overflow-hidden border-2 border-white/10 shadow-lg bg-zinc-900 aspect-video cursor-zoom-in"
                                >
                                    <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase z-10 border border-white/10">After</span>
                                    <img src={log.image_after_url} alt="After" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Eye className="text-white" size={24} />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <motion.div variants={itemVariants} className="mt-auto space-y-4 bg-white/5 p-5 rounded-2xl border-2 border-white/10 backdrop-blur-sm">
                            <div className="flex justify-between items-center">
                                <h4 className="text-white font-black text-sm uppercase tracking-tight">Patient Profile</h4>
                                <span className="text-[10px] bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                                    {log.profile?.gender || 'N/A'} • {log.profile?.date_of_birth ? `${new Date().getFullYear() - new Date(log.profile.date_of_birth).getFullYear()}Y` : 'N/A'}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-white leading-none -mt-1">{log.child_name || 'Anonymous Patient'}</p>
                            {log.profile?.medical_history && (
                                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                    <p className="text-[10px] text-blue-400 font-black uppercase flex items-center gap-1 mb-1"><Info size={12} /> Medical History</p>
                                    <p className="text-xs text-blue-100/80 italic leading-relaxed">{log.profile.medical_history}</p>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 border-white/5">Allergies: {log.profile?.allergies?.join(', ') || 'None'}</span>
                                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 border-white/5 uppercase">Activity: {log.profile?.activity_level?.replace(/_/g, ' ') || 'N/A'}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Side: Review Dashboard (Light/Dark Theme) */}
                    <div className="flex-1 bg-[var(--color-bg-card)] flex flex-col relative overflow-hidden">
                        <motion.button
                            whileHover={{ rotate: 90, scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute right-4 top-4 lg:right-6 lg:top-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all z-50 bg-[var(--color-bg-card)]/80 backdrop-blur-md rounded-full p-2.5 shadow-xl border-2 border-[var(--color-divider)] flex items-center justify-center cursor-pointer"
                            aria-label="Close Modal"
                        >
                            <X size={18} />
                        </motion.button>

                        {/* #6: Sticky Glassmorphic Patient Header */}
                        <AnimatePresence>
                            {isScrolled && log && (
                                <motion.div
                                    initial={{ opacity: 0, y: -16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                    className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
                                >
                                    <div className="flex items-center gap-2.5 bg-[var(--color-bg-card)]/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-[var(--color-divider)] shadow-xl shadow-black/10 px-4 py-2 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse shrink-0" />
                                        <span className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-tight">
                                            {log.child_name || 'Patient'}
                                        </span>
                                        <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">
                                            {log.profile?.date_of_birth
                                                ? `${new Date().getFullYear() - new Date(log.profile.date_of_birth).getFullYear()}Y`
                                                : ''}
                                        </span>
                                        <div className="w-px h-3 bg-[var(--color-divider)]" />
                                        <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">
                                            {log.meal_category}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-0 lg:p-12 scrollbar-thin scrollbar-thumb-[var(--color-divider)] scrollbar-track-transparent">
                            {/* MOBILE ONLY: Compact Horizontal Image Swipe (Before & After) */}
                            <div className="relative flex lg:hidden flex-col w-full shrink-0 bg-zinc-950/5 border-b border-[var(--color-divider)]">
                                <div 
                                    onScroll={handleImageScroll}
                                    className="flex overflow-x-auto snap-x scrollbar-hide py-4 px-4 gap-4 bg-zinc-950/20 backdrop-blur-sm"
                                >
                                    <div className="relative shrink-0 w-[85%] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl snap-center transition-all active:scale-95">
                                        <img onClick={() => setPreviewImage(log.image_url)} src={log.image_url} alt="Before" className="w-full h-full object-cover cursor-zoom-in" />
                                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase z-10 border border-white/10 tracking-widest">Before</div>
                                    </div>
                                    
                                    {log.image_after_url && (
                                        <div className="relative shrink-0 w-[85%] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl snap-center transition-all active:scale-95">
                                            <img onClick={() => setPreviewImage(log.image_after_url)} src={log.image_after_url} alt="After" className="w-full h-full object-cover cursor-zoom-in" />
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase z-10 border border-white/10 tracking-widest">After / Leftovers</div>
                                            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Dynamic Page Dot Indicators (Visible only if after-meal image exists) */}
                                {log.image_after_url && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none">
                                        <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeImageIndex === 0 ? 'w-3.5 bg-white' : 'w-1.5 bg-white/40'}`} />
                                        <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeImageIndex === 1 ? 'w-3.5 bg-white' : 'w-1.5 bg-white/40'}`} />
                                    </div>
                                )}
                                
                                {/* Patient Quick Bar (Mobile) */}
                                <div className="px-5 py-4 bg-[var(--color-bg-card)]">
                                    <div className="flex justify-between items-center mb-1">
                                        <h2 className="text-xl font-black text-[var(--color-secondary)] leading-tight uppercase tracking-tight">{log.child_name || 'Patient'}</h2>
                                        <div className="flex gap-1">
                                            <span className="text-[9px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-[var(--color-primary)]/20">
                                                {log.profile?.gender?.[0] || 'N/A'} • {log.profile?.date_of_birth ? `${new Date().getFullYear() - new Date(log.profile.date_of_birth).getFullYear()}Y` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <Activity size={10} className="text-[var(--color-primary)]" /> 
                                            Allergies: <span className="text-red-500 truncate max-w-[120px]">{log.profile?.allergies?.join(', ') || 'None'}</span>
                                        </p>
                                        <p className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-tighter bg-[var(--color-primary)]/5 px-2 py-0.5 rounded-lg">
                                            {log.meal_category}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-5 lg:px-0 lg:py-0 space-y-4 sm:space-y-5">
                                {/* Allergen Warning Banner (Clinician View) */}
                                {detectedAllergens.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-red-600 text-white p-4 rounded-3xl shadow-xl flex items-center gap-4 mb-4"
                                    >
                                        <AlertTriangle size={24} className="animate-pulse text-red-200" />
                                        <div>
                                            <p className="font-black uppercase tracking-[0.2em] text-[9px] opacity-80">Clinical Allergen Alert</p>
                                            <p className="text-sm font-black uppercase tracking-tight">
                                                Matches Patient Allergies: {detectedAllergens.map(a => a.allergen).join(', ')}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div>
                                    <h2 className="text-xl sm:text-3xl font-black text-[var(--color-secondary)] tracking-tight mb-1.5 uppercase leading-tight">
                                        {log.meal_category === 'Other' ? 'Dietary' : log.meal_category || 'Meal'} Assessment
                                    </h2>
                                    <p className="text-[10px] sm:text-sm font-bold text-[var(--color-text-muted)] flex items-center gap-1.5 whitespace-nowrap">
                                        <Activity size={12} className="text-[var(--color-primary)] shrink-0" />
                                        Logged {new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(log.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {log.status === 'rejected' ? (
                                        <div className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black inline-flex items-center gap-1.5 border border-rose-200 dark:border-rose-500/30 shadow-sm uppercase">
                                            <AlertTriangle size={12} className="text-rose-500" /> Action Required
                                        </div>
                                    ) : log.status === 'pending' ? (
                                        <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black inline-flex items-center gap-1.5 border border-orange-200 dark:border-orange-500/30 shadow-sm uppercase animate-pulse">
                                            <AlertTriangle size={12} className="text-orange-500" /> Pending Review
                                        </div>
                                    ) : (log.status === 'verified' || log.status === 'reviewed') ? (
                                        <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-500/30 shadow-sm">
                                            <CheckCircle size={12} /> Clinically Verified
                                        </div>
                                    ) : log.is_parent_verified ? (
                                        <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black inline-flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-500/30 shadow-sm">
                                            <CheckCircle size={12} /> Verified by Caregiver
                                        </div>
                                    ) : null}
                                </div>
                            </motion.div>



                            {/* Metrics Grid */}
                            {/* #4: Plate Waste Donut Ring Card */}
                            <motion.div variants={itemVariants} className="bg-[var(--color-bg-page)] p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-divider)] shadow-lg shadow-black/5 flex items-center gap-4">
                                {/* Animated SVG Donut */}
                                <div className="relative shrink-0 w-16 h-16">
                                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                                        {/* Background track */}
                                        <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" className="stroke-[var(--color-divider)]" />
                                        {/* Animated fill */}
                                        <motion.circle
                                            cx="18" cy="18" r="14"
                                            fill="none"
                                            strokeWidth="3.5"
                                            stroke="var(--color-primary)"
                                            strokeLinecap="round"
                                            strokeDasharray="87.96"
                                            initial={{ strokeDashoffset: 87.96 }}
                                            animate={{ strokeDashoffset: 87.96 - (87.96 * ((editedAnalysis?.plate_waste ?? 100) / 100)) }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-sm font-black text-[var(--color-primary)] leading-none">{editedAnalysis?.plate_waste ?? 100}%</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
                                        <PieChart size={12} /> Consumption
                                    </p>
                                    {isEditing ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {[100, 75, 50, 25, 0].map(pct => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setEditedAnalysis(prev => ({ ...prev, plate_waste: pct }))}
                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-2 transition-all ${
                                                        (editedAnalysis?.plate_waste ?? 100) === pct
                                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                                            : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                                    }`}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-black text-[var(--color-text-main)] uppercase">
                                            {(editedAnalysis?.plate_waste ?? 100) === 100 ? 'Finished' :
                                             (editedAnalysis?.plate_waste ?? 100) >= 75 ? 'Mostly Eaten' :
                                             (editedAnalysis?.plate_waste ?? 100) >= 50 ? 'Half Eaten' :
                                             (editedAnalysis?.plate_waste ?? 100) >= 25 ? 'Little Eaten' : 'Not Eaten'}
                                        </p>
                                    )}
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
                                {[
                                    { icon: <Droplets size={16} />, label: "Water", value: log.water_ml ? `${log.water_ml}ml` : 'None', color: "#3b82f6" },
                                    { icon: <Info size={16} />, label: "Tools", value: log.serving_spoon_used ? 'Standard Spoon' : 'Estimated', color: "#6366f1" },
                                    { icon: <Activity size={16} />, label: "Exercise", value: log.physical_activity || 'None', color: "#f59e0b" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[var(--color-bg-page)] p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)] hover:shadow-xl transition-all shadow-lg shadow-black/5">
                                        <p className="text-xs font-black uppercase mb-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform" style={{ color: stat.color }}>
                                            {stat.icon} {stat.label}
                                        </p>
                                        <div className="text-sm sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">{stat.value}</div>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Food Analysis Table */}
                            <motion.div variants={itemVariants} className="bg-[var(--color-bg-page)] rounded-3xl p-4 sm:p-6 border-2 border-[var(--color-divider)] shadow-inner">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-[var(--color-text-main)] flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                        Nutritional Breakdown
                                    </h3>
                                    <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-black uppercase text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full hover:bg-[var(--color-primary)]/20 transition-all border-2 border-[var(--color-primary)]/20">
                                        {isEditing ? 'Save Changes' : 'Edit Calculations'}
                                    </button>
                                </div>

                                <div className="space-y-3 mb-5">
                                    {editedAnalysis?.items?.map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + (idx * 0.05) }}
                                            className={`bg-[var(--color-bg-card)] p-4 rounded-2xl border-2 border-[var(--color-divider)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all border-l-4 shadow-md shadow-black/5 hover:shadow-lg ${isEditing ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-l-[var(--color-primary)]'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm sm:text-base font-black text-[var(--color-text-main)] uppercase tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{item.name}</span>
                                                {allergies.some(a => {
                                                    const allergen = (a || "").toLowerCase().trim();
                                                    if (!allergen || allergen === 'none') return false;
                                                    const itemName = (item.name || "").toLowerCase().trim();
                                                    if (!itemName) return false;
                                                    
                                                    const allergenSingular = (allergen.length > 3 && allergen.endsWith('s')) 
                                                        ? allergen.slice(0, -1) 
                                                        : allergen;

                                                    return itemName.includes(allergen) || 
                                                           itemName.includes(allergenSingular) || 
                                                           allergen.includes(itemName) ||
                                                           allergenSingular.includes(itemName);
                                                }) && (
                                                    <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        <ShieldAlert size={10} /> Potential Allergen
                                                    </span>
                                                )}
                                                {item.cooking_method && (
                                                    <span className="text-[10px] font-black bg-[var(--color-bg-page)] text-[var(--color-primary)] px-2 py-1 rounded-md border border-[var(--color-primary)]/20 uppercase tracking-tight flex items-center gap-1.5 whitespace-normal break-words mt-1">
                                                        <ChefHat size={12} className="shrink-0" /> {item.cooking_method}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`grid grid-cols-2 sm:flex sm:gap-6 gap-x-2 gap-y-3 w-full sm:w-auto px-3 sm:px-4 py-3 sm:py-2 rounded-xl border-2 transition-all ${isEditing ? 'border-orange-200 dark:border-orange-900/50 bg-white dark:bg-orange-950/40 shadow-md' : 'border-[var(--color-divider)] bg-[var(--color-bg-page)] shadow-inner'}`}>
                                                {[
                                                    { key: 'calories', label: "Kcal", col: "#e11d48" },
                                                    { key: 'protein_g', label: "Pro", col: "#4f46e5" },
                                                    { key: 'carbs_g', label: "Carb", col: "#0d9488" },
                                                    { key: 'fat_g', label: "Fat", col: "#d97706" }
                                                ].map((macro, mi) => (
                                                    <div key={mi} className="flex flex-col items-center">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-0.5 sm:gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleItemChange(idx, macro.key, Math.max(0, parseFloat(item[macro.key] || 0) - (macro.key === 'calories' ? 10 : 1)))}
                                                                    className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
                                                                >
                                                                    <Minus size={10} strokeWidth={4} />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    value={item[macro.key]}
                                                                    onChange={(e) => handleItemChange(idx, macro.key, e.target.value)}
                                                                    className="w-7 sm:w-10 bg-transparent text-xs font-black text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                    style={{ color: macro.col }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleItemChange(idx, macro.key, parseFloat(item[macro.key] || 0) + (macro.key === 'calories' ? 10 : 1))}
                                                                    className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-colors shrink-0"
                                                                >
                                                                    <Plus size={10} strokeWidth={4} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-black" style={{ color: macro.col }}>
                                                                {parseFloat(Number(item[macro.key] || 0).toFixed(1))}
                                                                {macro.label !== "Kcal" ? 'g' : ''}
                                                            </span>
                                                        )}
                                                        <span className="text-[8px] font-black uppercase opacity-50 tracking-tighter" style={{ color: macro.col }}>{macro.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Summary Totals */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t-2 border-dashed border-[var(--color-divider)]">
                                    {[
                                        { val: editedAnalysis?.total_calories_est, label: "TOTAL KCAL", col: "#e11d48" },
                                        { val: macros.protein_g, label: "TOTAL PRO", col: "#4f46e5" },
                                        { val: macros.carbs_g, label: "TOTAL CARB", col: "#0d9488" },
                                        { val: macros.fat_g, label: "TOTAL FAT", col: "#d97706" }
                                    ].map((sum, si) => (
                                        <div key={si} className="text-center bg-[var(--color-bg-card)] rounded-2xl p-4 border-2 border-[var(--color-divider)] shadow-lg shadow-black/5 hover:translate-y-[-2px] transition-transform overflow-hidden" style={{ borderColor: `${sum.col}33` }}>
                                            <div className="text-lg sm:text-2xl font-black truncate" style={{ color: sum.col }}>
                                                {parseFloat(Number(sum.val || 0).toFixed(1))}
                                                {si > 0 ? 'g' : ''}
                                            </div>
                                            <div className="text-[10px] font-black tracking-widest uppercase opacity-60" style={{ color: sum.col }}>{sum.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {log.hidden_ingredients && (
                                <motion.div variants={itemVariants} className="bg-amber-500/10 dark:bg-amber-500/20 p-4 rounded-2xl border-2 border-amber-500/20 flex flex-col gap-2 mt-4 shadow-inner">
                                    <h3 className="text-[10px] font-black tracking-widest uppercase text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                        <ChefHat size={14} /> Caregiver Note: Hidden Ingredients
                                    </h3>
                                    <p className="text-sm font-bold text-[var(--color-text-main)] italic leading-relaxed">
                                        "{log.hidden_ingredients}"
                                    </p>
                                </motion.div>
                            )}

                            {/* AI Insights */}
                            {log.violation_details?.xai_feedback && (
                                <motion.div variants={itemVariants} className="bg-indigo-50/30 dark:bg-indigo-900/10 p-4 sm:p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group shadow-lg shadow-indigo-500/5">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                                    <h3 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                        <Activity size={14} className="animate-pulse" /> Clinical AI reasoning
                                    </h3>
                                    <p className="text-xs sm:text-base text-[var(--color-text-main)] italic font-bold leading-relaxed relative z-10">
                                        "{log.violation_details.xai_feedback}"
                                    </p>
                                </motion.div>
                            )}

                            {/* Professional Feedback */}
                            <motion.div variants={itemVariants} className="flex flex-col space-y-3">
                                <label className="text-xs sm:text-base font-black uppercase tracking-widest text-[var(--color-text-main)] flex items-center gap-3">
                                    <Edit2 size={16} className="text-[var(--color-primary)]" />
                                    Professional Evaluation
                                </label>
                                <textarea
                                    className="w-full min-h-[160px] p-4 sm:p-6 rounded-3xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-none shadow-xl shadow-black/5 custom-scrollbar"
                                    placeholder="Enter clinical recommendations, dietary adjustments, or caregiver feedback..."
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                />
                            </motion.div>
                            {/* Actions (Sticky Bar on Mobile) */}
                             <motion.div 
                                variants={itemVariants} 
                                className="sticky bottom-0 lg:static bg-[var(--color-bg-card)]/90 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none -mx-5 px-5 py-4 lg:mx-0 lg:px-0 lg:py-4 border-t lg:border-none border-[var(--color-divider)] space-y-2.5 lg:space-y-0 z-40"
                             >
                                {/* Primary: Verify Meal — full width on mobile, equal on desktop */}
                                <Button
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="w-full lg:hidden h-13 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-[var(--color-primary)]/40 hover:-translate-y-0.5 active:scale-95 transition-all border-none flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={15} />
                                    {loading ? 'Processing...' : 'Verify Meal'}
                                </Button>

                                {/* Secondary row on mobile / all buttons on desktop */}
                                <div className="flex gap-2 lg:gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={loading}
                                        className="flex-1 h-12 lg:h-13 rounded-2xl font-black uppercase tracking-widest text-[10px] lg:text-xs text-[var(--color-text-muted)] border-[var(--color-divider)] hover:bg-[var(--color-divider)]/60 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                        onClick={handleDismiss}
                                    >
                                        <X size={13} />
                                        Dismiss
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={loading}
                                        className="flex-1 h-12 lg:h-13 rounded-2xl bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-black uppercase tracking-widest text-[10px] lg:text-xs shadow-lg active:scale-95 transition-all border-none flex items-center justify-center gap-1.5"
                                        onClick={handleSaveDraft}
                                    >
                                        <Save size={13} />
                                        Draft
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={loading}
                                        className="flex-1 h-12 lg:h-13 rounded-2xl font-black uppercase tracking-widest text-[10px] lg:text-xs text-red-500 border-red-400/30 dark:border-red-500/40 hover:bg-red-500/10 dark:hover:bg-red-500/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                        onClick={handleReject}
                                    >
                                        <AlertTriangle size={13} />
                                        Reject
                                    </Button>
                                    {/* Verify — desktop only (hidden on mobile, shown above instead) */}
                                    <Button
                                        onClick={handleApprove}
                                        disabled={loading}
                                        className="hidden lg:flex flex-1 h-12 lg:h-13 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest text-[10px] lg:text-xs shadow-2xl shadow-[var(--color-primary)]/40 hover:-translate-y-0.5 active:scale-95 transition-all border-none items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle size={13} />
                                        {loading ? 'Processing...' : 'Verify Meal'}
                                    </Button>
                                </div>
                             </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            {/* Image Preview Overlay */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                        onWheel={(e) => {
                            const zoomDelta = e.deltaY * -0.002;
                            setZoomScale(s => Math.min(Math.max(0.5, s + zoomDelta), 4));
                        }}
                    >
                        {/* Hint pill */}
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-1.5 rounded-full z-[110] pointer-events-none">
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Flick up or down to dismiss</p>
                        </div>

                        {/* Zoom Controls */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex items-center gap-4 z-[110]">
                            <button onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <Minus size={18} />
                            </button>
                            <span className="text-white font-black text-xs min-w-[60px] text-center">{Math.round(zoomScale * 100)}%</span>
                            <button onClick={() => setZoomScale(s => Math.min(3, s + 0.25))} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <Plus size={18} />
                            </button>
                            <div className="w-[1px] h-6 bg-white/20 mx-2" />
                            <button onClick={() => { setZoomScale(1); setPreviewImage(null); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* #3: Draggable image — flick up/down to dismiss */}
                        <motion.div
                            drag
                            dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
                            dragElastic={0.2}
                            style={{ scale: zoomScale }}
                            className="relative cursor-grab active:cursor-grabbing"
                            onDragEnd={(_, info) => {
                                const { velocity, offset } = info;
                                // Dismiss if flicked fast enough OR dragged far enough vertically
                                if (Math.abs(velocity.y) > 500 || Math.abs(offset.y) > 160) {
                                    setZoomScale(1);
                                    setPreviewImage(null);
                                }
                            }}
                        >
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Notification
                key="modal-notif"
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                isDestructive={true}
            />
            </div>
        </AnimatePresence>
    );
}
