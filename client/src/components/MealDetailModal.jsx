import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Calendar, User, Trash2, Loader2, Activity, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import ConfirmDialog from './common/ConfirmDialog';
import api from '../lib/api';

export default function MealDetailModal({ log, onClose, onDelete }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [nutritionist, setNutritionist] = useState(null);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    React.useEffect(() => {
        if (log.status === 'reviewed') {
            api.get('/auth/my-nutritionist')
                .then(res => setNutritionist(res.data))
                .catch(() => setNutritionist(null));
        }
    }, [log.status]);

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
            alert("Failed to delete log");
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    const getComplianceBadge = (status) => {
        const badges = {
            compliant: { color: 'bg-green-600 text-white dark:bg-green-500 dark:text-black shadow-md border-2 border-green-700/20', icon: CheckCircle2, label: 'Compliant' },
            flagged: { color: 'bg-red-600 text-white dark:bg-red-500 dark:text-black shadow-md border-2 border-red-700/20', icon: AlertCircle, label: 'Flagged' },
            pending: { color: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-black shadow-md border-2 border-orange-600/20', icon: Clock, label: 'Pending Analysis' }
        };
        return badges[status] || badges.pending;
    };

    const complianceBadge = getComplianceBadge(log.compliance_status);
    const ComplianceIcon = complianceBadge.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-divider)] p-6 flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-secondary)]">Meal Details</h2>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(log.logged_at).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Meal Comparison View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Before Meal</p>
                            <div className="relative rounded-2xl overflow-hidden bg-[var(--color-bg-page)] border border-[var(--color-divider)] shadow-inner group">
                                <img
                                    src={log.image_url}
                                    alt="Before"
                                    className="w-full h-64 object-cover transition-transform group-hover:scale-105 duration-700"
                                />
                                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${complianceBadge.color} flex items-center gap-1.5 shadow-lg`}>
                                        <ComplianceIcon size={12} />
                                        {complianceBadge.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">After Meal / Leftovers</p>
                            <div className="relative rounded-2xl overflow-hidden bg-[var(--color-bg-page)] border border-[var(--color-divider)] shadow-inner group h-64 flex items-center justify-center">
                                {log.image_after_url ? (
                                    <img
                                        src={log.image_after_url}
                                        alt="After"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                    />
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="h-12 w-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
                                            <Activity size={20} />
                                        </div>
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tight">No After-Meal Photo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Cooking Method</p>
                            <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">{log.cooking_method || 'Standard'}</p>
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Category</p>
                            <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">{log.meal_category || 'Other'}</p>
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Water Intake</p>
                            <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">{log.water_ml || 0} ML</p>
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-3.5 rounded-2xl border border-[var(--color-divider)]">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 opacity-70">Caregiver Reported</p>
                            <p className="text-xs font-black text-[var(--color-text-main)] truncate uppercase">
                                {displayAnalysis?.plate_waste !== undefined ? `${displayAnalysis.plate_waste}% Eaten` : '100% Eaten'}
                            </p>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {log.hidden_ingredients && (
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">Hidden Add-ons</h4>
                                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 font-medium leading-relaxed">{log.hidden_ingredients}</p>
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

                    {/* Analysis Content (Verified vs AI) */}
                    {(() => {
                        const isVerified = log.status === 'reviewed' && log.nutritionist_review?.verified_analysis;
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
                                <CardContent className="space-y-6">
                                    {/* Food Items */}
                                    {items.length > 0 && (
                                        <div>
                                            <h4 className="font-black text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Detected Food Items</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {items.map((item, idx) => (
                                                    <div key={idx} className="bg-[var(--color-bg-page)] p-3 rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-black text-sm text-[var(--color-secondary)] uppercase tracking-tight">
                                                                {item.name}
                                                            </p>
                                                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums">
                                                                {item.calories || 0} KCAL
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-1 uppercase">
                                                            {item.measure_qty || 1} {item.serving_unit || 'Serving'} • {item.weight_g || 100}g
                                                        </p>
                                                        <div className="flex gap-3 text-[10px] mt-2.5 font-black border-t border-[var(--color-divider)] pt-2">
                                                            <span className="text-blue-600 dark:text-blue-400 uppercase">P: {item.protein_g || 0}g</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 uppercase">C: {item.carbs_g || 0}g</span>
                                                            <span className="text-orange-600 dark:text-orange-400 uppercase">F: {item.fat_g || 0}g</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Totals */}
                                    <div className="pt-2 border-t border-[var(--color-divider)] border-dashed">
                                        <h4 className="font-black text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Nutritional Summation</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { val: nutrition.calories || displayAnalysis.total_calories_est, label: "Kcal", col: "var(--color-primary)" },
                                                { val: nutrition.protein || nutrition.protein_g, label: "Protein", col: "#2563eb" },
                                                { val: nutrition.carbs || nutrition.carbs_g, label: "Carbs", col: "#059669" },
                                                { val: nutrition.fat || nutrition.fat_g, label: "Fat", col: "#ea580c" }
                                            ].map((stat, si) => (
                                                <div key={si} className="bg-[var(--color-bg-page)] p-4 rounded-2xl text-center border border-[var(--color-divider)] shadow-sm">
                                                    <p className="text-2xl font-black tabular-nums leading-none mb-1" style={{ color: stat.col }}>
                                                        {stat.val || 0}{si > 0 ? 'g' : ''}
                                                    </p>
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">{stat.label}</p>
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
                    {log.status === 'reviewed' && log.nutritionist_review && (
                        <Card className="border-[var(--color-divider)] dark:border-green-900/30 bg-emerald-50/30 dark:bg-green-900/10 overflow-hidden shadow-sm">
                            <div className="bg-emerald-600 dark:bg-[var(--color-secondary)] px-4 py-2.5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <BadgeCheck size={12} className="text-emerald-300" /> Clinical Evaluation
                                </span>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                    Verified Record
                                </span>
                            </div>
                            <CardContent className="p-6 space-y-5">
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
                                        <h4 className="font-black text-[var(--color-text-main)] uppercase text-sm leading-none mb-1.5">
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
                            <CardContent>
                                <div className="space-y-2">
                                    {log.violation_details.map((violation, idx) => (
                                        <div key={idx} className="bg-[var(--color-bg-page)] p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                                            <p className="font-bold text-red-700 dark:text-red-300 text-sm">{violation.rule_name}</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{violation.reason}</p>
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
                <div className="sticky bottom-0 bg-[var(--color-bg-card)] border-t border-[var(--color-divider)] p-6 flex justify-between items-center">
                    <Button
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm"
                        onClick={() => setShowConfirm(true)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                        Delete Meal
                    </Button>
                    <Button
                        className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] px-8"
                        onClick={onClose}
                    >
                        Close
                    </Button>
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
        </div>
    );
}
