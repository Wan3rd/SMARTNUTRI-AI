import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, CheckCircle, AlertTriangle, Save, Edit2, Info, ChefHat, Eye, EyeOff, Activity, Droplets, Pill, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function ReviewLogModal({ isOpen, onClose, log, onReviewComplete }) {
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState('');
    const [editedAnalysis, setEditedAnalysis] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);

    useEffect(() => {
        if (log) {
            setReview(log.nutritionist_review?.comment || '');
            setEditedAnalysis(log.ai_analysis || { items: [], total_calories_est: 0, macros_est: { protein_g: 0, carbs_g: 0, fat_g: 0 } });
        }
    }, [log]);

    if (!isOpen || !log) return null;

    const handleApprove = async () => {
        setLoading(true);
        try {
            await api.patch(`/nutritionist/logs/${log.id}/review`, {
                nutritionist_review: {
                    title: "Nutritionist Verified", 
                    comment: review,
                    verified_analysis: editedAnalysis
                },
                status: 'reviewed'
            });
            onReviewComplete();
            onClose();
        } catch (err) {
            console.error("Failed to submit review", err);
            alert("Failed to save review. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (idx, field, value) => {
        const newItems = [...editedAnalysis.items];
        newItems[idx] = { ...newItems[idx], [field]: parseFloat(value) || 0 };
        
        // Recalculate totals
        const total_calories_est = newItems.reduce((sum, item) => sum + (parseFloat(item.calories) || 0), 0);
        const macros_est = {
            protein_g: newItems.reduce((sum, item) => sum + (parseFloat(item.protein_g) || 0), 0),
            carbs_g: newItems.reduce((sum, item) => sum + (parseFloat(item.carbs_g) || 0), 0),
            fat_g: newItems.reduce((sum, item) => sum + (parseFloat(item.fat_g) || 0), 0)
        };

        setEditedAnalysis(prev => ({
            ...prev,
            items: newItems,
            total_calories_est,
            macros_est
        }));
    };

    const macros = editedAnalysis?.macros_est || {};

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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-6xl relative h-[90vh] flex shadow-2xl rounded-3xl overflow-hidden border-2 border-white/10"
                >
                    {/* Left Side: Images & Profile (Dark Theme) */}
                    <div className="hidden lg:flex flex-col w-[30%] bg-zinc-950 border-r border-white/5 p-6 overflow-y-auto scrollbar-hide">
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
                                <h4 className="text-white font-black text-base">Child Profile: {log.child_name}</h4>
                                <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">{log.profile?.gender}, {new Date().getFullYear() - new Date(log.profile?.date_of_birth).getFullYear()}y</span>
                            </div>
                            {log.profile?.medical_history && (
                                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                    <p className="text-[10px] text-blue-400 font-black uppercase flex items-center gap-1 mb-1"><Info size={12} /> Medical History</p>
                                    <p className="text-xs text-blue-100/80 italic leading-relaxed">"{log.profile.medical_history}"</p>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 border-white/5">Allergies: {log.profile?.allergies?.join(', ') || 'None'}</span>
                                <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 border-white/5">Activity: {log.profile?.activity_level}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Side: Review Dashboard (Light/Dark Theme) */}
                    <div className="flex-1 bg-[var(--color-bg-card)] flex flex-col relative overflow-hidden">
                        <motion.button
                            whileHover={{ rotate: 90, scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute right-6 top-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all z-50 bg-[var(--color-bg-page)] rounded-full p-2 shadow-lg border-2 border-[var(--color-divider)]"
                        >
                            <X size={20} />
                        </motion.button>

                        <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 scrollbar-thin scrollbar-thumb-[var(--color-divider)] scrollbar-track-transparent">
                            <motion.div variants={itemVariants} className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-[var(--color-secondary)] tracking-tight mb-2 uppercase">
                                        {log.meal_category === 'Other' ? 'Dietary' : log.meal_category || 'Meal'} Assessment
                                    </h2>
                                    <p className="text-sm font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                        <Activity size={14} className="text-[var(--color-primary)]" />
                                        Logged {new Date(log.logged_at).toLocaleString()}
                                    </p>
                                </div>
                                {log.is_parent_verified && (
                                    <div className="bg-[#86bf9a]/20 text-[#065f46] px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-[#86bf9a]/30 shadow-sm">
                                        <CheckCircle size={14} /> VERIFIED BY CAREGIVER
                                    </div>
                                )}
                            </motion.div>

                            {/* Metrics Grid */}
                            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { icon: <PieChart size={16} />, label: "Consumption", value: editedAnalysis?.plate_waste !== undefined ? `${editedAnalysis.plate_waste}%` : 'Unspecified', color: "var(--color-primary)" },
                                    { icon: <EyeOff size={16} />, label: "Hidden", value: log.hidden_ingredients || 'None', color: "#a855f7" },
                                    { icon: <Droplets size={16} />, label: "Water", value: log.water_ml ? `${log.water_ml}ml` : 'None', color: "#3b82f6" },
                                    { icon: <Pill size={16} />, label: "Supplements", value: log.supplements || 'None', color: "#10b981" },
                                    { icon: <Activity size={16} />, label: "Exercise", value: log.physical_activity || 'None', color: "#f59e0b" }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[var(--color-bg-page)] p-4 rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)] transition-all shadow-sm">
                                        <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] mb-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform" style={{ color: stat.color }}>
                                            {stat.icon} {stat.label}
                                        </p>
                                        <p className="text-sm font-black text-[var(--color-text-main)] uppercase">{stat.value}</p>
                                    </div>
                                ))}
                            </motion.div>

                            {/* Food Analysis Table */}
                            <motion.div variants={itemVariants} className="bg-[var(--color-bg-page)] rounded-3xl p-6 border-2 border-[var(--color-divider)] shadow-inner">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-[var(--color-text-main)] flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                        Nutritional Breakdown
                                    </h3>
                                    <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-black uppercase text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full hover:bg-[var(--color-primary)]/20 transition-all border-2 border-[var(--color-primary)]/20">
                                        {isEditing ? 'Save Changes' : 'Edit Calculations'}
                                    </button>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {editedAnalysis?.items?.map((item, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + (idx * 0.05) }}
                                            className={`bg-[var(--color-bg-card)] p-4 rounded-2xl border-2 border-[var(--color-divider)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all border-l-4 ${isEditing ? 'border-l-orange-500 bg-orange-50/5' : 'border-l-[var(--color-primary)]'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{item.name}</span>
                                                <div className="flex gap-2 mt-1">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1 bg-[var(--color-bg-page)] rounded-md border border-orange-200 px-1.5 py-0.5">
                                                            <input 
                                                                type="number" 
                                                                value={item.weight_g} 
                                                                onChange={(e) => handleItemChange(idx, 'weight_g', e.target.value)}
                                                                className="w-12 bg-transparent text-[10px] font-black focus:outline-none"
                                                            />
                                                            <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter">g Weight</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black bg-[var(--color-bg-page)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md border-2 border-[var(--color-divider)] uppercase tracking-tighter">{item.weight_g || 0}g WEIGHT</span>
                                                    )}
                                                    {item.cooking_method && (
                                                        <span className="text-[10px] font-black bg-[var(--color-bg-page)] text-[var(--color-primary)] px-2 py-1 rounded-md border border-[var(--color-primary)]/20 uppercase tracking-tight flex items-center gap-1.5 whitespace-normal break-words">
                                                            <ChefHat size={12} className="shrink-0" /> {item.cooking_method}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`flex gap-3 sm:gap-6 px-4 py-2 rounded-xl border-2 transition-all ${isEditing ? 'border-orange-200 bg-white shadow-md' : 'border-[var(--color-divider)] bg-[var(--color-bg-page)] shadow-inner'}`}>
                                                {[
                                                    { key: 'calories', label: "Kcal", col: "#e11d48" },
                                                    { key: 'protein_g', label: "Pro", col: "#4f46e5" },
                                                    { key: 'carbs_g', label: "Carb", col: "#0d9488" },
                                                    { key: 'fat_g', label: "Fat", col: "#d97706" }
                                                ].map((macro, mi) => (
                                                    <div key={mi} className="flex flex-col items-center">
                                                        {isEditing ? (
                                                            <input 
                                                                type="number" 
                                                                value={item[macro.key]} 
                                                                onChange={(e) => handleItemChange(idx, macro.key, e.target.value)}
                                                                className="w-10 bg-transparent text-xs font-black text-center focus:outline-none"
                                                                style={{ color: macro.col }}
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-black" style={{ color: macro.col }}>{item[macro.key] || 0}{macro.label !== "Kcal" ? 'g' : ''}</span>
                                                        )}
                                                        <span className="text-[8px] font-black uppercase opacity-50 tracking-tighter" style={{ color: macro.col }}>{macro.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Summary Totals */}
                                <div className="grid grid-cols-4 gap-3 pt-6 border-t-2 border-dashed border-[var(--color-divider)]">
                                    {[
                                        { val: editedAnalysis?.total_calories_est, label: "TOTAL KCAL", col: "#e11d48" },
                                        { val: macros.protein_g, label: "TOTAL PRO", col: "#4f46e5" },
                                        { val: macros.carbs_g, label: "TOTAL CARB", col: "#0d9488" },
                                        { val: macros.fat_g, label: "TOTAL FAT", col: "#d97706" }
                                    ].map((sum, si) => (
                                        <div key={si} className="text-center bg-[var(--color-bg-card)] rounded-2xl p-3 border-2 border-[var(--color-divider)] shadow-sm hover:translate-y-[-2px] transition-transform" style={{ borderColor: `${sum.col}33` }}>
                                            <div className="text-lg font-black" style={{ color: sum.col }}>{sum.val || 0}{si > 0 ? 'g' : ''}</div>
                                            <div className="text-[8px] font-black tracking-widest uppercase opacity-60" style={{ color: sum.col }}>{sum.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* AI Insights */}
                            {log.violation_details?.xai_feedback && (
                                <motion.div variants={itemVariants} className="bg-indigo-50/30 dark:bg-indigo-900/10 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                                    <h3 className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                        <Activity size={14} className="animate-pulse" /> Clinical AI reasoning
                                    </h3>
                                    <p className="text-sm text-[var(--color-text-main)] italic font-bold leading-relaxed relative z-10">
                                        "{log.violation_details.xai_feedback}"
                                    </p>
                                </motion.div>
                            )}

                            {/* Professional Feedback */}
                            <motion.div variants={itemVariants} className="flex flex-col space-y-3">
                                <label className="text-sm font-black uppercase tracking-widest text-[var(--color-text-main)] flex items-center gap-3">
                                    <Edit2 size={16} className="text-[var(--color-primary)]" /> 
                                    Professional Evaluation
                                </label>
                                <textarea
                                    className="w-full min-h-[160px] p-6 rounded-3xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all resize-none shadow-inner custom-scrollbar"
                                    placeholder="Enter clinical recommendations, dietary adjustments, or caregiver feedback..."
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                />
                            </motion.div>

                            {/* Actions */}
                            <motion.div variants={itemVariants} className="flex gap-4 pt-4 pb-8">
                                <Button type="button" variant="outline" className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[var(--color-text-muted)] border-[var(--color-divider)] hover:bg-[var(--color-bg-page)] transition-all" onClick={onClose}>
                                    Dismiss
                                </Button>
                                <Button 
                                    onClick={handleApprove} 
                                    className="flex-[2] py-4 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/40 hover:-translate-y-1 transition-all border-none" 
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Approve & Finalize Review'}
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Image Preview Overlay */}
            <AnimatePresence>
                {previewImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                    >
                        {/* Zoom Controls */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex items-center gap-4 z-[110]">
                            <button onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <Activity size={20} className="rotate-180" /> {/* Zoom Out Mockup */}
                            </button>
                            <span className="text-white font-black text-xs min-w-[60px] text-center">{Math.round(zoomScale * 100)}%</span>
                            <button onClick={() => setZoomScale(s => Math.min(3, s + 0.25))} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <Activity size={20} /> {/* Zoom In Mockup */}
                            </button>
                            <div className="w-[1px] h-6 bg-white/20 mx-2" />
                            <button onClick={() => { setZoomScale(1); setPreviewImage(null); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <motion.div 
                            drag
                            dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                            style={{ scale: zoomScale }}
                            className="relative cursor-grab active:cursor-grabbing"
                        >
                            <img 
                                src={previewImage} 
                                alt="Preview"
                                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl pointer-events-none"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
