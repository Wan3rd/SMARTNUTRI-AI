import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Calendar, Baby, Activity, Info, Loader2, X, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Plus, ChevronDown } from 'lucide-react';
import { Button } from './common/Button';
import { Card, CardContent } from './common/Card';
import api from '../lib/api';
import VaccinationStep from './VaccinationStep';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const DIETARY_OPTIONS = [
    "Omnivore (No restrictions)", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Lactose-Free", "Pescatarian"
];

const ALLERGY_OPTIONS = [
    "None",
    "Peanuts",
    "Tree Nuts",
    "Milk/Dairy",
    "Eggs",
    "Wheat/Gluten",
    "Soy",
    "Fish",
    "Shellfish",
    "Sesame",
    "Mustard",
    "Sulfites",
    "Corn",
    "Nightshades",
    "Legumes"
];

const STEPS = [
    { title: 'Basic Info', icon: Baby },
    { title: 'Measurements', icon: Activity },
    { title: 'Vaccines', icon: ShieldCheck },
    { title: 'Dietary', icon: Info }
];

const getDaysInMonth = (monthStr, yearStr) => {
    if (!monthStr) return 31;
    const month = parseInt(monthStr);
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
    return new Date(year, month, 0).getDate();
};
const MONTHS = [
    { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
    { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
    { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
];
const YEARS = Array.from({ length: 22 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function AddChildModal({ isOpen, onClose, onChildAdded, parentId = null }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const isSubmitting = useRef(false);
    const [isAllergiesDropdownOpen, setIsAllergiesDropdownOpen] = useState(false);

    const [dobParts, setDobParts] = useState({
        day: '01',
        month: '01',
        year: new Date().getFullYear().toString()
    });

    const daysCount = getDaysInMonth(dobParts.month, dobParts.year);
    const DAYS = Array.from({ length: daysCount }, (_, i) => (i + 1).toString().padStart(2, '0'));

    const [formData, setFormData] = useState({
        childName: '',
        dateOfBirth: '',
        gender: 'Male',
        heightCm: '',
        weightKg: '',
        activityLevel: 'Moderate',
        allergies: ['None'],
        dietaryPreferences: [],
        vaccinations: []
    });

    // Ensure day is valid for selected month and year
    React.useEffect(() => {
        const maxDays = getDaysInMonth(dobParts.month, dobParts.year);
        if (parseInt(dobParts.day) > maxDays) {
            setDobParts(prev => ({
                ...prev,
                day: maxDays.toString().padStart(2, '0')
            }));
        }
    }, [dobParts.month, dobParts.year, dobParts.day]);

    // Sync DOB parts to formData
    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            dateOfBirth: `${dobParts.year}-${dobParts.month}-${dobParts.day}`
        }));
    }, [dobParts]);

    // Early return removed to allow exit animations via AnimatePresence

    const validateStep = (targetStep = step) => {
        if (targetStep >= 1) {
            if (!formData.childName.trim()) {
                setMessage({ type: 'error', text: "Please enter the child's name before continuing." });
                return false;
            }
            const dob = new Date(formData.dateOfBirth);
            if (dob > new Date()) {
                setMessage({ type: 'error', text: "Date of birth cannot be in the future." });
                return false;
            }
        }
        if (targetStep >= 2) {
            const h = parseFloat(formData.heightCm);
            const w = parseFloat(formData.weightKg);
            if (!formData.heightCm || isNaN(h) || h < 30 || h > 250) {
                setMessage({ type: 'error', text: "Please enter a valid height between 30 and 250 cm." });
                return false;
            }
            if (!formData.weightKg || isNaN(w) || w < 1 || w > 300) {
                setMessage({ type: 'error', text: "Please enter a valid weight between 1 and 300 kg." });
                return false;
            }
        }
        if (targetStep >= 3) {
            if (formData.allergies.length === 0) {
                setMessage({ type: 'error', text: "Please select at least one allergy option (or 'None')." });
                return false;
            }
        }
        setMessage({ type: '', text: '' });
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 4));
        }
    };

    const handleBack = () => {
        setMessage({ type: '', text: '' });
        setStep(prev => Math.max(prev - 1, 1));
    };

    const toggleOption = (list, item, setList) => {
        // Clear errors when user interacts
        setMessage({ type: '', text: '' });
        if (item === 'None') {
            setList(['None']);
            return;
        }
        const newList = list.includes(item)
            ? list.filter(i => i !== item)
            : [...list.filter(i => i !== 'None'), item];
        setList(newList);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isSubmitting.current) return;

        // If not on the final step, just try to go to the next step
        if (step < 4) {
            handleNext();
            return;
        }

        // Only on the final step do we validate everything and submit
        if (!validateStep(4)) return;

        isSubmitting.current = true;
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                parentId,
                child_name: formData.childName,
                date_of_birth: formData.dateOfBirth,
                gender: formData.gender,
                height_cm: formData.heightCm,
                weight_kg: formData.weightKg,
                activity_level: formData.activityLevel.toLowerCase(),
                allergies: formData.allergies,
                dietary_preferences: formData.dietaryPreferences.join(', '),
                vaccinations: formData.vaccinations
            };

            if (parentId) {
                await api.post('/nutritionist/create-client', payload);
            } else {
                await api.post('/profiles', payload);
            }

            setMessage({ type: 'success', text: 'New clinical profile created!' });

            if (onChildAdded) onChildAdded();

            setTimeout(() => {
                onClose();
                setStep(1);
                setFormData({
                    childName: '', dateOfBirth: '', gender: 'Male', heightCm: '', weightKg: '',
                    activityLevel: 'Moderate', allergies: ['None'], dietaryPreferences: [], vaccinations: []
                });
                setMessage({ type: '', text: '' });
                isSubmitting.current = false;
            }, 2000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create profile' });
            isSubmitting.current = false;
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl flex flex-col"
                    >
                <Card className="w-full h-full sm:h-auto sm:max-h-[90vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col bg-[var(--color-bg-card)]">
                    <CardContent className="p-0 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="bg-[var(--color-primary)] p-6 sm:p-8 text-white relative flex-shrink-0">
                            <button onClick={() => !loading && onClose()} disabled={loading} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-1 sm:mb-2">Add New Profile</h2>
                            <p className="text-white/80 font-bold text-[10px] sm:text-sm">Register a new child to the SmartNutri-AI clinical engine</p>

                            {/* Progress */}
                            <div className="flex gap-4 mt-8">
                                {STEPS.map((s, i) => (
                                    <div key={i} className="flex-1 flex items-center gap-2">
                                        <div className={`h-1.5 flex-1 rounded-full ${step > i ? 'bg-white' : 'bg-white/30'} transition-all`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <form className="flex-1 flex flex-col min-h-0" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>
                            <fieldset disabled={loading} className="border-none p-0 m-0" style={{ display: 'contents' }}>
                                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 scrollbar-thin">
                                {message.text && (
                                    <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'}`}>
                                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                                        {message.text}
                                    </div>
                                )}

                                {/* Step 1: Basic Info */}
                                {step === 1 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="p-3.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl text-[11px] sm:text-xs font-semibold flex items-start gap-3 select-none">
                                            <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                                            <div>
                                                <span className="font-black uppercase tracking-widest text-[9px] text-[var(--color-primary)] mb-1 block">Step 1: Child Identity</span>
                                                <span className="text-[var(--color-text-main)] opacity-70">Enter your child's name, date of birth, and gender. This basic information establishes their custom pediatric profile to customize all nutritional analytics.</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Child's Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
                                                <input
                                                    type="text" required value={formData.childName}
                                                    onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                                                    className="w-full h-11 pl-12 pr-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                    placeholder="Enter full name"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <select
                                                        value={dobParts.month}
                                                        onChange={(e) => setDobParts({ ...dobParts, month: e.target.value })}
                                                        className="h-11 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                    >
                                                        {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                                    </select>
                                                    <select
                                                        value={dobParts.day}
                                                        onChange={(e) => setDobParts({ ...dobParts, day: e.target.value })}
                                                        className="h-11 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                    >
                                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                    <select
                                                        value={dobParts.year}
                                                        onChange={(e) => setDobParts({ ...dobParts, year: e.target.value })}
                                                        className="h-11 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                    >
                                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Gender</label>
                                                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border-2 border-[var(--color-divider)] relative overflow-hidden">
                                                    {['Male', 'Female'].map(g => {
                                                        const isSelected = formData.gender === g;
                                                        return (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                onClick={() => !loading && setFormData({ ...formData, gender: g })}
                                                                className="flex-1 h-10 rounded-xl text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 select-none cursor-pointer text-center flex items-center justify-center"
                                                                style={{
                                                                    color: isSelected
                                                                        ? 'var(--color-primary)'
                                                                        : 'var(--color-text-muted)'
                                                                }}
                                                            >
                                                                {isSelected && (
                                                                    <motion.div
                                                                        layoutId="activeGenderBg"
                                                                        className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-sm z-[-1]"
                                                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                                    />
                                                                )}
                                                                {g}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Measurements */}
                                {step === 2 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="p-3.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl text-[11px] sm:text-xs font-semibold flex items-start gap-3 select-none">
                                            <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                                            <div>
                                                <span className="font-black uppercase tracking-widest text-[9px] text-[var(--color-primary)] mb-1 block">Step 2: Growth Metrics</span>
                                                <span className="text-[var(--color-text-main)] opacity-70">Provide height and weight records. SmartNutri-AI uses these parameters to evaluate real-time growth progress against the standard World Health Organization (WHO) growth charts.</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Height (cm)</label>
                                                <input
                                                    type="number" required value={formData.heightCm}
                                                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                                                    className="w-full h-11 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                    placeholder="e.g. 110"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Weight (kg)</label>
                                                <input
                                                    type="number" required value={formData.weightKg}
                                                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                                                    className="w-full h-11 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                    placeholder="e.g. 20"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Activity Level</label>
                                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border-2 border-[var(--color-divider)] relative overflow-hidden">
                                                {[
                                                    { id: 'sedentary', label: 'Sedentary' },
                                                    { id: 'moderate', label: 'Moderate' },
                                                    { id: 'highly_active', label: 'Highly Active' }
                                                ].map(act => {
                                                    const isSelected = formData.activityLevel.toLowerCase() === act.id;
                                                    return (
                                                        <button
                                                            key={act.id}
                                                            type="button"
                                                            onClick={() => !loading && setFormData({ ...formData, activityLevel: act.id })}
                                                            className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-300 select-none cursor-pointer text-center flex items-center justify-center px-1"
                                                            style={{
                                                                color: isSelected
                                                                    ? 'var(--color-primary)'
                                                                    : 'var(--color-text-muted)'
                                                            }}
                                                        >
                                                            {isSelected && (
                                                                <motion.div
                                                                    layoutId="activeActivityBg"
                                                                    className="absolute inset-0 bg-white dark:bg-white/10 rounded-xl shadow-sm z-[-1]"
                                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                                />
                                                            )}
                                                            {act.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Vaccines */}
                                {step === 3 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="p-3.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl text-[11px] sm:text-xs font-semibold flex items-start gap-3 select-none">
                                            <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                                            <div>
                                                <span className="font-black uppercase tracking-widest text-[9px] text-[var(--color-primary)] mb-1 block">Step 3: Immunization History</span>
                                                <span className="text-[var(--color-text-main)] opacity-70">Enter previous and scheduled vaccinations. Keeping accurate records helps the medical engine send alerts for upcoming dose windows. (Optional)</span>
                                            </div>
                                        </div>
                                        <VaccinationStep
                                            formData={formData}
                                            setFormData={setFormData}
                                            disabled={loading}
                                        />
                                    </div>
                                )}

                                {/* Step 4: Dietary */}
                                {step === 4 && (
                                    <div className="space-y-4 animate-in slide-in-from-right-4">
                                        <div className="p-3.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl text-[11px] sm:text-xs font-semibold flex items-start gap-3 select-none">
                                            <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                                            <div>
                                                <span className="font-black uppercase tracking-widest text-[9px] text-[var(--color-primary)] mb-1 block">Step 4: Allergy & Diet Safeguards</span>
                                                <span className="text-[var(--color-text-main)] opacity-70">Select active dietary preferences and any known food allergies. The SmartNutri-AI meal scanner will automatically flag hazardous ingredients based on these parameters.</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block mb-2 text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Allergies</label>

                                            <div className="mb-4 relative">
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => setIsAllergiesDropdownOpen(!isAllergiesDropdownOpen)}
                                                    className={cn(
                                                        "w-full h-11 px-4 flex items-center justify-between rounded-xl border-2 transition-all cursor-pointer bg-[var(--color-bg-page)]",
                                                        isAllergiesDropdownOpen ? "border-[var(--color-danger)]/50 ring-4 ring-[var(--color-danger)]/10" : "border-[var(--color-divider)]"
                                                    )}
                                                >
                                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate flex items-center">
                                                        <Plus size={14} className="inline mr-2 text-[var(--color-text-muted)]" /> <span>Add Allergy...</span>
                                                    </span>
                                                    <ChevronDown size={14} className={cn("transition-transform duration-200 text-[var(--color-text-muted)] flex-shrink-0", isAllergiesDropdownOpen && "rotate-180")} />
                                                </button>

                                                {isAllergiesDropdownOpen && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={() => setIsAllergiesDropdownOpen(false)}
                                                        />
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="absolute top-full left-0 w-full mt-2 p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-thin"
                                                        >
                                                            {ALLERGY_OPTIONS.map(option => {
                                                                const isSelected = formData.allergies.includes(option);
                                                                if (isSelected) return null;

                                                                return (
                                                                    <button
                                                                        key={option}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (option === 'None') {
                                                                                setFormData(prev => ({ ...prev, allergies: ['None'] }));
                                                                            } else {
                                                                                let newAllergies = formData.allergies.filter(a => a !== 'None');
                                                                                newAllergies.push(option);
                                                                                setFormData(prev => ({ ...prev, allergies: newAllergies }));
                                                                            }
                                                                            setIsAllergiesDropdownOpen(false);
                                                                        }}
                                                                        className="w-full text-left p-3 rounded-xl hover:bg-[var(--color-danger)]/10 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] transition-colors border-l-4 border-transparent hover:border-[var(--color-danger)]"
                                                                    >
                                                                        {option}
                                                                    </button>
                                                                );
                                                            })}
                                                            {ALLERGY_OPTIONS.every(o => formData.allergies.includes(o)) && (
                                                                <div className="p-4 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase italic">
                                                                    All allergies selected
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {(formData.allergies?.filter(Boolean).length === 0 || (formData.allergies?.filter(Boolean).length === 1 && formData.allergies?.filter(Boolean)[0] === "None")) ? (
                                                    <div className="px-3 py-1.5 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] text-[9px] font-black uppercase tracking-widest">None</div>
                                                ) : (
                                                    formData.allergies?.filter(Boolean).map((allergy, idx) => (
                                                        <div
                                                            key={`${allergy}-${idx}`}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.1em] transition-all animate-in zoom-in-95 duration-200 ${allergy === 'None'
                                                                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30'
                                                                : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/30'
                                                                }`}
                                                        >
                                                            {allergy}
                                                            <button
                                                                type="button"
                                                                disabled={loading}
                                                                onClick={() => {
                                                                    const newAllergies = formData.allergies.filter(a => a !== allergy);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        allergies: newAllergies.length === 0 ? ['None'] : newAllergies
                                                                    }));
                                                                }}
                                                                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors disabled:opacity-50"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-[0.2em] ml-1">Dietary Preferences</label>
                                            <div className="flex flex-wrap gap-2">
                                                {DIETARY_OPTIONS.map(d => {
                                                    const isSelected = formData.dietaryPreferences.includes(d);
                                                    return (
                                                        <motion.button
                                                            key={d}
                                                            type="button"
                                                            whileHover={{ scale: 1.04 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={() => !loading && toggleOption(formData.dietaryPreferences, d, (val) => setFormData({ ...formData, dietaryPreferences: val }))}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 cursor-pointer ${isSelected ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' : 'border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                                                        >
                                                            {d}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                </div>

                                {/* Footer Buttons */}
                                <div className="p-5 sm:p-6 bg-[var(--color-bg-card)] border-t border-[var(--color-divider)] flex flex-col sm:flex-row gap-3 flex-shrink-0">
                                    {step > 1 && (
                                        <Button type="button" variant="outline" onClick={handleBack} disabled={loading} className="w-full sm:w-auto h-11 px-8 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 border-[var(--color-divider)] text-slate-700 dark:text-slate-300 hover:text-[var(--color-text-main)] hover:bg-[var(--color-divider)]">
                                            <ChevronLeft size={16} /> Back
                                        </Button>
                                    )}
                                    {step < 4 ? (
                                        <Button type="button" onClick={handleNext} disabled={loading} className="w-full sm:flex-1 h-11 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 shadow-xl shadow-[var(--color-primary)]/20">
                                            Continue <ChevronRight size={16} />
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={handleSubmit} disabled={loading} className="w-full sm:flex-1 h-11 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 shadow-xl shadow-[var(--color-primary)]/20">
                                            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Complete Profile'}
                                        </Button>
                                    )}
                                </div>
                            </fieldset>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
