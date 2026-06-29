import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, CheckCircle, AlertTriangle, Save, Edit2, Info, ChefHat, Eye, EyeOff, Activity, Droplets, Pill, PieChart, ShieldAlert, Loader2, ZoomIn, ZoomOut, RotateCw, Maximize2, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Notification from './common/Notification';
import ConfirmDialog from './common/ConfirmDialog';
import { formatValue } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// ─── Allergen Detection Helpers (mirrors compliance.js logic) ─────────────────
const _normalizeAllergenTerm = (term) => {
    let t = String(term || '')
        .toLowerCase()
        .replace(/\ballergy\b/g, '')
        .replace(/\ballergies\b/g, '')
        .replace(/\ballergic\b/g, '')
        .replace(/\bto\b/g, '')
        .trim();
    if (t.endsWith('ies')) {
        t = t.slice(0, -3) + 'y';
    } else if (t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is') && !t.endsWith('as')) {
        t = t.slice(0, -1);
    }
    return t;
};

const _ALLERGEN_DERIVATIVES = {
    dairy: ['milk', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'cream', 'margarine', 'ghee', 'gelato', 'dairy', 'milk powder', 'condensed milk', 'buttermilk'],
    milk: ['milk', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'cream', 'margarine', 'ghee', 'gelato', 'dairy', 'milk powder', 'condensed milk', 'buttermilk'],
    gluten: ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'flour', 'bread', 'pasta', 'noodle', 'crust', 'dough', 'gluten', 'wheat flour'],
    wheat: ['wheat', 'barley', 'rye', 'semolina', 'spelt', 'flour', 'bread', 'pasta', 'noodle', 'crust', 'dough', 'gluten', 'wheat flour'],
    peanut: ['peanut', 'groundnut', 'arachis', 'peanut butter', 'peanut oil'],
    egg: ['egg', 'mayonnaise', 'meringue', 'ovalbumin', 'custard', 'egg yolk', 'egg white'],
    soy: ['soy', 'tofu', 'tempeh', 'edamame', 'shoyu', 'miso', 'soya', 'soy sauce'],
    soya: ['soy', 'tofu', 'tempeh', 'edamame', 'shoyu', 'miso', 'soya', 'soy sauce'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'sardine', 'anchovy', 'mackerel', 'tilapia', 'trout', 'haddock', 'patis'],
    shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'mussel', 'oyster', 'clam', 'scallop', 'shrimp paste', 'bagoong'],
    'tree nut': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'chestnut', 'ginkgo nut', 'pine nut', 'coconut', 'shea nut'],
    sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seed', 'til', 'gingelly'],
    mustard: ['mustard', 'mustard seed', 'mustard oil', 'mustard powder', 'dijon'],
    sulfite: ['sulfite', 'sulphite', 'sulfur dioxide', 'sodium bisulfite', 'wine', 'vinegar', 'dried fruit'],
    corn: ['corn', 'cornstarch', 'corn starch', 'corn syrup', 'maize', 'cornmeal', 'popcorn', 'polenta', 'hominy', 'corn oil'],
    celery: ['celery', 'celery seed', 'celery salt', 'celeriac'],
    lupin: ['lupin', 'lupine', 'lupin flour', 'lupin seed', 'lupin bean'],
    mollusc: ['squid', 'octopus', 'cuttlefish', 'abalone', 'snail', 'clam', 'mussel', 'oyster', 'scallop'],
    garlic: ['garlic', 'garlic powder', 'garlic oil', 'garlic salt', 'aioli'],
    onion: ['onion', 'onion powder', 'shallot', 'scallion', 'leek', 'chive'],
    chocolate: ['chocolate', 'cocoa', 'cacao', 'cocoa powder', 'cocoa butter', 'milo', 'chocolate syrup', 'fudge'],
    cocoa: ['chocolate', 'cocoa', 'cacao', 'cocoa powder', 'cocoa butter', 'milo', 'chocolate syrup', 'fudge'],
    strawberry: ['strawberry', 'strawberries', 'strawberry jam', 'strawberry syrup', 'strawberry extract'],
    'citrus fruit': ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'calamansi', 'pomelo', 'yuzu', 'mandarin', 'citric acid', 'lemon juice', 'lime juice', 'orange juice'],
    citrus: ['citrus', 'lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'calamansi', 'pomelo', 'yuzu', 'mandarin', 'citric acid', 'lemon juice', 'lime juice', 'orange juice'],
    kiwi: ['kiwi', 'kiwifruit', 'kiwi extract', 'kiwi jam'],
    pineapple: ['pineapple', 'pineapple juice', 'pineapple syrup', 'ananas'],
    honey: ['honey', 'honeycomb', 'honey syrup'],
    beef: ['beef', 'beef broth', 'beef stock', 'beef tallow', 'steak', 'veal'],
    chicken: ['chicken', 'chicken broth', 'chicken stock', 'poultry'],
    pork: ['pork', 'lard', 'bacon', 'ham', 'pork rind', 'chorizo', 'pork sausage', 'pepperoni'],
    'food dye': ['red 40', 'yellow 5', 'yellow 6', 'blue 1', 'blue 2', 'green 3', 'allura red', 'tartrazine', 'sunset yellow', 'carmine', 'cochineal', 'artificial color', 'food dye', 'food color'],
    additive: ['msg', 'monosodium glutamate', 'preservative', 'artificial flavor', 'carrageenan', 'sulfite', 'aspartame', 'sodium benzoate']
};

const _isAllergyBypassed = (allergenOrDeriv, itemName) => {
    const lowerItem = String(itemName || '').toLowerCase();
    const lowerAllergen = String(allergenOrDeriv || '').toLowerCase();
    if (lowerAllergen === 'egg' && lowerItem.includes('eggplant')) return true;
    if (lowerAllergen === 'butter' && (
        lowerItem.includes('peanut butter') || lowerItem.includes('cocoa butter') ||
        lowerItem.includes('shea butter') || lowerItem.includes('butternut')
    )) return true;
    if (lowerAllergen === 'milk' && (
        lowerItem.includes('coconut milk') || lowerItem.includes('soy milk') ||
        lowerItem.includes('almond milk') || lowerItem.includes('oat milk') || lowerItem.includes('rice milk')
    )) return true;
    if ((lowerAllergen === 'milk' || lowerAllergen === 'dairy') && lowerItem.includes('cocoa butter')) return true;
    if ((lowerAllergen === 'wheat' || lowerAllergen === 'gluten') && lowerItem.includes('buckwheat')) return true;
    return false;
};

/**
 * Returns true if itemName triggers any of the profile's recorded allergies.
 * Uses full derivative + bypass engine (same as backend compliance check).
 */
const _itemHasAllergen = (itemName, allergies) => {
    const lower = String(itemName || '').toLowerCase();
    const words = lower.split(/\s+/).map(w => _normalizeAllergenTerm(w));
    return allergies.some(a => {
        if (!a || typeof a !== 'string') return false;
        return a.split(/[,/;]+/).some(sub => {
            const allergen = _normalizeAllergenTerm(sub);
            if (!allergen || allergen === 'none') return false;
            if ((lower.includes(allergen) || words.includes(allergen)) && !_isAllergyBypassed(allergen, lower)) return true;
            const derivs = _ALLERGEN_DERIVATIVES[allergen] || [];
            return derivs.some(d => (lower.includes(d) || words.includes(d)) && !_isAllergyBypassed(d, lower));
        });
    });
};
// ─── End Allergen Detection Helpers ──────────────────────────────────────────

const renderMedicalHistoryObject = (history) => {
    if (!history) return 'None recorded';
    const parts = [];
    if (history.diagnoses) parts.push(`Diagnoses: ${history.diagnoses}`);
    if (history.past_conditions) parts.push(`Past Conditions: ${history.past_conditions}`);
    if (history.hospitalizations) parts.push(`Hospitalizations: ${history.hospitalizations}`);
    
    if (parts.length === 0) {
        Object.entries(history).forEach(([key, val]) => {
            if (val) {
                const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                parts.push(`${formattedKey}: ${val}`);
            }
        });
    }
    return parts.join(' | ') || 'None recorded';
};


export default function ReviewLogModal({ isOpen, onClose, log, onReviewComplete }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [review, setReview] = useState('');
    const [editedAnalysis, setEditedAnalysis] = useState(null);
    const [editedWater, setEditedWater] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollRef = useRef(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = React.useRef(0);

    // Zoom/Pan/Rotate states for image lightbox
    const [imgScale, setImgScale] = useState(1);
    const [imgPosition, setImgPosition] = useState({ x: 0, y: 0 });
    const [imgRotation, setImgRotation] = useState(0);
    const [isImgDragging, setIsImgDragging] = useState(false);
    const imageRef = useRef(null);
    const imgScaleRef = useRef(1);
    const imgPositionRef = useRef({ x: 0, y: 0 });
    const imgDragStartRef = useRef({ x: 0, y: 0 });
    const imgDragStartPosRef = useRef({ x: 0, y: 0 });
    const imgDragTotalDistRef = useRef(0);

    // Keep zoom refs in sync
    useEffect(() => { imgScaleRef.current = imgScale; }, [imgScale]);
    useEffect(() => { imgPositionRef.current = imgPosition; }, [imgPosition]);

    // Wheel-to-zoom on the lightbox image
    useEffect(() => {
        const img = imageRef.current;
        if (!img || !previewImage) return;
        const onWheelEvent = (e) => {
            e.preventDefault();
            const zoomStep = 0.2;
            const direction = e.deltaY < 0 ? 1 : -1;
            const prevScale = imgScaleRef.current;
            const newScale = Math.max(1, Math.min(4, prevScale + direction * zoomStep));
            if (newScale === prevScale) return;
            if (newScale === 1) {
                setImgScale(1);
                setImgPosition({ x: 0, y: 0 });
            } else {
                const container = img.parentElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const cursorX = e.clientX - (rect.left + rect.width / 2);
                    const cursorY = e.clientY - (rect.top + rect.height / 2);
                    const prevPos = imgPositionRef.current;
                    const factor = newScale / prevScale;
                    setImgScale(newScale);
                    setImgPosition({
                        x: cursorX - (cursorX - prevPos.x) * factor,
                        y: cursorY - (cursorY - prevPos.y) * factor
                    });
                }
            }
        };
        img.addEventListener('wheel', onWheelEvent, { passive: false });
        return () => img.removeEventListener('wheel', onWheelEvent);
    }, [previewImage]);

    const handleImgZoomIn = () => setImgScale(prev => Math.min(prev + 0.25, 4));
    const handleImgZoomOut = () => setImgScale(prev => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setImgPosition({ x: 0, y: 0 });
        return next;
    });
    const handleImgRotate = () => setImgRotation(prev => (prev + 90) % 360);
    const handleImgReset = () => { setImgScale(1); setImgPosition({ x: 0, y: 0 }); setImgRotation(0); };

    const handleImgPointerDown = (e) => {
        if (imgScale <= 1) return;
        e.preventDefault();
        try { e.target.setPointerCapture(e.pointerId); } catch (err) { console.error(err); }
        setIsImgDragging(true);
        imgDragStartRef.current = { x: e.clientX, y: e.clientY };
        imgDragStartPosRef.current = { ...imgPositionRef.current };
        imgDragTotalDistRef.current = 0;
    };
    const handleImgPointerMove = (e) => {
        if (!isImgDragging) return;
        e.preventDefault();
        const dx = e.clientX - imgDragStartRef.current.x;
        const dy = e.clientY - imgDragStartRef.current.y;
        imgDragTotalDistRef.current = Math.sqrt(dx * dx + dy * dy);
        setImgPosition({ x: imgDragStartPosRef.current.x + dx, y: imgDragStartPosRef.current.y + dy });
    };
    const handleImgPointerUp = (e) => {
        if (!isImgDragging) return;
        try { e.target.releasePointerCapture(e.pointerId); } catch (err) { console.error(err); }
        setIsImgDragging(false);
        if (imgDragTotalDistRef.current < 5) {
            // toggle zoom on click
            if (imgScale > 1) {
                handleImgReset();
            } else {
                const img = imageRef.current;
                const container = img?.parentElement;
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const cursorX = e.clientX - (rect.left + rect.width / 2);
                    const cursorY = e.clientY - (rect.top + rect.height / 2);
                    const targetScale = 2.5;
                    setImgScale(targetScale);
                    setImgPosition({ x: cursorX - cursorX * targetScale, y: cursorY - cursorY * targetScale });
                }
            }
        }
    };

    const closeLightbox = () => { setPreviewImage(null); handleImgReset(); };

    const handleCloseWithAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 400);
    }, [onClose]);

    const handleTouchStart = React.useCallback((e) => {
        if (window.innerWidth >= 1024) return;
        dragStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    }, []);

    const handleTouchMove = React.useCallback((e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - dragStartY.current;
        if (deltaY > 0) {
            setDragY(deltaY);
        } else {
            setDragY(0);
        }
    }, [isDragging]);

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

    const isDirty = React.useCallback(() => {
        if (!log || !editedAnalysis) return false;
        const initialReview = log.nutritionist_review?.comment || '';
        const initialAnalysis = JSON.stringify(log.nutritionist_review?.verified_analysis || log.ai_analysis || { items: [], total_calories_est: 0, macros_est: { protein_g: 0, carbs_g: 0, fat_g: 0 } });
        const currentAnalysis = JSON.stringify(editedAnalysis);

        const isReviewDirty = review !== initialReview;
        const isAnalysisDirty = initialAnalysis !== currentAnalysis;
        const isWaterDirty = editedWater !== (log.water_ml || 0);

        return isReviewDirty || isAnalysisDirty || isWaterDirty;
    }, [log, editedAnalysis, review, editedWater]);

    const handleDismiss = React.useCallback(() => {
        if (isDirty()) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Clinical Edits?',
                message: 'You have modified the nutritional analysis or added professional comments. Are you sure you want to discard these changes?',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    handleCloseWithAnimation();
                }
            });
        } else {
            handleCloseWithAnimation();
        }
    }, [isDirty, handleCloseWithAnimation]);

    const handleTouchEnd = React.useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        if (dragY > 120) {
            handleDismiss();
        } else {
            setDragY(0);
        }
    }, [isDragging, dragY, handleDismiss]);

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (previewImage) {
                    closeLightbox();
                } else {
                    handleDismiss();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, previewImage, handleDismiss]);

    // Prevent background scrolling when modal is open
    const loadedLogIdRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            
            // Lock body scroll securely
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';

            // Allow the closed state to paint first, then trigger slide up animation
            const timer = setTimeout(() => {
                setIsMounted(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsMounted(false);
            setIsClosing(false);
            loadedLogIdRef.current = null;
            
            // Release body scroll
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setNotif({ show: false, message: '', type: 'success' });
        }
    }, [isOpen]);

    useEffect(() => {
        if (log && isOpen) {
            // Only re-initialize state if a different log is loaded or if it's the first load
            if (loadedLogIdRef.current !== log.id) {
                setReview(log.nutritionist_review?.comment || '');
                setEditedAnalysis(log.nutritionist_review?.verified_analysis || log.ai_analysis || { items: [], total_calories_est: 0, macros_est: { protein_g: 0, carbs_g: 0, fat_g: 0 } });
                setEditedWater(log.water_ml || 0);
                setNotif({ show: false, message: '', type: 'success' });
                loadedLogIdRef.current = log.id;
            }
        }
    }, [log?.id, isOpen]);

    const macros = editedAnalysis?.macros_est || {};

    const detectedAllergens = React.useMemo(() => {
        const profileAllergies = log?.profile?.allergies || [];
        if (!log || profileAllergies.length === 0 || !editedAnalysis?.items) return [];
        const found = [];
        editedAnalysis.items.forEach(item => {
            const itemName = String(item.name || '').toLowerCase();
            const itemWords = itemName.split(/\s+/).map(w => _normalizeAllergenTerm(w));
            profileAllergies.forEach(a => {
                if (!a || typeof a !== 'string') return;
                a.split(/[,/;]+/).forEach(sub => {
                    const allergen = _normalizeAllergenTerm(sub);
                    if (!allergen || allergen === 'none') return;
                    const isSubstr = itemName.includes(allergen);
                    const isWordMatch = itemWords.includes(allergen);
                    const isBypassed = _isAllergyBypassed(allergen, itemName);
                    let isAllergic = (isSubstr || isWordMatch) && !isBypassed;
                    let matchedDerivative = null;
                    if (!isAllergic) {
                        const derivs = _ALLERGEN_DERIVATIVES[allergen] || [];
                        for (const d of derivs) {
                            if ((itemName.includes(d) || itemWords.includes(d)) && !_isAllergyBypassed(d, itemName)) {
                                isAllergic = true;
                                matchedDerivative = d;
                                break;
                            }
                        }
                    }
                    if (isAllergic && !found.some(f => f.item === item.name && f.allergen === a)) {
                        found.push({ item: item.name, allergen: a, derivative: matchedDerivative });
                    }
                });
            });
        });

        // Check hidden ingredients
        const hiddenText = String(log.hidden_ingredients || '').toLowerCase().trim();
        if (hiddenText) {
            const hiddenTokens = hiddenText.split(/[,/;\s\b(and)\b\b(or)\b\b(with)\b]+/i).map(w => _normalizeAllergenTerm(w));
            profileAllergies.forEach(a => {
                if (!a || typeof a !== 'string') return;
                a.split(/[,/;]+/).forEach(sub => {
                    const allergen = _normalizeAllergenTerm(sub);
                    if (!allergen || allergen === 'none') return;
                    const isSubstr = hiddenText.includes(allergen);
                    const isWordMatch = hiddenTokens.includes(allergen);
                    const isBypassed = _isAllergyBypassed(allergen, hiddenText);

                    let isAllergic = (isSubstr || isWordMatch) && !isBypassed;
                    let matchedDerivative = null;

                    if (!isAllergic) {
                        const derivs = _ALLERGEN_DERIVATIVES[allergen] || [];
                        for (const d of derivs) {
                            if ((hiddenText.includes(d) || hiddenTokens.includes(d)) && !_isAllergyBypassed(d, hiddenText)) {
                                isAllergic = true;
                                matchedDerivative = d;
                                break;
                            }
                        }
                    }

                    if (isAllergic && !found.some(f => f.item === 'Hidden Ingredients' && f.allergen === a)) {
                        found.push({ item: 'Hidden Ingredients', allergen: a, derivative: matchedDerivative });
                    }
                });
            });
        }

        return found;
    }, [editedAnalysis?.items, log]);

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
                status: 'verified',
                water_ml: editedWater
            });
            showNotif("Meal log successfully verified", "success");

            // Premium Sequence: Close modal first, then update background data after animation
            setTimeout(() => {
                setIsClosing(true);
                setTimeout(() => {
                    onClose();
                    setTimeout(() => {
                        onReviewComplete?.();
                    }, 300); // Wait for exit animation to complete
                }, 400);
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
                status: 'reviewed',
                water_ml: editedWater
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
                status: 'rejected',
                water_ml: editedWater
            });
            showNotif("Meal log rejected", "info");

            // Premium Sequence: Close modal first, then update background data after animation
            setTimeout(() => {
                setIsClosing(true);
                setTimeout(() => {
                    onClose();
                    setTimeout(() => {
                        onReviewComplete?.();
                    }, 300); // Wait for exit animation to complete
                }, 400);
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


    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const dragProgress = Math.min(dragY / 300, 1);
    const backdropOpacity = isMounted && !isClosing ? (1 - dragProgress) : 0;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4 overflow-hidden overscroll-none">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    style={{
                        opacity: backdropOpacity,
                        transition: isDragging ? 'none' : 'opacity 0.4s ease-out'
                    }}
                    onClick={handleDismiss}
                />
                
                {/* Modal Container */}
                <div
                    className="w-full sm:max-w-6xl relative h-full sm:h-[90vh] flex flex-col lg:flex-row shadow-2xl sm:rounded-[2.5rem] overflow-hidden border-0 sm:border-2 border-white/10 transform z-10"
                    style={{
                        transform: isDragging
                            ? `translateY(${dragY}px)`
                            : (isMounted && !isClosing ? 'translateY(0)' : 'translateY(100%)'),
                        opacity: isClosing ? 0 : 1,
                        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease-out'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mobile Drag Handle */}
                    <div
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="w-full flex justify-center py-2.5 lg:hidden bg-[var(--color-bg-card)] cursor-grab active:cursor-grabbing flex-shrink-0 select-none z-50 border-b border-[var(--color-divider)]"
                    >
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full" />
                    </div>

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
                                    <p className="text-xs text-blue-100/80 italic leading-relaxed">
                                        {typeof log.profile.medical_history === 'string'
                                            ? log.profile.medical_history
                                            : renderMedicalHistoryObject(log.profile.medical_history)
                                        }
                                    </p>
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
                            onClick={handleDismiss}
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

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-0 lg:p-12 scrollbar-thin scrollbar-thumb-[var(--color-divider)] scrollbar-track-transparent overscroll-contain">
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
                                <div 
                                    className="px-5 py-4 bg-[var(--color-bg-card)] cursor-grab active:cursor-grabbing"
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <div className="flex justify-between items-center mb-1 pointer-events-none">
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
                                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border-2 transition-all ${(editedAnalysis?.plate_waste ?? 100) === pct
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
                                    {/* Water Card */}
                                    <div className="bg-[var(--color-bg-page)] p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)] hover:shadow-xl transition-all shadow-lg shadow-black/5">
                                        <p className="text-xs font-black uppercase mb-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform" style={{ color: "#3b82f6" }}>
                                            <Droplets size={16} /> Water
                                        </p>
                                        {isEditing ? (
                                            <select
                                                value={editedWater}
                                                onChange={(e) => setEditedWater(parseInt(e.target.value))}
                                                className="w-full mt-1 bg-[var(--color-bg-card)] text-[var(--color-text-main)] text-xs font-black uppercase tracking-tight rounded-xl border-2 border-[var(--color-divider)] p-2 focus:border-[var(--color-primary)] outline-none transition-all cursor-pointer font-bold"
                                            >
                                                <option value={0}>0 Glasses (0 ml)</option>
                                                <option value={250}>1 Glass (250 ml)</option>
                                                <option value={500}>2 Glasses (500 ml)</option>
                                                <option value={750}>3 Glasses (750 ml)</option>
                                                <option value={1000}>4 Glasses (1000 ml)</option>
                                                <option value={1250}>5 Glasses (1250 ml)</option>
                                                <option value={1500}>6 Glasses (1500 ml)</option>
                                                <option value={1750}>7 Glasses (1750 ml)</option>
                                                <option value={2000}>8 Glasses (2000 ml)</option>
                                                <option value={2250}>9 Glasses (2250 ml)</option>
                                                <option value={2500}>10 Glasses (2500 ml)</option>
                                                {![0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500].includes(editedWater) && (
                                                    <option value={editedWater}>{Math.round(editedWater / 250 * 10) / 10} Glasses ({editedWater} ml)</option>
                                                )}
                                            </select>
                                        ) : (
                                            <div className="text-sm sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">
                                                {editedWater ? `${editedWater}ml` : 'None'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tools Card */}
                                    <div className="bg-[var(--color-bg-page)] p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)] hover:shadow-xl transition-all shadow-lg shadow-black/5">
                                        <p className="text-xs font-black uppercase mb-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform" style={{ color: "#6366f1" }}>
                                            <Info size={16} /> Tools
                                        </p>
                                        <div className="text-sm sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">
                                            {log.serving_spoon_used ? 'Standard Spoon' : 'Estimated'}
                                        </div>
                                    </div>

                                    {/* Exercise Card */}
                                    <div className="bg-[var(--color-bg-page)] p-4 sm:p-5 rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)] hover:shadow-xl transition-all shadow-lg shadow-black/5">
                                        <p className="text-xs font-black uppercase mb-2 flex items-center gap-2 group-hover:translate-x-1 transition-transform" style={{ color: "#f59e0b" }}>
                                            <Activity size={16} /> Exercise
                                        </p>
                                        <div className="text-sm sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">
                                            {log.physical_activity || 'None'}
                                        </div>
                                    </div>
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
                                                    {_itemHasAllergen(item.name, log?.profile?.allergies || []) && (
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
                                                                    {formatValue(item[macro.key], user?.nutrient_precision)}
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
                                                    {formatValue(sum.val, user?.nutrient_precision)}
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
                                        {loading ? <Loader2 size={15} className="animate-spin mr-1" /> : <CheckCircle size={15} />}
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
                                            {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <CheckCircle size={13} />}
                                            {loading ? 'Processing...' : 'Verify Meal'}
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Image Preview Lightbox */}
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 animate-in fade-in duration-300"
                        onClick={closeLightbox}
                    >
                        <button
                            onClick={closeLightbox}
                            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-4 bg-white/5 rounded-full border border-white/10 z-[210] cursor-pointer"
                        >
                            <X size={32} />
                        </button>
                        <div
                            className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Image Preview</h2>
                                <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-[0.3em]">Scroll or pinch to zoom • Drag to pan • Click to toggle</p>
                            </div>
                            <div className="flex-1 w-full max-h-[70vh] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/50 flex items-center justify-center relative select-none">
                                <img
                                    ref={imageRef}
                                    src={previewImage}
                                    alt="Preview"
                                    onPointerDown={handleImgPointerDown}
                                    onPointerMove={handleImgPointerMove}
                                    onPointerUp={handleImgPointerUp}
                                    onPointerLeave={handleImgPointerUp}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        transform: `translate(${imgPosition.x}px, ${imgPosition.y}px) scale(${imgScale}) rotate(${imgRotation}deg)`,
                                        cursor: imgScale > 1 ? (isImgDragging ? 'grabbing' : 'grab') : 'zoom-in',
                                        transition: isImgDragging ? 'none' : 'transform 0.15s ease-out',
                                        touchAction: 'none'
                                    }}
                                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50 border border-white/10 select-none"
                                />
                            </div>

                            {/* Control Toolbar */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-5 z-[210] animate-in slide-in-from-bottom-5">
                                <button onClick={handleImgZoomOut} className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer" title="Zoom Out">
                                    <ZoomOut size={20} />
                                </button>
                                <span className="text-white/60 text-xs font-black font-mono w-10 text-center select-none">
                                    {Math.round(imgScale * 100)}%
                                </span>
                                <button onClick={handleImgZoomIn} className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer" title="Zoom In">
                                    <ZoomIn size={20} />
                                </button>
                                <div className="w-px h-4 bg-white/20" />
                                <button onClick={handleImgRotate} className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer" title="Rotate Clockwise">
                                    <RotateCw size={18} />
                                </button>
                                <button onClick={handleImgReset} className="text-white/75 hover:text-white p-1 transition-colors cursor-pointer" title="Reset View">
                                    <Maximize2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    isDestructive={true}
                />
            </div>
        </>,
        document.body
    );
}
