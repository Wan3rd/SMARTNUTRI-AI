import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Calendar, User, Trash2, Loader2, Activity, BadgeCheck, ShieldAlert, AlertTriangle, ChefHat, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import ConfirmDialog from './common/ConfirmDialog';
import Notification from './common/Notification';
import { useAuth } from '../context/AuthContext';
import { cn, formatValue } from '../lib/utils';
import api from '../lib/api';

export default function MealDetailModal({ log, onClose, onDelete, rules = [], allergies = [] }) {
    const { user } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [nutritionist, setNutritionist] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'error' });
    const [previewImage, setPreviewImage] = useState(null);

    // Editable state for parent resubmission
    const [isEditing, setIsEditing] = useState(false);
    const [editedConsumption, setEditedConsumption] = useState(log?.consumption_percent ?? 100);
    const [editedHiddenIngredients, setEditedHiddenIngredients] = useState(log?.hidden_ingredients || '');
    const [editedWater, setEditedWater] = useState(log?.water_ml ?? 0);
    const [editedSupplements, setEditedSupplements] = useState(log?.supplements || '');
    const [editedActivity, setEditedActivity] = useState(log?.physical_activity || '');
    const [editedCategory, setEditedCategory] = useState(log?.meal_category || 'Other');
    const [editedCookingMethod, setEditedCookingMethod] = useState(log?.cooking_method || 'Standard');
    const [editedImageAfter, setEditedImageAfter] = useState(null);
    const [editedImageAfterPreview, setEditedImageAfterPreview] = useState(log?.image_after_url || '');
    const [isResubmitting, setIsResubmitting] = useState(false);
    const fileAfterInputRef = React.useRef(null);

    // Robust normalization of allergies (handle strings from DB, arrays, or null)
    const allergyList = React.useMemo(() => {
        const sourceAllergies = (allergies && allergies.length > 0) ? allergies : (log.profile?.allergies || []);
        
        if (Array.isArray(sourceAllergies)) return sourceAllergies;
        if (typeof sourceAllergies === 'string' && sourceAllergies.length > 0) {
            if (sourceAllergies.startsWith('[') && sourceAllergies.endsWith(']')) {
                try { return JSON.parse(sourceAllergies); } catch (e) { return sourceAllergies.split(',').map(s => s.trim()); }
            }
            return sourceAllergies.split(',').map(s => s.trim());
        }
        return [];
    }, [allergies, log.profile?.allergies]);

    // --- Allergen Detection Logic ---
    const detectedAllergens = React.useMemo(() => {
        if (allergyList.length === 0 || (allergyList.length === 1 && allergyList[0].toLowerCase() === 'none')) return [];
        
        // Ensure analysis is an object
        let analysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
        if (typeof analysis === 'string') {
            try { analysis = JSON.parse(analysis); } catch (e) { analysis = {}; }
        }
        
        const items = analysis?.items || [];
        const found = [];

        items.forEach(item => {
            const itemName = (item.name || "").toLowerCase().trim();
            if (!itemName) return;

            allergyList.forEach(allergy => {
                const allergen = (allergy || "").toLowerCase().trim();
                if (!allergen || allergen === 'none') return;

                // Create a singular version for better matching (e.g., "Peanuts" -> "Peanut")
                const allergenSingular = (allergen.length > 3 && allergen.endsWith('s')) 
                    ? allergen.slice(0, -1) 
                    : allergen;

                // Robust matching:
                // 1. Exact or substring match (item: "Peanut butter", allergy: "Peanut")
                // 2. Singular match (item: "Peanut butter", allergy: "Peanuts" -> checks "Peanut")
                // 3. Reversed match (item: "Peanut", allergy: "Peanuts")
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
    }, [log, allergyList]);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto'; // Restore scrolling
        };
    }, [onClose]);

    React.useEffect(() => {
        if (log.status === 'reviewed' || log.status === 'verified' || log.status === 'rejected') {
            api.get('/auth/my-nutritionist')
                .then(res => setNutritionist(res.data))
                .catch(() => setNutritionist(null));
        }
    }, [log.status]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setEditedImageAfter(file);
            setEditedImageAfterPreview(URL.createObjectURL(file));
        }
    };

    const handleResubmit = async () => {
        setIsResubmitting(true);
        try {
            let uploadedImageUrl = editedImageAfterPreview;

            if (editedImageAfter) {
                const formData = new FormData();
                formData.append('image', editedImageAfter);
                const uploadRes = await api.post('/logs/upload', formData);
                uploadedImageUrl = uploadRes.data.image_url;
            }

            await api.patch(`/logs/${log.id}`, {
                consumption_percent: editedConsumption,
                hidden_ingredients: editedHiddenIngredients,
                water_ml: editedWater,
                supplements: editedSupplements,
                physical_activity: editedActivity,
                meal_category: editedCategory,
                cooking_method: editedCookingMethod,
                image_after_url: uploadedImageUrl
            });
            
            const successMsg = log.status === 'rejected' 
                ? "Meal log corrected and resubmitted successfully!" 
                : "Meal log updated successfully!";
            setNotif({ show: true, message: successMsg, type: 'success' });
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error(err);
            setNotif({ show: true, message: err.response?.data?.message || "Failed to save. Please try again.", type: 'error' });
            setIsResubmitting(false);
        }
    };

    if (!log) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/logs/${log.id}`);
            if (onDelete) {
                onDelete(log.id);
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            setNotif({ show: true, message: err.response?.data?.message || "Failed to delete log. Please try again.", type: 'error' });
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    const getComplianceBadge = (log, rules) => {
        let status = log.compliance_status || 'pending';
        
        // DYNAMIC OVERRIDE: If it was flagged, check if it now complies with updated rules
        if (status === 'flagged' && rules.length > 0) {
            const analysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
            if (analysis) {
                const totalKcal = analysis.nutrition?.calories || analysis.total_calories_est || 0;
                const kcalRule = rules.find(r => r.category?.toLowerCase() === 'calories' && r.rule_type === 'max');
                
                if (kcalRule && totalKcal <= parseFloat(kcalRule.rule_value)) {
                    // It was flagged, but the new rule is higher than the meal's kcal!
                    status = 'compliant';
                }
            }
        }

        const badges = {
            compliant: { color: 'bg-green-600 text-white dark:bg-green-500 dark:text-black shadow-md border-2 border-green-700/20', icon: CheckCircle2, label: 'Compliant' },
            flagged: { color: 'bg-red-600 text-white dark:bg-red-500 dark:text-black shadow-md border-2 border-red-700/20', icon: AlertCircle, label: 'Flagged' },
            pending: { color: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-black shadow-md border-2 border-orange-600/20', icon: Clock, label: 'Pending Analysis' }
        };
        return badges[status] || badges.pending;
    };

    const complianceBadge = getComplianceBadge(log, rules);
    const ComplianceIcon = complianceBadge.icon;

    return (
        <>
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in transition-all duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-[var(--color-bg-card)] sm:rounded-[2.5rem] shadow-2xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col relative transition-all duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {(isResubmitting || isDeleting) && (
                    <div className="fixed inset-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 select-none overflow-hidden">
                        {/* Ambient Glowing Orbs */}
                        <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[60px] animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />

                        {/* Dual Spinning Ring Spinner */}
                        <div className="relative flex items-center justify-center w-24 h-24">
                            {/* Outer Slow Ring */}
                            <div className="absolute inset-0 border-4 border-dashed border-[var(--color-primary)]/30 rounded-full animate-[spin_10s_linear_infinite]" />
                            {/* Middle Flowing Ring */}
                            <div className="absolute inset-2 border-4 border-t-[var(--color-primary)] border-r-[var(--color-secondary)] border-b-transparent border-l-transparent rounded-full animate-spin" />
                            {/* Inner Pulsing Core */}
                            <div className="absolute inset-4 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center shadow-inner">
                                <ChefHat className="text-[var(--color-primary)] animate-pulse" size={24} />
                            </div>
                        </div>

                        {/* Texts */}
                        <div className="text-center mt-8 space-y-3 max-w-xs z-10">
                            <h4 className="text-lg font-black text-[var(--color-secondary)] dark:text-white uppercase tracking-widest animate-pulse">
                                {isDeleting ? 'Deleting Meal Log...' : (log.status === 'rejected' ? 'Resubmitting Meal...' : 'Saving Changes...')}
                            </h4>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-relaxed">
                                {isDeleting 
                                    ? 'Removing clinical entry & updating records'
                                    : 'Processing corrections & syncing database'}
                            </p>
                            <div className="flex justify-center gap-1.5 pt-1">
                                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="sticky top-0 bg-[var(--color-bg-card)]/80 backdrop-blur-xl border-b border-[var(--color-divider)] p-6 flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Meal Details</h2>
                        <p className="text-[10px] sm:text-sm font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1 flex items-center gap-2 opacity-70">
                            <Calendar size={12} className="text-[var(--color-primary)]" />
                            {new Date(log.logged_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                            <span className="opacity-30">|</span>
                            {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 h-10 w-10">
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 space-y-3">
                    {/* Rejection Correction Alert Panel */}
                    {log.status === 'rejected' && (
                        <Card className="border-rose-200 dark:border-rose-950/50 bg-rose-50/30 dark:bg-rose-950/10 overflow-hidden shadow-md">
                            <div className="bg-rose-600 dark:bg-rose-800 px-4 py-2.5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <AlertCircle size={12} className="text-rose-200 animate-pulse" /> Correction Needed
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                    Clinician Request
                                </span>
                            </div>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl border-2 border-white dark:border-rose-900/50 overflow-hidden bg-white flex-shrink-0 shadow-md">
                                        {nutritionist?.profile_image_url ? (
                                            <img src={nutritionist.profile_image_url} alt="Nutri" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                                                <User size={24} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={cn("font-black text-[var(--color-text-main)] uppercase text-sm leading-none mb-1.5", user?.privacy_mode && "privacy-blur")}>
                                            {nutritionist?.full_name || 'Nutritionist'}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter bg-rose-100 dark:bg-rose-950/30 px-2 py-0.5 rounded-md">
                                                {nutritionist?.specialization || 'Clinical Expert'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-[var(--color-divider)]">
                                    <h4 className="font-black text-rose-700 dark:text-rose-400 text-base leading-tight uppercase tracking-tight">Clinician Feedback & Instructions</h4>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-full opacity-55" />
                                        <p className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed italic pl-5 py-1">
                                            "{log.nutritionist_review?.comment || 'Please adjust and resubmit details.'}"
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed flex items-start gap-2">
                                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                        A corrective action is required for this meal. Please review the feedback above, toggle Edit Mode using the button below to make the necessary adjustments, and resubmit.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Allergen Warning Banner */}
                    {detectedAllergens.length > 0 && (
                        <div className="bg-red-600 text-white p-4 rounded-3xl shadow-xl flex items-center gap-4 animate-pulse">
                            <ShieldAlert size={28} className="text-red-200" />
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px] opacity-80">Safety Alert</p>
                                <p className="text-sm font-black uppercase tracking-tight">
                                    Contains Potential Allergen: {detectedAllergens.map(a => a.allergen).join(', ')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Meal Comparison View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Before Meal</p>
                            <div
                                className="relative rounded-2xl overflow-hidden bg-[var(--color-bg-page)] border border-[var(--color-divider)] shadow-inner group cursor-zoom-in"
                                onClick={() => setPreviewImage(log.image_url)}
                            >
                                <img
                                    src={log.image_url}
                                    alt="Before"
                                    className="w-full h-48 sm:h-64 object-cover transition-transform group-hover:scale-105 duration-700"
                                />
                                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${complianceBadge.color} flex items-center gap-1.5 shadow-lg`}>
                                        <ComplianceIcon size={12} />
                                        {complianceBadge.label}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                                    <div className="bg-black/60 backdrop-blur-md text-white p-1.5 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                        <Eye size={12} /> Preview
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">After Meal / Leftovers</p>
                            {isEditing ? (
                                <div className="relative rounded-2xl overflow-hidden bg-[var(--color-bg-page)] border border-dashed border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] transition-all flex flex-col items-center justify-center h-48 sm:h-64 w-full p-4 group">
                                    {editedImageAfterPreview ? (
                                        <>
                                            <img
                                                src={editedImageAfterPreview}
                                                alt="After Preview"
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col gap-2 items-center justify-center transition-opacity z-10">
                                                <Button
                                                    size="sm"
                                                    onClick={() => fileAfterInputRef.current?.click()}
                                                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white font-black text-[9px] uppercase tracking-widest h-8 px-4 rounded-xl shadow-lg border border-[var(--color-primary)]/20"
                                                >
                                                    Change Photo
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => { setEditedImageAfter(null); setEditedImageAfterPreview(''); }}
                                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-widest h-8 px-4 rounded-xl shadow-lg border border-rose-500/20"
                                                >
                                                    Remove Photo
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div 
                                            onClick={() => fileAfterInputRef.current?.click()}
                                            className="flex flex-col items-center justify-center gap-3 cursor-pointer w-full h-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                                        >
                                            <div className="h-12 w-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Activity size={20} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-center">Upload After-Meal Photo</p>
                                            <p className="text-[8px] text-[var(--color-text-muted)] text-center max-w-[160px]">Helps clinicians review plate waste accurately</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileAfterInputRef} 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                        accept="image/*" 
                                    />
                                </div>
                            ) : (
                                <div
                                    className={`relative rounded-2xl overflow-hidden bg-[var(--color-bg-page)] border border-[var(--color-divider)] shadow-inner group flex items-center justify-center transition-all duration-300 ${log.image_after_url ? 'h-48 sm:h-64 w-full cursor-zoom-in' : 'h-16 sm:h-64 w-full'}`}
                                    onClick={() => log.image_after_url && setPreviewImage(log.image_after_url)}
                                >
                                    {log.image_after_url ? (
                                        <>
                                            <img
                                                src={log.image_after_url}
                                                alt="After"
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                            />
                                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                                                <div className="bg-black/60 backdrop-blur-md text-white p-1.5 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                                    <Eye size={12} /> Preview
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex sm:flex-col items-center justify-center gap-2 sm:gap-3 p-4">
                                            <div className="h-8 w-8 sm:h-12 sm:w-12 bg-gray-100 dark:bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-gray-400 flex-shrink-0">
                                                <Activity size={16} />
                                            </div>
                                            <p className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tight">No After-Meal Photo</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Category</p>
                            {isEditing ? (
                                <select
                                    value={editedCategory}
                                    onChange={(e) => setEditedCategory(e.target.value)}
                                    className="w-full bg-[var(--color-bg-card)] text-xs font-black text-[var(--color-text-main)] uppercase border border-[var(--color-divider)] rounded-xl px-2 py-1.5 focus:border-[var(--color-primary)] outline-none"
                                >
                                    {['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Other'].map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">{log.meal_category || 'Other'}</p>
                            )}
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Water Intake</p>
                            {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={editedWater}
                                        onChange={(e) => setEditedWater(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-full bg-[var(--color-bg-card)] text-xs font-black text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl px-2 py-1 focus:border-[var(--color-primary)] outline-none"
                                    />
                                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">ML</span>
                                </div>
                            ) : (
                                <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">{log.water_ml || 0} ML</p>
                            )}
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Caregiver Reported</p>
                            {isEditing ? (
                                <select
                                    value={editedConsumption}
                                    onChange={(e) => setEditedConsumption(parseInt(e.target.value))}
                                    className="w-full bg-[var(--color-bg-card)] text-xs font-black text-[var(--color-text-main)] uppercase border border-[var(--color-divider)] rounded-xl px-2 py-1.5 focus:border-[var(--color-primary)] outline-none"
                                >
                                    <option value={100}>Finished (100%)</option>
                                    <option value={75}>Mostly (75%)</option>
                                    <option value={50}>Half (50%)</option>
                                    <option value={25}>A Little (25%)</option>
                                    <option value={0}>None (0%)</option>
                                </select>
                            ) : (
                                <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">
                                    {log.consumption_percent === 100 ? 'Finished (100%)' : 
                                     log.consumption_percent === 75 ? 'Mostly (75%)' : 
                                     log.consumption_percent === 50 ? 'Half (50%)' : 
                                     log.consumption_percent === 25 ? 'A Little (25%)' : 
                                     log.consumption_percent === 0 ? 'None (0%)' : 
                                     'Finished (100%)'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Additional Details */}
                    {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">Hidden Add-ons</h4>
                                <textarea
                                    value={editedHiddenIngredients}
                                    onChange={(e) => setEditedHiddenIngredients(e.target.value)}
                                    placeholder="Enter hidden oils, sugars, sauces, or other details..."
                                    rows={2}
                                    className="w-full bg-[var(--color-bg-page)] text-xs font-medium text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2 focus:border-amber-500 outline-none resize-none"
                                />
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest mb-2">Supplements</h4>
                                <textarea
                                    value={editedSupplements}
                                    onChange={(e) => setEditedSupplements(e.target.value)}
                                    placeholder="Enter any supplements consumed..."
                                    rows={2}
                                    className="w-full bg-[var(--color-bg-page)] text-xs font-medium text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2 focus:border-blue-500 outline-none resize-none"
                                />
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest mb-2">Physical Activity</h4>
                                <textarea
                                    value={editedActivity}
                                    onChange={(e) => setEditedActivity(e.target.value)}
                                    placeholder="Enter any related physical activity details..."
                                    rows={2}
                                    className="w-full bg-[var(--color-bg-page)] text-xs font-medium text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2 focus:border-emerald-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(log.hidden_ingredients || log.consumption_percent !== 100) && (
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                    <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">Hidden Add-ons / Edits</h4>
                                    <p className="text-xs text-amber-900/80 dark:text-amber-200/80 font-medium leading-relaxed">
                                        {log.hidden_ingredients || "No extra ingredients reported."}
                                        {log.consumption_percent !== 100 && ` (Consumption adjusted to ${log.consumption_percent}%)`}
                                    </p>
                                </div>
                            )}
                            {log.supplements && (
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest mb-2">Supplements</h4>
                                    <p className="text-xs text-blue-900/80 dark:text-blue-200/80 font-medium leading-relaxed">{log.supplements}</p>
                                </div>
                            )}
                            {log.physical_activity && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                    <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest mb-2">Physical Activity</h4>
                                    <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 font-medium leading-relaxed">{log.physical_activity}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Analysis Content (Verified vs AI) */}
                    {(() => {
                        const isVerified = (log.status === 'reviewed' || log.status === 'verified' || log.status === 'rejected') && log.nutritionist_review?.verified_analysis;
                        const displayAnalysis = isVerified ? log.nutritionist_review.verified_analysis : log.ai_analysis;
                        const nutrition = displayAnalysis?.nutrition || displayAnalysis?.macros_est || {};
                        const items = displayAnalysis?.items || [];
                        
                        if (!displayAnalysis) return null;

                        return (
                            <Card className={isVerified ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10"}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className={isVerified ? "text-emerald-700 dark:text-emerald-300 flex items-center gap-2" : "text-blue-700 dark:text-blue-300 flex items-center gap-2"}>
                                            <Activity size={18} />
                                            {isVerified ? "Clinical Verified Analysis" : "AI Predicted Analysis"}
                                        </CardTitle>
                                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">
                                            {isVerified ? "Expert Verified" : "Initial Scan"}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Food Items */}
                                    {items.length > 0 && (
                                        <div>
                                            <h4 className="font-black text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Detected Food Items</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {items.map((item, idx) => (
                                                    <div key={idx} className="bg-[var(--color-bg-page)] p-3 rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                            <div className="flex flex-col">
                                                                <p className="font-black text-sm text-[var(--color-secondary)] uppercase tracking-tight">
                                                                    {item.name}
                                                                </p>
                                                                {allergyList.some(a => {
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
                                                                        <AlertTriangle size={10} /> Allergen Alert
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums uppercase">
                                                                {formatValue(item.calories, user?.nutrient_precision)} KCAL
                                                            </span>
                                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1 uppercase">
                                                            {item.measure_qty || 1} {item.serving_unit || 'Serving'}
                                                        </p>
                                                         <div className="flex flex-wrap gap-x-2 xs:gap-x-4 sm:gap-x-5 gap-y-1 text-[9px] xs:text-[10px] sm:text-xs mt-2.5 font-black border-t border-[var(--color-divider)] pt-2">
                                                             <span className="whitespace-nowrap text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Protein: {formatValue(item.protein_g, user?.nutrient_precision)}g</span>
                                                             <span className="whitespace-nowrap text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Carbs: {formatValue(item.carbs_g, user?.nutrient_precision)}g</span>
                                                             <span className="whitespace-nowrap text-orange-600 dark:text-orange-400 uppercase tracking-tighter">Fat: {formatValue(item.fat_g, user?.nutrient_precision)}g</span>
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Totals */}
                                    <div className="pt-2 border-t border-[var(--color-divider)] border-dashed">
                                        <h4 className="font-black text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Nutritional Summation</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { val: nutrition.calories || displayAnalysis.total_calories_est, label: "Kcal", col: "var(--color-primary)" },
                                                { val: nutrition.protein || nutrition.protein_g, label: "Protein", col: "#2563eb" },
                                                { val: nutrition.carbs || nutrition.carbs_g, label: "Carbs", col: "#059669" },
                                                { val: nutrition.fat || nutrition.fat_g, label: "Fat", col: "#ea580c" }
                                            ].map((stat, si) => (
                                                <div key={si} className="bg-[var(--color-bg-page)] p-3.5 sm:p-4 rounded-2xl text-center border border-[var(--color-divider)] shadow-sm">
                                                    <p className="text-xl sm:text-2xl font-black tabular-nums leading-none mb-1 uppercase" style={{ color: stat.col }}>
                                                        {formatValue(stat.val, user?.nutrient_precision)}{si > 0 ? 'g' : ''}
                                                    </p>
                                                    <p className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">{stat.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* AI Comments */}
                                    {displayAnalysis.comment && (
                                        <div className="bg-[var(--color-bg-page)] p-4 rounded-2xl border border-[var(--color-divider)] shadow-inner">
                                            <p className="text-sm text-[var(--color-text-main)] italic font-medium opacity-80 leading-relaxed">
                                                "{displayAnalysis.comment}"
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })()}

                    {/* Nutritionist Review */}
                    {(log.status === 'reviewed' || log.status === 'verified') && log.nutritionist_review && (
                        <Card className="border-[var(--color-divider)] dark:border-green-900/30 bg-emerald-50/30 dark:bg-green-900/10 overflow-hidden shadow-sm">
                            <div className="bg-emerald-600 dark:bg-emerald-800 px-4 py-2.5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <BadgeCheck size={12} className="text-emerald-300" /> Clinical Evaluation
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                    Verified Record
                                </span>
                            </div>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl border-2 border-white dark:border-emerald-900/50 overflow-hidden bg-white flex-shrink-0 shadow-md">
                                        {nutritionist?.profile_image_url ? (
                                            <img src={nutritionist.profile_image_url} alt="Nutri" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                                                <User size={24} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={cn("font-black text-[var(--color-text-main)] uppercase text-sm leading-none mb-1.5", user?.privacy_mode && "privacy-blur")}>
                                            {nutritionist?.full_name || 'Nutritionist'}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-tighter bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md">
                                                {nutritionist?.specialization || 'Clinical Expert'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-[var(--color-divider)]">
                                    <h4 className="font-black text-[var(--color-text-main)] text-xl leading-tight uppercase tracking-tight">{log.nutritionist_review.title}</h4>
                                    <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)] rounded-full opacity-30" />
                                        <p className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed italic pl-5 py-1">
                                            "{log.nutritionist_review.comment}"
                                        </p>
                                    </div>
                                </div>
                                {log.nutritionist_review.recommendations && (
                                    <div className="bg-white dark:bg-black/20 p-5 rounded-2xl border-2 border-[var(--color-divider)] shadow-sm">
                                        <p className="text-[10px] font-black text-[var(--color-primary)] uppercase mb-3 tracking-[0.2em]">Therapeutic Action Plan</p>
                                        <p className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed">{log.nutritionist_review.recommendations}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Compliance Violations */}
                    {log.compliance_status === 'flagged' && log.violation_details && log.violation_details.length > 0 && (
                        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
                            <CardHeader>
                                <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                                    <AlertCircle size={18} /> Rule Violations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                    {/* XAI Clinical Reasoning */}
                                    {log.violation_details.xai_feedback && (
                                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Activity size={14} className="animate-pulse" /> Clinical AI Reasoning
                                            </p>
                                            <p className="text-sm text-[var(--color-text-main)] italic font-bold leading-relaxed">
                                                "{log.violation_details.xai_feedback}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Specific Rule Breaches */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(log.violation_details.violations || []).map((violation, idx) => (
                                            <div key={idx} className="bg-[var(--color-bg-page)] p-3 rounded-xl border border-red-200 dark:border-red-900/50 flex flex-col justify-between">
                                                <div>
                                                    <p className="font-black text-red-700 dark:text-red-300 text-[10px] uppercase tracking-tight mb-1">{violation.rule || violation.rule_name}</p>
                                                    <p className="text-xs font-black text-[var(--color-text-main)]">
                                                        {violation.actual} <span className="text-[10px] opacity-50">vs</span> {violation.limit}
                                                    </p>
                                                </div>
                                                {violation.meal_addition && (
                                                    <p className="text-[9px] font-bold text-red-500/70 mt-2 uppercase">
                                                        +{violation.meal_addition} from this meal
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pending Review Notice */}
                    {log.status === 'pending' && (
                        <Card className="border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Clock size={20} className="text-orange-600" />
                                    <div>
                                        <p className="font-bold text-orange-700 dark:text-orange-300">Awaiting Nutritionist Review</p>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                            Your nutritionist will review this meal soon and provide personalized feedback.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[var(--color-bg-card)]/80 backdrop-blur-xl border-t border-[var(--color-divider)] p-6 flex flex-col sm:flex-row gap-3 sm:justify-between items-center w-full z-10">
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start">
                        <Button
                            variant="none"
                            className="w-full sm:w-auto h-12 sm:h-11 rounded-2xl border-2 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 bg-rose-50/10 dark:bg-rose-950/15 hover:bg-rose-100/70 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-300 shadow-sm font-black uppercase tracking-widest text-[10px]"
                            onClick={() => setShowConfirm(true)}
                            disabled={isDeleting || isResubmitting}
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
                            Delete Meal
                        </Button>
                        
                        {user?.role === 'parent' && (log.status === 'rejected' || log.status === 'pending') && !isEditing && (
                            <Button
                                variant="none"
                                className="w-full sm:w-auto h-12 sm:h-11 rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 bg-amber-50/10 dark:bg-amber-900/15 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 shadow-sm font-black uppercase tracking-widest text-[10px]"
                                onClick={() => setIsEditing(true)}
                            >
                                {log.status === 'rejected' ? 'Correct Details' : 'Edit Details'}
                            </Button>
                        )}

                        {isEditing && (
                            <Button
                                variant="none"
                                className="w-full sm:w-auto h-12 sm:h-11 rounded-2xl border-2 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 bg-gray-50/10 dark:bg-zinc-900/20 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-800 dark:hover:text-white shadow-sm font-black uppercase tracking-widest text-[10px]"
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset edit states to originals
                                    setEditedConsumption(log.consumption_percent ?? 100);
                                    setEditedHiddenIngredients(log.hidden_ingredients || '');
                                    setEditedWater(log.water_ml ?? 0);
                                    setEditedSupplements(log.supplements || '');
                                    setEditedActivity(log.physical_activity || '');
                                    setEditedCategory(log.meal_category || 'Other');
                                    setEditedCookingMethod(log.cooking_method || 'Standard');
                                    setEditedImageAfter(null);
                                    setEditedImageAfterPreview(log.image_after_url || '');
                                }}
                            >
                                Cancel Edits
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {isEditing ? (
                            <Button
                                variant="none"
                                className="w-full sm:w-auto h-12 sm:h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 flex items-center justify-center animate-pulse px-10"
                                onClick={handleResubmit}
                                disabled={isResubmitting}
                            >
                                {isResubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-2" />
                                        {log.status === 'rejected' ? 'Resubmitting...' : 'Saving...'}
                                    </>
                                ) : (
                                    log.status === 'rejected' ? "Save & Resubmit" : "Save Changes"
                                )}
                            </Button>
                        ) : (
                            <Button
                                className="w-full sm:w-auto h-12 sm:h-11 rounded-2xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] px-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                                onClick={onClose}
                            >
                                Close Details
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Meal Log"
                message="Are you sure you want to permanently delete this meal log? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
                loading={isDeleting}
            />

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />
        </div>

            {/* Image Preview Lightbox */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white p-2.5 rounded-full transition-all z-10"
                    >
                        <X size={20} />
                    </button>
                    {/* Hint */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-1.5 rounded-full pointer-events-none">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Tap anywhere to close</p>
                    </div>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl select-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
