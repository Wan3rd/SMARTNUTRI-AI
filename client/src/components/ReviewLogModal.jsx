import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, CheckCircle, AlertTriangle, Save, Edit2, Info, ChefHat, Eye } from 'lucide-react';
import api from '../lib/api';

export default function ReviewLogModal({ isOpen, onClose, log, onReviewComplete }) {
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState('');
    const [editedAnalysis, setEditedAnalysis] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

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

    const handleAnalysisChange = (field, value) => {
        setEditedAnalysis(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const macros = editedAnalysis?.macros_est || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <Card className="w-full max-w-5xl relative shadow-2xl my-8">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-50 bg-white rounded-full p-1"
                >
                    <X size={24} />
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                    {/* Image Side */}
                    <div className="bg-gray-900 h-auto flex flex-col gap-2 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                            <div className="relative group">
                                <span className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Before</span>
                                <img src={log.image_url} alt="Before" className="w-full h-full object-contain rounded-lg border border-white/10" />
                            </div>
                            {log.image_after_url && (
                                <div className="relative group">
                                    <span className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">After</span>
                                    <img src={log.image_after_url} alt="After" className="w-full h-full object-contain rounded-lg border border-white/10" />
                                </div>
                            )}
                        </div>
                        
                        {/* Child Context for Nutritionist */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-auto">
                            <div className="flex justify-between items-center">
                                <h4 className="text-white font-bold text-sm">Child Profile: {log.child_name}</h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{log.profile?.gender}, {new Date().getFullYear() - new Date(log.profile?.date_of_birth).getFullYear()}y</span>
                            </div>
                            {log.profile?.medical_history && (
                                <div className="bg-blue-900/30 p-2 rounded border border-blue-800">
                                    <p className="text-[10px] text-blue-300 font-bold uppercase flex items-center gap-1 mb-1"><Info size={10} /> Medical Context</p>
                                    <p className="text-xs text-blue-100 italic">"{log.profile.medical_history}"</p>
                                </div>
                            )}
                            <div className="flex gap-2 text-[10px]">
                                <span className="bg-white/10 text-white px-2 py-0.5 rounded">Allergies: {log.profile?.allergies?.join(', ') || 'None'}</span>
                                <span className="bg-white/10 text-white px-2 py-0.5 rounded">Activity: {log.profile?.activity_level}</span>
                            </div>
                        </div>
                    </div>

                    {/* Review Side */}
                    <CardContent className="p-6 lg:p-8 flex flex-col h-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[var(--color-secondary)] mb-1">Meal Review</h2>
                                <p className="text-sm text-[var(--color-text-muted)]">Logged on {new Date(log.logged_at).toLocaleString()}</p>
                            </div>
                            {log.is_parent_verified && (
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                    <CheckCircle size={12} /> Caregiver Verified
                                </div>
                            )}
                        </div>

                        {/* Caregiver Inputs */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-[var(--color-divider)]">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1 flex items-center gap-1"><ChefHat size={12} /> Cooking Method</p>
                                <p className="text-sm font-bold text-[var(--color-secondary)]">{log.cooking_method || 'Unspecified'}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-[var(--color-divider)]">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1 flex items-center gap-1"><EyeOff size={12} /> Hidden Ingredients</p>
                                <p className="text-sm font-bold text-[var(--color-secondary)]">{log.hidden_ingredients || 'None reported'}</p>
                            </div>
                        </div>

                        {/* Analysis Section */}
                        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-6 border border-[var(--color-divider)]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-orange-500" />
                                    Meal Analysis
                                </h3>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1 hover:underline"
                                >
                                    <Edit2 size={12} /> {isEditing ? 'Done Editing' : 'Edit Calculations'}
                                </button>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex flex-wrap gap-2">
                                    {editedAnalysis?.items?.map((item, idx) => (
                                        <span key={idx} className="bg-white dark:bg-white/10 px-2 py-1 rounded border shadow-sm">
                                            {item.name} <span className="text-gray-500 text-xs">({item.weight_g}g)</span>
                                        </span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-dashed">
                                    <div className="text-center">
                                        <div className="font-bold text-lg">{editedAnalysis?.total_calories_est}</div>
                                        <div className="text-[10px] uppercase text-gray-500">Kcal</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-blue-600">{macros.protein_g}g</div>
                                        <div className="text-[10px] uppercase text-gray-500">Prot</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-green-600">{macros.carbs_g}g</div>
                                        <div className="text-[10px] uppercase text-gray-500">Carbs</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-yellow-600">{macros.fat_g}g</div>
                                        <div className="text-[10px] uppercase text-gray-500">Fat</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Smart AI Insight Section */}
                        {log.violation_details?.xai_feedback && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 mb-6 animate-in slide-in-from-left duration-500">
                                <h3 className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1">
                                    <Activity size={12} /> AI Clinical Reasoning (Explainable AI)
                                </h3>
                                <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed italic font-medium">
                                    "{log.violation_details.xai_feedback}"
                                </p>
                            </div>
                        )}

                        {/* Feedback Input */}
                        <div className="flex-1 min-h-[150px]">
                            <label className="block text-sm font-bold text-[var(--color-text-main)] mb-2">
                                Professional Advice for Caregiver
                            </label>
                            <textarea
                                className="w-full h-full p-4 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                                placeholder="Write your advice here..."
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-600/20" disabled={loading}>
                                {loading ? 'Saving...' : 'Send Review'}
                            </Button>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}
