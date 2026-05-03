import React, { useState, useRef } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Camera, Upload, CheckCircle, Loader2, AlertCircle, ChefHat, Eye, EyeOff, Trash2, Clock } from 'lucide-react';
import api from '../lib/api';

const getLocalISOTime = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
};

export default function MealLogger({ profileId, onLogged, recentLogs = [] }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fileAfter, setFileAfter] = useState(null);
    const [previewAfter, setPreviewAfter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [verifiedItems, setVerifiedItems] = useState([]);
    const [status, setStatus] = useState('idle');
    const [suppData, setSuppData] = useState({
        waterMl: '',
        supplements: '',
        physicalActivity: '',
        servingSpoonUsed: false,
        cookingMethod: '',
        hiddenIngredients: '',
        isParentVerified: false,
        mealCategory: 'Lunch',
        plateWaste: 100,
        loggedAt: getLocalISOTime()
    });
    const fileInputRef = useRef(null);
    const fileAfterInputRef = useRef(null);

    const handleFileChange = (e, type = 'before') => {
        const selected = e.target.files[0];
        if (selected) {
            if (type === 'before') {
                setFile(selected);
                setPreview(URL.createObjectURL(selected));
                setStatus('idle');
                setAnalysisResult(null);
                setVerifiedItems([]);
            } else {
                setFileAfter(selected);
                setPreviewAfter(URL.createObjectURL(selected));
            }
        }
    };

    const handleAnalyze = async () => {
        if (!file || !profileId) return;
        setLoading(true);
        setStatus('uploading');

        const formData = new FormData();
        formData.append('image', file);
        formData.append('profile_id', profileId);

        try {
            const res = await api.post('/logs/analyze', formData);
            setAnalysisResult(res.data);
            if (res.data.ai_analysis?.items) {
                setVerifiedItems(res.data.ai_analysis.items);
            } else {
                setVerifiedItems([]);
            }
            setSuppData(prev => ({ 
                ...prev, 
                cookingMethod: res.data.detected_cooking_method || '' 
            }));
            setStatus('verify');
        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        setVerifiedItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handleDeleteItem = (index) => {
        setVerifiedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddMissingItem = () => {
        setVerifiedItems(prev => [...prev, {
            name: '',
            measure_qty: 1,
            serving_unit: 'Serving',
            serving_weight_g: 100,
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0
        }]);
    };


    const handleSaveVerified = async () => {
        setLoading(true);
        setStatus('saving');
        try {
            let imageAfterUrl = null;
            if (fileAfter) {
                const formData = new FormData();
                formData.append('image', fileAfter);
                // We'll use a simple upload helper or direct cloudinary if possible
                // For simplicity here, let's assume we have an upload endpoint or just use the existing one
                const uploadRes = await api.post('/logs/upload', formData);
                imageAfterUrl = uploadRes.data.image_url;
            }

            const finalizedAnalysis = {
                ...analysisResult.ai_analysis,
                items: verifiedItems,
                plate_waste: suppData.plateWaste
            };

            await api.post('/logs', {
                profile_id: profileId,
                image_url: analysisResult.image_url,
                image_after_url: imageAfterUrl,
                cooking_method: suppData.cookingMethod,
                ai_analysis: finalizedAnalysis,
                water_ml: suppData.waterMl ? parseInt(suppData.waterMl) : 0,
                supplements: suppData.supplements,
                physical_activity: suppData.physicalActivity,
                serving_spoon_used: suppData.servingSpoonUsed,
                is_parent_verified: suppData.isParentVerified,
                hidden_ingredients: suppData.hiddenIngredients,
                meal_category: suppData.mealCategory,
                logged_at: suppData.loggedAt
            });
            
            setStatus('done');
            if (onLogged) onLogged();
            
            setTimeout(() => {
                setFile(null);
                setPreview(null);
                setFileAfter(null);
                setPreviewAfter(null);
                setAnalysisResult(null);
                setVerifiedItems([]);
                setSuppData({ 
                    waterMl: '', 
                    supplements: '', 
                    physicalActivity: '', 
                    servingSpoonUsed: false,
                    cookingMethod: '',
                    hiddenIngredients: '',
                    isParentVerified: false,
                    mealCategory: 'Lunch',
                    plateWaste: 100,
                    loggedAt: getLocalISOTime()
                });
                setStatus('idle');
            }, 3000);
        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLog = (log) => {
        setPreview(log.image_url);
        if (log.image_after_url) setPreviewAfter(log.image_after_url);
        
        const baseAnalysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
        
        setAnalysisResult({ 
            image_url: log.image_url, 
            ai_analysis: baseAnalysis 
        });
        
        setVerifiedItems(baseAnalysis?.items || []);
        
        setSuppData({
            ...suppData,
            cookingMethod: log.cooking_method || '',
            waterMl: log.water_ml || '',
            supplements: log.supplements || '',
            physicalActivity: log.physical_activity || '',
            hiddenIngredients: log.hidden_ingredients || '',
            mealCategory: log.meal_category || 'Lunch',
            plateWaste: log.ai_analysis?.plate_waste ?? 100,
            loggedAt: getLocalISOTime() // Set to now!
        });
        
        setStatus('verify');
    };

    return (
        <Card className="border-2 border-[var(--color-primary)]/20 overflow-hidden">
            <CardContent className="p-0">
                <div className="bg-[var(--color-primary)]/5 p-4 flex items-center justify-between border-b border-[var(--color-primary)]/10">
                    <h3 className="font-bold text-[var(--color-secondary)] flex items-center gap-2">
                        <Camera size={18} className="text-[var(--color-primary)]" />
                        Log Child's Meal
                    </h3>
                    <span className="text-[10px] bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        Smart Care Verification
                    </span>
                </div>

                {status === 'idle' && !preview && recentLogs.length > 0 && (
                    <div className="bg-gray-50 dark:bg-black/20 p-4 border-b border-[var(--color-divider)]">
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Clock size={12} /> Quick Re-log Recent Meal
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                            {recentLogs.map(log => (
                                <div 
                                    key={log.id} 
                                    onClick={() => handleQuickLog(log)}
                                    className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-[var(--color-divider)] cursor-pointer hover:border-[var(--color-primary)] transition-all snap-start relative group"
                                >
                                    <img src={log.image_url} alt="Meal" className="w-full h-16 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-[10px] text-white font-bold">RE-LOG</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-center py-1 bg-[var(--color-bg-card)] line-clamp-1 px-1 text-[var(--color-text-main)]">
                                        {log.meal_category || 'Meal'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-6 flex flex-col items-center gap-6">
                    {(status === 'idle' || status === 'uploading') && (
                        <div className="w-full grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Meal Category</label>
                                <select 
                                    value={suppData.mealCategory}
                                    onChange={(e) => setSuppData({...suppData, mealCategory: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                >
                                    <option value="Breakfast">Breakfast</option>
                                    <option value="AM Snack">AM Snack</option>
                                    <option value="Lunch">Lunch</option>
                                    <option value="PM Snack">PM Snack</option>
                                    <option value="Dinner">Dinner</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Date & Time</label>
                                <input 
                                    type="datetime-local"
                                    value={suppData.loggedAt}
                                    onChange={(e) => setSuppData({...suppData, loggedAt: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 w-full">
                        {/* Before Photo */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Before Meal</span>
                            {preview ? (
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-white dark:border-white/10 shadow-lg group">
                                    <img src={preview} alt="Before" className="w-full h-full object-cover" />
                                    {status === 'idle' && (
                                        <button onClick={() => { setFile(null); setPreview(null); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold">CHANGE</button>
                                    )}
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[var(--color-primary)]/5 transition-all text-[var(--color-text-muted)]">
                                    <Upload size={24} />
                                    <span className="text-[10px] font-bold">ADD PHOTO</span>
                                </div>
                            )}
                        </div>

                        {/* After Photo */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">After Meal</span>
                            {previewAfter ? (
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-white dark:border-white/10 shadow-lg group">
                                    <img src={previewAfter} alt="After" className="w-full h-full object-cover" />
                                    <button onClick={() => { setFileAfter(null); setPreviewAfter(null); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold">CHANGE</button>
                                </div>
                            ) : (
                                <div onClick={() => fileAfterInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-white/5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[var(--color-primary)]/5 transition-all text-[var(--color-text-muted)]">
                                    <Upload size={24} />
                                    <span className="text-[10px] font-bold">OPTIONAL</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'before')} className="hidden" accept="image/*" capture="environment" />
                    <input type="file" ref={fileAfterInputRef} onChange={(e) => handleFileChange(e, 'after')} className="hidden" accept="image/*" capture="environment" />

                    {(status === 'idle' || status === 'uploading') && preview && (
                        <Button 
                            className={`w-full py-4 text-sm font-bold shadow-lg transition-all ${loading ? '!bg-[var(--color-bg-card,#ffffff)] !text-[var(--color-text-main,#1f2937)] border border-blue-500 opacity-100' : ''}`} 
                            onClick={handleAnalyze} 
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                    <span className="uppercase tracking-widest font-black text-[var(--color-text-main,#1f2937)]">AI Detecting Meal...</span>
                                </div>
                            ) : "Step 1: AI Food Detection"}
                        </Button>
                    )}

                    {status === 'verify' && analysisResult && (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/30 flex items-start gap-2">
                                <AlertCircle size={14} className="text-yellow-600 mt-0.5" />
                                <p className="text-[10px] text-yellow-800 dark:text-yellow-500 font-bold leading-tight">CARE-GIVER VERIFICATION: AI detects items and cooking methods. Please confirm or correct them below.</p>
                            </div>

                            <div className="space-y-3">
                                {verifiedItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 p-2.5 bg-white dark:bg-white/5 border border-[var(--color-divider)] rounded-lg shadow-sm">
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                value={item.name} 
                                                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                className="flex-1 p-2 rounded-md border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs font-bold"
                                            />
                                            <input 
                                                type="number"
                                                value={item.measure_qty || 1}
                                                step="0.25"
                                                onChange={(e) => {
                                                    const qty = parseFloat(e.target.value) || 0;
                                                    handleItemChange(idx, 'measure_qty', qty);
                                                    handleItemChange(idx, 'weight_g', Math.round(qty * (item.serving_weight_g || 100)));
                                                }}
                                                className="w-12 p-2 rounded-md border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs text-center font-bold"
                                            />
                                            <select
                                                value={item.serving_unit || 'Serving'}
                                                onChange={(e) => handleItemChange(idx, 'serving_unit', e.target.value)}
                                                className="w-20 p-2 rounded-md border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-[10px] font-bold"
                                            >
                                                <option value="Serving">Serving</option>
                                                <option value="Cup">Cup</option>
                                                <option value="Spoon">Spoon</option>
                                                <option value="Sandok">Sandok</option>
                                                <option value="Bowl">Bowl</option>
                                                <option value="Slice">Slice</option>
                                                <option value="Piece">Piece</option>
                                                <option value="Plate">Plate</option>
                                            </select>
                                            <button 
                                                onClick={() => handleDeleteItem(idx)}
                                                className="p-2 ml-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 transition-colors"
                                                title="Delete this item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-3 text-[9px] mt-0.5 font-bold px-1">
                                            <span className="text-orange-600 dark:text-orange-400">{item.calories || 0} Cal</span>
                                            <span className="text-blue-600 dark:text-blue-400">{item.protein_g || 0}g Pro</span>
                                            <span className="text-green-600 dark:text-green-400">{item.carbs_g || 0}g Carb</span>
                                            <span className="text-yellow-600 dark:text-yellow-400">{item.fat_g || 0}g Fat</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button
                                onClick={handleAddMissingItem}
                                className="w-full py-2.5 rounded-lg border border-dashed border-[var(--color-primary)] text-[var(--color-primary)] font-bold text-xs hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <AlertCircle size={14} /> Add Missing Food Item
                            </button>

                            {/* New Detailed Logs */}
                            <div className="space-y-3 pt-2 border-t border-[var(--color-divider)]">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Cooking Method</label>
                                        <div className="relative">
                                            <ChefHat className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-primary)]" size={14} />
                                            <select 
                                                value={suppData.cookingMethod}
                                                onChange={(e) => setSuppData({...suppData, cookingMethod: e.target.value})}
                                                className="w-full p-2 pl-8 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none appearance-none"
                                            >
                                                <option value="">Select Method...</option>
                                                <option value="Steamed">Steamed</option>
                                                <option value="Fried">Fried</option>
                                                <option value="Grilled">Grilled</option>
                                                <option value="Boiled">Boiled</option>
                                                <option value="Sauteed">Sauteed</option>
                                                <option value="Fresh">Fresh / Raw</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Hidden Add-ons</label>
                                        <input 
                                            type="text"
                                            placeholder="Oil, sugar, butter..."
                                            value={suppData.hiddenIngredients}
                                            onChange={(e) => setSuppData({...suppData, hiddenIngredients: e.target.value})}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Consumption / Plate Waste</label>
                                        <select 
                                            value={suppData.plateWaste}
                                            onChange={(e) => setSuppData({...suppData, plateWaste: parseInt(e.target.value)})}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        >
                                            <option value={100}>Ubos (100%)</option>
                                            <option value={50}>Kalahati (50%)</option>
                                            <option value={25}>Tira-tira (25%)</option>
                                            <option value={0}>Hindi Ginalaw (0%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Vitamins/Supplements</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. Vitamin C, Ceelin"
                                            value={suppData.supplements}
                                            onChange={(e) => setSuppData({...suppData, supplements: e.target.value})}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Water (ml)</label>
                                        <input 
                                            type="number"
                                            placeholder="e.g. 250"
                                            value={suppData.waterMl}
                                            onChange={(e) => setSuppData({...suppData, waterMl: e.target.value})}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Activity (min)</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. 30 min play"
                                            value={suppData.physicalActivity}
                                            onChange={(e) => setSuppData({...suppData, physicalActivity: e.target.value})}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card,#ffffff)] text-[var(--color-text-main,#1f2937)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 p-2 bg-[var(--color-primary)]/5 rounded-lg border border-[var(--color-primary)]/20 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={suppData.isParentVerified}
                                        onChange={(e) => setSuppData({...suppData, isParentVerified: e.target.checked})}
                                        className="w-4 h-4 rounded text-[var(--color-primary)]"
                                    />
                                    <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase">I have confirmed this meal data is correct</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button 
                                    variant="outline"
                                    className="w-1/3 py-4 font-bold rounded-xl text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                        setFileAfter(null);
                                        setPreviewAfter(null);
                                        setAnalysisResult(null);
                                        setVerifiedItems([]);
                                        setStatus('idle');
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                        if (fileAfterInputRef.current) fileAfterInputRef.current.value = "";
                                    }} 
                                    disabled={loading}
                                >
                                    Restart
                                </Button>
                                <Button 
                                    className={`w-2/3 py-4 font-bold rounded-xl shadow-lg transition-all ${loading ? '!bg-[var(--color-bg-card,#ffffff)] !text-[var(--color-text-main,#1f2937)] border border-green-500 shadow-none opacity-100' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'}`} 
                                    onClick={handleSaveVerified} 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-green-600" size={24} />
                                            <span className="uppercase tracking-widest font-black text-[var(--color-text-main,#1f2937)]">Finalizing...</span>
                                        </div>
                                    ) : "Save Log"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
