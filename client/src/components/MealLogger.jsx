import React, { useState, useRef } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Camera, Upload, CheckCircle, Loader2, AlertCircle, ChefHat, Eye, EyeOff, Trash2, Clock, RefreshCw, Crop, X, Info } from 'lucide-react';
import Cropper from 'react-easy-crop';
import Webcam from 'react-webcam';
import imageCompression from 'browser-image-compression';
import { useMealLoggerStore } from '../context/MealLoggerContext';
import SmartTimePicker from './common/SmartTimePicker';
import api from '../lib/api';
import ConfirmDialog from './common/ConfirmDialog';
import Notification from './common/Notification';
import { useAuth } from '../context/AuthContext';
import { cn, convertWater } from '../lib/utils';

const COOKING_METHODS = [
    "Raw / Fresh", "Baked", "Blanched", "Boiled", "Braised / Stewed", "Broiled",
    "Deep Fried", "Fried / Pan-fried", "Grilled", "Microwaved", "Poached",
    "Roasted", "Sautéed / Stir-fried", "Seared", "Simmered", "Smoked",
    "Sous Vide", "Steamed", "Unknown"
];

const getLocalISOTime = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
};

const getDefaultMealCategory = () => {
    // Use PH time (UTC+8)
    const phHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours();
    if (phHour >= 5 && phHour < 9) return 'Breakfast';
    if (phHour >= 9 && phHour < 11) return 'AM Snack';
    if (phHour >= 11 && phHour < 14) return 'Lunch';
    if (phHour >= 14 && phHour < 17) return 'PM Snack';
    if (phHour >= 17 && phHour < 21) return 'Dinner';
    return 'Other';
};

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (error) => reject(error));
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg');
    });
};

// Normalization Helper: Ensures base values are ALWAYS "per 1 unit"
const normalizeItem = (item) => {
    const qty = parseFloat(item.measure_qty) || 1;
    return {
        ...item,
        _base_calories: (item.calories || 0) / qty,
        _base_protein_g: (item.protein_g || 0) / qty,
        _base_carbs_g: (item.carbs_g || 0) / qty,
        _base_fat_g: (item.fat_g || 0) / qty,
        _base_weight_g: (item.serving_weight_g || 100) / qty,
    };
};

export default function MealLogger({ profileId, onLogged, recentLogs = [], allergies = [] }) {
    const { user } = useAuth();
    const { useMemo } = React;
    const {
        file, setFile,
        preview, setPreview,
        fileAfter, setFileAfter,
        previewAfter, setPreviewAfter,
        loading, setLoading,
        analysisResult, setAnalysisResult,
        verifiedItems, setVerifiedItems,
        status, setStatus,
        suppData, setSuppData,
        resetLogger
    } = useMealLoggerStore();
    const debounceTimers = useRef({});
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [itemIdxToDelete, setItemIdxToDelete] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });

    // Cropping States
    const [cropImage, setCropImage] = useState(null);
    const [cropType, setCropType] = useState(null); // 'before' or 'after'
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [aspect, setAspect] = useState(4 / 3);

    // Webcam States
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    const [webcamType, setWebcamType] = useState('before');
    const webcamRef = useRef(null);

    const handleWebcamCapture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCropImage(imageSrc);
            setCropType(webcamType);
            setIsCropping(true);
            setIsWebcamOpen(false);
        }
    };

    const openWebcam = (type = 'before') => {
        setWebcamType(type);
        setIsWebcamOpen(true);
    };

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    // Clinical Allergy Awareness Logic
    const allergyWarnings = useMemo(() => {
        if (!allergies || allergies.length === 0 || !verifiedItems || verifiedItems.length === 0) return [];

        return verifiedItems.filter(item => {
            const itemName = item.name?.toLowerCase() || '';
            return allergies.some(allergy => {
                const allergen = allergy.toLowerCase().trim();
                if (!allergen || allergen.length < 2) return false; // Avoid matching single letters
                return itemName.includes(allergen);
            });
        });
    }, [verifiedItems, allergies]);
    const fileInputRef = useRef(null);
    const fileAfterInputRef = useRef(null);

    const handleFileChange = (e, type = 'before') => {
        const selected = e.target.files[0];
        if (selected) {
            const url = URL.createObjectURL(selected);
            setCropImage(url);
            setCropType(type);
            setIsCropping(true);
        }
    };

    const handleCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleConfirmCrop = async () => {
        try {
            const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
            let croppedFile = new File([croppedBlob], `meal_${cropType}.jpg`, { type: 'image/jpeg' });

            // Compress image to ~500kb to save bandwidth and storage
            try {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true,
                    initialQuality: 0.8
                };
                croppedFile = await imageCompression(croppedFile, options);
            } catch (compressErr) {
                console.warn("Image compression failed, using original", compressErr);
            }

            const croppedUrl = URL.createObjectURL(croppedFile);

            if (cropType === 'before') {
                setFile(croppedFile);
                setPreview(croppedUrl);
                setStatus('idle');
                setAnalysisResult(null);
                setVerifiedItems([]);
            } else {
                setFileAfter(croppedFile);
                setPreviewAfter(croppedUrl);
            }
            setIsCropping(false);
            setCropImage(null);
        } catch (e) {
            console.error(e);
            showNotif("Failed to crop image", "error");
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
                const normalized = res.data.ai_analysis.items.map(normalizeItem);
                setVerifiedItems(normalized);
            } else {
                setVerifiedItems([]);
            }
            setSuppData(prev => ({
                ...prev,
                cookingMethod: res.data.detected_cooking_method || ''
            }));
            setStatus('verify');
        } catch (err) {
            console.error("Analysis failed:", err);
            setStatus('idle');
            const errorMsg = err.response?.data?.message || "AI is currently busy. Please try clicking Analyze again in a moment.";
            showNotif(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    const updateItemMacros = async (index, name, unit, method) => {
        if (!name || name.length < 2) return;

        setVerifiedItems(prev => {
            const next = [...prev];
            if (next[index]) next[index] = { ...next[index], isUpdating: true, isStale: false };
            return next;
        });

        try {
            const res = await api.post('/ai/analyze-item', {
                name,
                serving_unit: unit,
                cooking_method: method
            });
            const data = res.data;

            setVerifiedItems(prev => {
                const next = [...prev];
                const item = next[index];
                if (!item) return prev;

                const qty = item.measure_qty || 1;

                next[index] = {
                    ...item,
                    _base_calories: data.calories || 0,
                    _base_protein_g: data.protein_g || 0,
                    _base_carbs_g: data.carbs_g || 0,
                    _base_fat_g: data.fat_g || 0,
                    _base_weight_g: data.serving_weight_g || 100,
                    // Scaled values
                    calories: Math.round((data.calories || 0) * qty),
                    protein_g: Math.round((data.protein_g || 0) * qty * 10) / 10,
                    carbs_g: Math.round((data.carbs_g || 0) * qty * 10) / 10,
                    fat_g: Math.round((data.fat_g || 0) * qty * 10) / 10,
                    serving_weight_g: data.serving_weight_g || 100,
                    isUpdating: false,
                    isStale: false
                };
                return next;
            });
        } catch (err) {
            console.error("Failed to update macros", err);
            setVerifiedItems(prev => {
                const next = [...prev];
                if (next[index]) next[index] = { ...next[index], isUpdating: false };
                return next;
            });
        }
    };

    const updateItemQuantity = (index, newQty) => {
        setVerifiedItems(prev => {
            const next = [...prev];
            const base = next[index];
            if (!base) return prev;

            const qty = parseFloat(newQty) || 0;
            next[index] = {
                ...base,
                measure_qty: qty,
                weight_g: Math.round(qty * (base._base_weight_g || 100)),
                calories: Math.round((base._base_calories || 0) * qty),
                protein_g: Math.round((base._base_protein_g || 0) * qty * 10) / 10,
                carbs_g: Math.round((base._base_carbs_g || 0) * qty * 10) / 10,
                fat_g: Math.round((base._base_fat_g || 0) * qty * 10) / 10,
            };
            return next;
        });
    };

    const handleItemChange = (index, field, value) => {
        const item = verifiedItems[index];
        if (!item) return;

        const updatedName = field === 'name' ? value : item.name;
        const updatedUnit = field === 'serving_unit' ? value : item.serving_unit;
        const updatedMethod = field === 'cooking_method' ? value : item.cooking_method;

        const isMacroField = field === 'name' || field === 'serving_unit' || field === 'cooking_method';

        setVerifiedItems(prev => {
            const newItems = [...prev];
            if (newItems[index]) {
                newItems[index] = {
                    ...newItems[index],
                    [field]: value,
                    isStale: isMacroField ? true : newItems[index].isStale
                };
            }
            return newItems;
        });

        if (isMacroField) {
            if (debounceTimers.current[index]) {
                clearTimeout(debounceTimers.current[index]);
            }
            // Auto-timer removed as per user request to save tokens and give control.
            // Syncing will now happen via manual button or onBlur.
        }
    };

    const handleRowBlur = (e, index) => {
        // If the relatedTarget is not inside the current row, trigger immediate sync if stale
        if (!e.currentTarget.contains(e.relatedTarget)) {
            const item = verifiedItems[index];
            if (item && item.isStale && !item.isUpdating) {
                if (debounceTimers.current[index]) {
                    clearTimeout(debounceTimers.current[index]);
                }
                updateItemMacros(index, item.name, item.serving_unit, item.cooking_method);
            }
        }
    };

    const handleDeleteItem = (index) => {
        setItemIdxToDelete(index);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDeleteItem = () => {
        if (itemIdxToDelete !== null) {
            setVerifiedItems(prev => prev.filter((_, i) => i !== itemIdxToDelete));
        }
        setIsConfirmDeleteOpen(false);
        setItemIdxToDelete(null);
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
        if (!suppData.isParentVerified) {
            showNotif('Please check the verification box to confirm the meal data is correct before saving.', 'error');
            return;
        }
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

            // Explicitly clear file inputs
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (fileAfterInputRef.current) fileAfterInputRef.current.value = "";

            // Auto-reset after 2 seconds, but user can also click 'New Log'
            setTimeout(() => {
                resetForm();
            }, 2500);
        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        resetLogger();
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (fileAfterInputRef.current) fileAfterInputRef.current.value = "";
    };

    const handleQuickLog = (log) => {
        setPreview(log.image_url);
        if (log.image_after_url) setPreviewAfter(log.image_after_url);

        const baseAnalysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;

        setAnalysisResult({
            image_url: log.image_url,
            ai_analysis: baseAnalysis
        });

        const normalized = (baseAnalysis?.items || []).map(normalizeItem);
        setVerifiedItems(normalized);

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
        <Card className="border-2 border-[var(--color-primary)]/20 relative overflow-hidden">
            <CardContent className="p-0">
                {status === 'saving' && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                        <Loader2 className="animate-spin text-[var(--color-primary)]" size={40} />
                        <div className="text-center mt-6 space-y-2">
                            <h4 className="text-base font-black text-[var(--color-secondary)] uppercase tracking-wider animate-pulse">Saving Meal Log...</h4>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-relaxed">
                                Uploading images and updating clinical logs
                            </p>
                        </div>
                    </div>
                )}
                <div className="bg-[var(--color-primary)]/5 p-4 flex items-center justify-between border-b border-[var(--color-primary)]/10 rounded-t-xl">
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
                                    onChange={(e) => setSuppData({ ...suppData, mealCategory: e.target.value })}
                                    className="w-full h-[42px] px-3 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
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
                                <SmartTimePicker
                                    value={suppData.loggedAt}
                                    onChange={(val) => setSuppData({ ...suppData, loggedAt: val })}
                                />
                            </div>
                        </div>
                    )}

                    {status !== 'done' && status !== 'saving' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
                        {/* Before Photo */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Before Meal</span>
                            {preview ? (
                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-[var(--color-divider)] shadow-md group">
                                    <img src={preview} alt="Before" className="w-full h-full object-cover" />
                                    {status === 'idle' && (
                                        <button onClick={() => { setFile(null); setPreview(null); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold">CHANGE</button>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-4 transition-all bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div className="flex gap-4">
                                        <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group">
                                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-full group-hover:scale-110 transition-transform"><Upload size={20} /></div>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Upload</span>
                                        </button>
                                        <button onClick={() => openWebcam('before')} className="hidden sm:flex flex-col items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group">
                                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-full group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Webcam</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Webcam Modal */}
                        {isWebcamOpen && (
                            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
                                    <div className="flex w-full justify-between items-center p-4 border-b border-[var(--color-divider)]">
                                        <span className="text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">Capture Photo</span>
                                        <button onClick={() => setIsWebcamOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="w-full bg-black relative">
                                        <Webcam
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            videoConstraints={{ facingMode: "environment" }}
                                            className="w-full h-auto max-h-[60vh] object-contain"
                                        />
                                    </div>
                                    <div className="p-6 w-full flex justify-center">
                                        <Button onClick={handleWebcamCapture} className="w-full sm:w-auto px-12 py-3 bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-transform flex gap-2 items-center">
                                            <Camera size={16} /> Capture Image
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cropper Modal */}
                        {/* After Photo */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">After Meal</span>
                            {previewAfter ? (
                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-[var(--color-divider)] shadow-md group">
                                    <img src={previewAfter} alt="After" className="w-full h-full object-cover" />
                                    {status !== 'uploading' && (
                                        <button onClick={() => { setFileAfter(null); setPreviewAfter(null); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold">CHANGE</button>
                                    )}
                                </div>
                            ) : (
                                <div className={`w-full h-16 sm:h-auto sm:aspect-square rounded-2xl border-2 border-dashed flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-4 transition-all ${status === 'uploading' ? 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 cursor-not-allowed opacity-60' : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                                    {status === 'uploading' ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin text-gray-400" />
                                            <span className="text-[8px] font-black text-gray-400 uppercase">AI Analyzing...</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4 items-center justify-center w-full h-full p-2 sm:p-0">
                                            <button onClick={() => fileAfterInputRef.current?.click()} className="flex flex-row sm:flex-col items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group">
                                                <div className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-full group-hover:scale-110 transition-transform"><Upload size={16} /></div>
                                                <span className="text-[8px] font-black uppercase tracking-widest">Upload</span>
                                            </button>
                                            <button onClick={() => openWebcam('after')} className="hidden sm:flex flex-col items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group">
                                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-full group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                                                <span className="text-[8px] font-black uppercase tracking-widest">Webcam</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'before')} className="hidden" accept="image/*" />
                    <input type="file" ref={fileAfterInputRef} onChange={(e) => handleFileChange(e, 'after')} className="hidden" accept="image/*" />

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

                            <div className="bg-[var(--color-primary)]/5 p-4 rounded-xl border border-[var(--color-primary)]/20 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-[var(--color-primary)]" />
                                    <span className="text-xs font-black text-[var(--color-secondary)] uppercase tracking-tight">Step 2: Caregiver Log Report</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Meal Category</label>
                                        <select
                                            value={suppData.mealCategory}
                                            onChange={(e) => setSuppData({ ...suppData, mealCategory: e.target.value })}
                                            className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm font-bold focus:ring-4 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
                                        >
                                            <option value="Breakfast">Breakfast</option>
                                            <option value="AM Snack">AM Snack</option>
                                            <option value="Lunch">Lunch</option>
                                            <option value="PM Snack">PM Snack</option>
                                            <option value="Dinner">Dinner</option>
                                            <option value="Other">Other / Dietary</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Consumption</label>
                                        <select
                                            value={suppData.plateWaste}
                                            onChange={(e) => setSuppData({ ...suppData, plateWaste: parseInt(e.target.value) })}
                                            className="w-full p-3 rounded-xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-bg-card)] text-sm font-bold focus:ring-4 focus:ring-[var(--color-primary)]/20 outline-none transition-all"
                                        >
                                            <option value={100}>Finished (100%)</option>
                                            <option value={75}>Mostly (75%)</option>
                                            <option value={50}>Half (50%)</option>
                                            <option value={25}>A Little (25%)</option>
                                            <option value={0}>None (0%)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {verifiedItems.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onBlur={(e) => handleRowBlur(e, idx)}
                                        className={`flex flex-col gap-3 p-4 bg-[var(--color-bg-card)] border-y-2 border-x-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-2xl shadow-sm transition-all duration-300 -mx-6 w-[calc(100%+3rem)] sm:w-full sm:mx-0 ${item.isUpdating ? 'opacity-60 scale-[0.98]' : 'hover:border-[var(--color-primary)]/30'}`}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 relative">
                                                    <input
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                        placeholder="Food name..."
                                                        className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm font-bold uppercase tracking-tight focus:border-[var(--color-primary)] outline-none transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteItem(idx)}
                                                    className="p-3 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 transition-all active:scale-90"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={item.cooking_method || ''}
                                                    onChange={(e) => handleItemChange(idx, 'cooking_method', e.target.value)}
                                                    className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs font-black uppercase tracking-tight focus:border-[var(--color-primary)] outline-none transition-all"
                                                >
                                                    <option value="">Method...</option>
                                                    {COOKING_METHODS.map(method => (
                                                        <option key={method} value={method}>{method}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={item.serving_unit || 'Serving'}
                                                    onChange={(e) => handleItemChange(idx, 'serving_unit', e.target.value)}
                                                    className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs font-black uppercase focus:border-[var(--color-primary)] outline-none transition-all"
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
                                            </div>

                                            <div className="bg-[var(--color-bg-page)] p-2.5 rounded-xl border border-[var(--color-divider)] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Portion Quantity</span>
                                                    <div className="flex items-center gap-1 bg-[var(--color-bg-card)] border border-[var(--color-divider)] px-2 py-1 rounded-xl shadow-sm">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            max="999"
                                                            step="0.25"
                                                            value={item.measure_qty || 1}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                updateItemQuantity(idx, isNaN(val) ? '' : val);
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (isNaN(val) || val <= 0) {
                                                                    updateItemQuantity(idx, 1);
                                                                }
                                                            }}
                                                            className="w-12 h-6 text-center text-xs font-black text-[var(--color-primary)] bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <span className="text-[10px] font-black text-[var(--color-primary)] uppercase pr-0.5">x</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => {
                                                            const newQty = Math.max(0.25, (item.measure_qty || 1) - 0.25);
                                                            updateItemQuantity(idx, newQty);
                                                        }}
                                                        className="h-11 w-11 rounded-xl bg-white dark:bg-white/10 border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-main)] active:scale-90 transition-all shadow-md text-lg font-black"
                                                    >
                                                        <span className="text-xl font-bold">−</span>
                                                    </button>

                                                    <div className="flex-1 px-2">
                                                        <input
                                                            type="range"
                                                            min="0.25"
                                                            max="10"
                                                            step="0.25"
                                                            value={item.measure_qty || 1}
                                                            onChange={(e) => updateItemQuantity(idx, e.target.value)}
                                                            className="w-full h-2.5 accent-[var(--color-primary)] cursor-pointer"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const newQty = Math.min(10, (item.measure_qty || 1) + 0.25);
                                                            updateItemQuantity(idx, newQty);
                                                        }}
                                                        className="h-11 w-11 rounded-xl bg-white dark:bg-white/10 border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-main)] active:scale-90 transition-all shadow-md text-lg font-black"
                                                    >
                                                        <span className="text-xl font-bold">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex flex-wrap items-center justify-between gap-2 text-[10px] xs:text-xs mt-1.5 font-black px-1 transition-all duration-500 ${item.isStale ? 'opacity-40 italic' : 'opacity-100'}`}>
                                            <div className="flex flex-wrap items-center gap-x-2 xs:gap-x-4 sm:gap-x-5 gap-y-1">
                                                <span className="whitespace-nowrap text-orange-600 dark:text-orange-400">{item.calories || 0} kcal</span>
                                                <span className="whitespace-nowrap text-blue-600 dark:text-blue-400">{item.protein_g || 0}g protein</span>
                                                <span className="whitespace-nowrap text-green-600 dark:text-green-400">{item.carbs_g || 0}g carbs</span>
                                                <span className="whitespace-nowrap text-indigo-600 dark:text-indigo-400">{item.fat_g || 0}g fat</span>
                                            </div>

                                            {item.isStale && !item.isUpdating && (
                                                <button
                                                    onClick={() => updateItemMacros(idx, item.name, item.serving_unit, item.cooking_method)}
                                                    className="ml-auto flex items-center gap-1 px-3 py-1 bg-[var(--color-primary)] text-white rounded-lg shadow-sm active:scale-95 transition-all"
                                                >
                                                    <RefreshCw size={10} className="animate-spin-slow" />
                                                    <span className="text-[8px] uppercase tracking-widest font-black">Sync</span>
                                                </button>
                                            )}
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
                                <div className="w-full">
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Hidden Add-ons</label>
                                    <input
                                        type="text"
                                        placeholder="Oil, sugar, butter..."
                                        value={suppData.hiddenIngredients}
                                        onChange={(e) => setSuppData({ ...suppData, hiddenIngredients: e.target.value })}
                                        className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Meal Time</label>
                                        <input
                                            type="datetime-local"
                                            value={suppData.loggedAt}
                                            onChange={(e) => setSuppData({ ...suppData, loggedAt: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Vitamins/Supplements</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Vitamin C, Ceelin"
                                            value={suppData.supplements}
                                            onChange={(e) => setSuppData({ ...suppData, supplements: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">💧 Water Intake ({user?.measurement_system === 'imperial' ? 'oz' : 'ml'})</label>
                                        <select
                                            value={suppData.waterMl}
                                            onChange={(e) => setSuppData({ ...suppData, waterMl: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        >
                                            <option value="">None</option>
                                            {user?.measurement_system === 'imperial' ? (
                                                <>
                                                    <option value="237">8 oz (1 glass)</option>
                                                    <option value="473">16 oz (2 glasses)</option>
                                                    <option value="710">24 oz (3 glasses)</option>
                                                    <option value="946">32 oz (4 glasses)</option>
                                                    <option value="1183">40 oz (5 glasses)</option>
                                                    <option value="1420">48 oz (6 glasses)</option>
                                                    <option value="1656">56 oz (7 glasses)</option>
                                                    <option value="1893">64 oz (8 glasses)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="250">1 glass (250ml)</option>
                                                    <option value="500">2 glasses (500ml)</option>
                                                    <option value="750">3 glasses (750ml)</option>
                                                    <option value="1000">4 glasses (1L)</option>
                                                    <option value="1250">5 glasses (1.25L)</option>
                                                    <option value="1500">6 glasses (1.5L)</option>
                                                    <option value="1750">7 glasses (1.75L)</option>
                                                    <option value="2000">8 glasses (2L)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 block uppercase">Activity (min)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 30 min play"
                                            value={suppData.physicalActivity}
                                            onChange={(e) => setSuppData({ ...suppData, physicalActivity: e.target.value })}
                                            className="w-full p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 p-2 bg-[var(--color-primary)]/5 rounded-lg border border-[var(--color-primary)]/20 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={suppData.isParentVerified}
                                        onChange={(e) => setSuppData({ ...suppData, isParentVerified: e.target.checked })}
                                        className="w-4 h-4 rounded text-[var(--color-primary)]"
                                    />
                                    <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase">I have confirmed this meal data is correct</span>
                                </label>

                                {allergyWarnings.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-200 dark:border-red-900/40 flex items-start gap-3 animate-pulse shadow-sm">
                                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg text-red-600 dark:text-red-200">
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-red-800 dark:text-red-200 uppercase tracking-tight">Clinical Allergy Warning!</p>
                                            <p className="text-xs font-bold text-red-700 dark:text-red-300/80 mt-0.5 leading-relaxed">
                                                The AI detected items that may contain allergens: <span className="underline decoration-red-400 decoration-2">{allergyWarnings.map(i => i.name).join(', ')}</span>. Please review carefully.
                                            </p>
                                        </div>
                                    </div>
                                )}
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
                                    className={`w-2/3 py-4 font-bold rounded-xl shadow-lg transition-all ${loading ? '!bg-[var(--color-bg-card)] !text-[var(--color-text-main)] border border-green-500 shadow-none opacity-100'
                                        : !suppData.isParentVerified ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                                        }`}
                                    onClick={handleSaveVerified}
                                    disabled={loading || !suppData.isParentVerified}
                                    title={!suppData.isParentVerified ? 'Please confirm the meal data first' : ''}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-green-600" size={24} />
                                            <span className="uppercase tracking-widest font-black text-[var(--color-text-main)]">Finalizing...</span>
                                        </div>
                                    ) : "Save Log"}
                                </Button>
                            </div>
                        </div>
                    )}
                    {status === 'done' && (
                        <div className="w-full py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20 shadow-xl shadow-green-500/10">
                                <CheckCircle size={48} className="text-green-500 animate-in fade-in slide-in-from-bottom-2" />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="text-2xl font-black text-[var(--color-secondary)] uppercase italic">Log Saved Successfully!</h4>
                                <p className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest">The nutritionist has been notified of the new meal.</p>
                            </div>
                            <Button
                                onClick={resetForm}
                                className="px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 group"
                            >
                                <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                LOG ANOTHER MEAL
                            </Button>
                        </div>
                    )}
                </div>

                {/* CROP MODAL */}
                {isCropping && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-10">
                        <div className="relative w-full h-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                            <div className="p-6 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-500">
                                        <Crop size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase tracking-widest text-sm">Focus on the Meal</h3>
                                        <div className="flex gap-2 mt-1">
                                            {[
                                                { label: '1:1', val: 1 },
                                                { label: '4:3', val: 4 / 3 },
                                                { label: '16:9', val: 16 / 9 }
                                            ].map((r) => (
                                                <button
                                                    key={r.label}
                                                    onClick={() => setAspect(r.val)}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all",
                                                        aspect === r.val ? "bg-blue-600 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"
                                                    )}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCropping(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 relative bg-black">
                                <Cropper
                                    image={cropImage}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={aspect}
                                    onCropChange={setCrop}
                                    onCropComplete={handleCropComplete}
                                    onZoomChange={setZoom}
                                    onMediaLoaded={(mediaSize) => {
                                        if (mediaSize.width && mediaSize.height) {
                                            setAspect(mediaSize.width / mediaSize.height);
                                        }
                                    }}
                                />
                            </div>

                            <div className="p-8 bg-zinc-900 border-t border-white/10 flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase">
                                        <span>Zoom Level</span>
                                        <span>{Math.round(zoom * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(e.target.value)}
                                        className="w-full h-2 accent-blue-500 cursor-pointer bg-zinc-800 rounded-full"
                                    />
                                </div>
                                <Button
                                    onClick={handleConfirmCrop}
                                    className="w-full sm:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    Finish Cropping
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>


            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={confirmDeleteItem}
                title="Remove Food Item"
                message={`Are you sure you want to remove "${verifiedItems[itemIdxToDelete]?.name || 'this item'}" from the meal log?`}
                confirmText="Remove Item"
                isDestructive={true}
            />

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />
        </Card>
    );
}
