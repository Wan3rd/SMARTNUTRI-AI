import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, Calendar, User, Trash2, Loader2, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import ConfirmDialog from './common/ConfirmDialog';
import api from '../lib/api';

export default function MealDetailModal({ log, onClose, onDelete }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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
        } catch(err) {
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
                <div className="p-6 space-y-6">
                    {/* Image */}
                    <div className="relative rounded-xl overflow-hidden bg-[var(--color-bg-page)]">
                        <img
                            src={log.image_url}
                            alt="Meal"
                            className="w-full h-96 object-contain"
                        />
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${complianceBadge.color} flex items-center gap-1.5 shadow-lg`}>
                                <ComplianceIcon size={14} />
                                {complianceBadge.label}
                            </span>
                            {log.compliance_score && (
                                <span className="bg-[var(--color-bg-card)] text-[var(--color-secondary)] px-3 py-1 rounded-full text-sm font-black shadow-lg border border-[var(--color-divider)]">
                                    Score: {log.compliance_score}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Adaptive Suggestions / System Feedback */}
                    {log.violation_details?.suggestions?.length > 0 && (
                        <div className="bg-[var(--color-primary)]/5 p-4 rounded-xl border border-[var(--color-primary)]/20">
                            <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase mb-3 flex items-center gap-2">
                                <Activity size={14} /> Smart Recommendations
                            </h4>
                            <div className="space-y-2">
                                {log.violation_details.suggestions.map((s, i) => (
                                    <p key={i} className="text-sm text-[var(--color-secondary)] flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                                        {s}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Analysis */}
                    {log.ai_analysis && (
                        <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
                            <CardHeader>
                                <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    AI Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Detected Items */}
                                {log.ai_analysis.items && log.ai_analysis.items.length > 0 && (
                                    <div>
                                        <h4 className="font-bold text-sm text-[var(--color-text-main)] mb-2">Detected Food Items</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {log.ai_analysis.items.map((item, idx) => (
                                                <div key={idx} className="bg-[var(--color-bg-page)] p-3 rounded-lg border border-[var(--color-divider)]">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-[var(--color-secondary)] flex items-center gap-2">
                                                            {item.name}
                                                            {item.brand && <span className="text-[10px] bg-[var(--color-bg-page)] font-normal px-1.5 py-0.5 rounded text-[var(--color-text-muted)] border border-[var(--color-divider)]">{item.brand}</span>}
                                                        </p>
                                                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{item.calories || 0} Calories</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                                        {item.measure_qty || 1} x {item.serving_unit || 'Serving'} ({item.weight_g || 100}g)
                                                    </p>
                                                    <div className="flex gap-2 text-[10px] mt-2 font-bold">
                                                        <span className="text-blue-600 dark:text-blue-400">{item.protein_g || 0}g Protein</span>
                                                        <span className="text-green-600 dark:text-green-400">{item.carbs_g || 0}g Carbs</span>
                                                        <span className="text-yellow-600 dark:text-yellow-400">{item.fat_g || 0}g Fat</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Nutrition Summary */}
                                {log.ai_analysis.nutrition && (
                                    <div>
                                        <h4 className="font-bold text-sm text-[var(--color-text-main)] mb-2">Estimated Nutrition</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {log.ai_analysis.nutrition.calories && (
                                                <div className="bg-[var(--color-bg-page)] p-3 rounded-lg text-center">
                                                    <p className="text-2xl font-bold text-[var(--color-primary)]">{log.ai_analysis.nutrition.calories}</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">Calories</p>
                                                </div>
                                            )}
                                            {log.ai_analysis.nutrition.protein && (
                                                <div className="bg-[var(--color-bg-page)] p-3 rounded-lg text-center">
                                                    <p className="text-2xl font-bold text-blue-600">{log.ai_analysis.nutrition.protein}g</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">Protein</p>
                                                </div>
                                            )}
                                            {log.ai_analysis.nutrition.carbs && (
                                                <div className="bg-[var(--color-bg-page)] p-3 rounded-lg text-center">
                                                    <p className="text-2xl font-bold text-yellow-600">{log.ai_analysis.nutrition.carbs}g</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">Carbs</p>
                                                </div>
                                            )}
                                            {log.ai_analysis.nutrition.fat && (
                                                <div className="bg-[var(--color-bg-page)] p-3 rounded-lg text-center">
                                                    <p className="text-2xl font-bold text-orange-600">{log.ai_analysis.nutrition.fat}g</p>
                                                    <p className="text-xs text-[var(--color-text-muted)]">Fat</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* AI Comments */}
                                {log.ai_analysis.comment && (
                                    <div className="bg-[var(--color-bg-page)] p-4 rounded-lg border border-[var(--color-divider)]">
                                        <p className="text-sm text-[var(--color-text-main)] italic">"{log.ai_analysis.comment}"</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Nutritionist Review */}
                    {log.status === 'reviewed' && log.nutritionist_review && (
                        <Card className="border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10">
                            <CardHeader>
                                <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                                    <User size={18} /> Nutritionist Review
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <h4 className="font-bold text-[var(--color-secondary)] text-lg">{log.nutritionist_review.title}</h4>
                                    <p className="text-sm text-[var(--color-text-main)] mt-2">{log.nutritionist_review.comment}</p>
                                </div>
                                {log.nutritionist_review.recommendations && (
                                    <div className="bg-[var(--color-bg-page)] p-4 rounded-lg border border-[var(--color-divider)]">
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Recommendations</p>
                                        <p className="text-sm text-[var(--color-text-main)]">{log.nutritionist_review.recommendations}</p>
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
