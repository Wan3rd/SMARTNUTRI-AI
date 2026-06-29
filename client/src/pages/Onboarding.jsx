import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Plus, Search, ChevronDown, X, Check, Gamepad, Bike, Zap, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import VaccinationStep from '../components/VaccinationStep';
import { useLoading } from '../context/LoadingContext';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const DIETARY_OPTIONS = [
    "Omnivore (No restrictions)",
    "Vegetarian",
    "Vegan",
    "Halal",
    "Kosher",
    "Gluten-Free",
    "Lactose-Free",
    "Pescatarian"
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
    "Celery",
    "Lupin",
    "Molluscs",
    "Garlic",
    "Onions",
    "Chocolate/Cocoa",
    "Strawberries",
    "Citrus Fruits",
    "Kiwi",
    "Pineapple",
    "Honey",
    "Beef",
    "Chicken",
    "Pork",
    "Food Dyes/Additives"
];

const BRISTOL_TYPES = [
    { type: 1, label: 'Type 1', desc: 'Hard Lumps', detail: 'Separate hard lumps, like nuts (hard to pass). Indicates severe constipation.' },
    { type: 2, label: 'Type 2', desc: 'Lumpy', detail: 'Sausage-shaped, but lumpy. Indicates mild constipation.' },
    { type: 3, label: 'Type 3', desc: 'Cracked', detail: 'Like a sausage but with cracks on its surface. Normal.' },
    { type: 4, label: 'Type 4', desc: 'Smooth', detail: 'Like a sausage or snake, smooth and soft. Ideal.' },
    { type: 5, label: 'Type 5', desc: 'Soft Blobs', detail: 'Soft blobs with clear-cut edges (passed easily). Lacking fiber.' },
    { type: 6, label: 'Type 6', desc: 'Mushy', detail: 'Fluffy pieces with ragged edges, a mushy stool. Mild diarrhea.' },
    { type: 7, label: 'Type 7', desc: 'Liquid', detail: 'Watery, no solid pieces (entirely liquid). Severe diarrhea.' }
];

export default function Onboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const { startLoading, stopLoading } = useLoading();
    const { refreshProfiles } = useProfile();
    const { register, user } = useAuth();
    
    const registrationData = location.state?.registrationData || JSON.parse(sessionStorage.getItem('pendingRegistration') || 'null');

    // Persistence Layer: Save registrationData to session storage if it comes from state
    React.useEffect(() => {
        if (location.state?.registrationData) {
            sessionStorage.setItem('pendingRegistration', JSON.stringify(location.state.registrationData));
        }
    }, [location.state]);

    // Security Guard: If not logged in AND no pending registration data, kick back to register
    React.useEffect(() => {
        if (!user && !registrationData) {
            navigate('/register');
        }
    }, [user, registrationData]);

    const [isInitialSync, setIsInitialSync] = useState(true);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1);
    const [isAllergiesDropdownOpen, setIsAllergiesDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState(() => {
        const saved = sessionStorage.getItem('onboardingProgress');
        return saved ? JSON.parse(saved) : {
            childName: '',
            date_of_birth: '',
            gender: 'Male',
            height: '',
            weight: '',
            activityLevel: 'moderate',
            allergies: [],
            dietaryPreferences: [],
            vaccinations: [],
            medications: '',
            weighInConditions: '',
            bristolStoolScale: '4',
            medicalHistory: ''
        };
    });

    // Persist formData changes
    React.useEffect(() => {
        sessionStorage.setItem('onboardingProgress', JSON.stringify(formData));
    }, [formData]);

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months = 12 + months;
        }
        return { years, months };
    };

    const calculateBMI = (h, w) => {
        const heightM = parseFloat(h) / 100;
        const weightKg = parseFloat(w);
        if (heightM > 0 && weightKg > 0) {
            return (weightKg / (heightM * heightM)).toFixed(1);
        }
        return null;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleSelection = (field, value) => {
        setFormData(prev => {
            const current = prev[field];
            const isSelected = current.includes(value);

            if (value === "None" && field === "allergies") {
                return { ...prev, [field]: isSelected ? [] : ["None"] };
            }

            let updated;
            if (isSelected) {
                updated = current.filter(item => item !== value);
            } else {
                updated = [...current.filter(i => i !== "None"), value];
            }

            return { ...prev, [field]: updated };
        });
    };

    const validateStep = (s) => {
        setError(null);
        if (s === 1) {
            if (!formData.childName || !formData.date_of_birth || !formData.height || !formData.weight) {
                setError("Please complete all essential vitals.");
                return false;
            }
            if (new Date(formData.date_of_birth) > new Date()) {
                setError("Date of birth cannot be in the future.");
                return false;
            }
            const h = parseFloat(formData.height);
            const w = parseFloat(formData.weight);
            if (h < 30 || h > 250) { setError("Invalid height range (30-250cm)"); return false; }
            if (w < 1 || w > 300) { setError("Invalid weight range (1-300kg)"); return false; }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSkipOnboarding = async () => {
        startLoading('Creating your Caregiver account...');
        setError(null);
        try {
            // 1. If caregiver account isn't created, register now
            if (registrationData && !user) {
                const regRes = await register(registrationData);
                if (!regRes.success) {
                    setError(regRes.message || "Failed to create account. Please try again.");
                    stopLoading();
                    return;
                }
            }

            // Clear temporary onboarding states
            sessionStorage.removeItem('pendingRegistration');
            sessionStorage.removeItem('onboardingProgress');

            // Route to dashboard
            navigate('/');
        } catch (err) {
            console.error("Skip onboarding failed:", err);
            setError("Unable to complete account registration. Please check your connection and try again.");
        } finally {
            stopLoading();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        startLoading('Initializing Clinical Profile...');
        setError(null);

        try {
            // 1. If we have registrationData, create the account first
            if (registrationData && !user) {
                const regRes = await register(registrationData);
                if (!regRes.success) {
                    setError(regRes.message || "Failed to create account. Please try again.");
                    stopLoading();
                    return;
                }
                // Auth state updates, user is now logged in
            }

            const dietaryString = formData.dietaryPreferences.join(', ');

            await api.post('/profiles', {
                child_name: formData.childName,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender,
                height_cm: parseFloat(formData.height),
                weight_kg: parseFloat(formData.weight),
                activity_level: formData.activityLevel,
                allergies: formData.allergies,
                dietary_preferences: dietaryString,
                vaccinations: formData.vaccinations,
                medications: formData.medications,
                weigh_in_conditions: formData.weighInConditions,
                bristol_stool_scale: parseInt(formData.bristolStoolScale || 4),
                medical_history: formData.medicalHistory
            });

            await refreshProfiles();
            
            // Clear persistence storage on success
            sessionStorage.removeItem('pendingRegistration');
            sessionStorage.removeItem('onboardingProgress');
            
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to save clinical profile. Please try again.");
        } finally {
            stopLoading();
        }
    };

    React.useEffect(() => {
        setIsInitialSync(false);
    }, []);

    if (isInitialSync) return null;

    const steps = [
        { title: "Identity", sub: "Vitals & DOB" },
        { title: "Metabolism", sub: "Activity Level" },
        { title: "Clinical", sub: "Allergies & Care" },
        { title: "Review", sub: "Finalize Setup" }
    ];

    const bmi = calculateBMI(formData.height, formData.weight);
    const age = calculateAge(formData.date_of_birth);

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 sm:p-6 transition-colors duration-300 py-10 relative overflow-hidden">
            {/* Mesh Background */}
            <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20">
                <div className="absolute inset-0 mesh-emerald opacity-60" />
            </div>

            <Card className="w-full max-w-2xl glass rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-2xl relative z-10 overflow-hidden">
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 relative">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 4) * 100}%` }}
                        className="absolute inset-y-0 left-0 bg-[var(--color-primary)] shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    />
                </div>

                <CardHeader className="text-center pt-8 sm:pt-10 px-6">
                    <div className="flex justify-center gap-2 mb-4">
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    step > i + 1 ? "w-8 bg-[var(--color-primary)]" :
                                        step === i + 1 ? "w-12 bg-[var(--color-primary)]" : "w-4 bg-[var(--color-divider)]"
                                )}
                            />
                        ))}
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-black text-[var(--color-secondary)] uppercase tracking-tight leading-tight">
                        {steps[step - 1].title}
                    </CardTitle>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1 opacity-70">
                        {steps[step - 1].sub}
                    </p>
                </CardHeader>
                <CardContent className="p-6 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {error && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-5">
                                        <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-divider)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="text-left">
                                                <p className="text-xs font-black text-[var(--color-secondary)] uppercase">Don't have a child profile yet?</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold">You can set up your child's clinical details at any time in your dashboard.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSkipOnboarding}
                                                className="px-4 py-2.5 bg-white dark:bg-white/5 border border-[var(--color-divider)] text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto active:scale-[0.95]"
                                            >
                                                Skip Setup for Now
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Child Name</label>
                                                <input
                                                    type="text"
                                                    name="childName"
                                                    required
                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                    placeholder="e.g. Alice Johnson"
                                                    value={formData.childName}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Gender</label>
                                                <select
                                                    name="gender"
                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                    value={formData.gender}
                                                    onChange={handleChange}
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Birth Date</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    name="date_of_birth"
                                                    max={new Date().toISOString().split('T')[0]}
                                                    required
                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                    value={formData.date_of_birth}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            {age && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="px-3 py-1.5 bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-widest rounded-xl border border-[var(--color-primary)]/10 inline-block"
                                                >
                                                    {age.years} {age.years === 1 ? 'Year' : 'Years'}, {age.months} {age.months === 1 ? 'Month' : 'Months'} Old
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    name="height"
                                                    required
                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                    placeholder="130"
                                                    value={formData.height}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    name="weight"
                                                    required
                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                    placeholder="30"
                                                    value={formData.weight}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>

                                        {bmi && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-blue-500/5 rounded-2xl border-2 border-blue-500/20 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                        <Activity size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Real-time Clinical BMI</p>
                                                        <p className="text-xs font-bold text-[var(--color-text-main)]">Child-specific metabolic index</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-blue-600">{bmi}</p>
                                                    <p className="text-[8px] font-black text-blue-500 uppercase">kg/m²</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Metabolic Activity Level</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { id: 'sedentary', label: 'Sedentary', sub: 'Little exercise' },
                                                    { id: 'light', label: 'Light', sub: 'Play 1-3 days' },
                                                    { id: 'moderate', label: 'Moderate', sub: 'Sports 3-5 days' },
                                                    { id: 'very_active', label: 'Very Active', sub: 'Daily Training' }
                                                ].map((lvl) => (
                                                    <button
                                                        key={lvl.id}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, activityLevel: lvl.id })}
                                                        className={cn(
                                                            "p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] cursor-pointer",
                                                            formData.activityLevel === lvl.id
                                                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                                                                : "border-[var(--color-divider)] hover:border-[var(--color-primary)]/30"
                                                        )}
                                                    >
                                                        <div className="text-xs font-black uppercase tracking-tight text-[var(--color-text-main)]">{lvl.label}</div>
                                                        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">{lvl.sub}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-6 border-t border-[var(--color-divider)]">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <Activity size={12} className="text-amber-500" /> Bristol Stool Scale (Baseline)
                                            </label>
                                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                                                {BRISTOL_TYPES.map((type) => (
                                                    <button
                                                        key={type.type}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, bristolStoolScale: type.type.toString() })}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group active:scale-[0.93] cursor-pointer",
                                                            formData.bristolStoolScale === type.type.toString()
                                                                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                                                                : "bg-[var(--color-bg-page)] text-amber-600 border-amber-100 dark:border-amber-900/20 hover:border-amber-400"
                                                        )}
                                                    >
                                                        <span className="text-xl mb-1">
                                                            {type.type === 1 && '🥜'}
                                                            {type.type === 2 && '🍇'}
                                                            {type.type === 3 && '🥖'}
                                                            {type.type === 4 && '🐍'}
                                                            {type.type === 5 && '💧'}
                                                            {type.type === 6 && '☁️'}
                                                            {type.type === 7 && '🌊'}
                                                        </span>
                                                        <p className="text-[8px] font-black uppercase tracking-tight leading-tight">{type.label}</p>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/20 min-h-[4.5rem] flex items-center overflow-hidden">
                                                <AnimatePresence mode="wait">
                                                    <motion.p
                                                        key={formData.bristolStoolScale}
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -5 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed italic"
                                                    >
                                                        <strong>{BRISTOL_TYPES.find(t => t.type.toString() === formData.bristolStoolScale)?.desc}: </strong>
                                                        {BRISTOL_TYPES.find(t => t.type.toString() === formData.bristolStoolScale)?.detail}
                                                    </motion.p>
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                     <div className="space-y-6">
                                         <div className="space-y-3">
                                             <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Clinical Allergies</label>
 
                                             <div className="relative">
                                                 <button
                                                     type="button"
                                                     onClick={() => setIsAllergiesDropdownOpen(!isAllergiesDropdownOpen)}
                                                     className={cn(
                                                         "w-full p-4 flex items-center justify-between rounded-2xl border-2 transition-all bg-[var(--color-bg-page)] active:scale-[0.99] cursor-pointer",
                                                         isAllergiesDropdownOpen ? "border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10" : "border-[var(--color-divider)]"
                                                     )}
                                                 >
                                                     <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                                         <Plus size={14} className="text-[var(--color-primary)] animate-pulse" /> Add Allergy...
                                                     </span>
                                                     <ChevronDown size={14} className={cn("transition-transform duration-200 text-[var(--color-text-muted)]", isAllergiesDropdownOpen && "rotate-180")} />
                                                 </button>
 
                                                 {isAllergiesDropdownOpen && (
                                                     <>
                                                         <div className="fixed inset-0 z-40" onClick={() => setIsAllergiesDropdownOpen(false)} />
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
                                                                         className="w-full text-left p-3.5 rounded-xl hover:bg-[var(--color-primary)]/10 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] transition-all border-l-4 border-transparent hover:border-[var(--color-primary)] active:scale-[0.98] cursor-pointer"
                                                                     >
                                                                         {option}
                                                                     </button>
                                                                 );
                                                             })}
                                                         </motion.div>
                                                     </>
                                                 )}
                                             </div>
 
                                             <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                                 <AnimatePresence>
                                                     {formData.allergies?.filter(Boolean).map((allergy, idx) => (
                                                         <motion.div
                                                             key={allergy}
                                                             initial={{ opacity: 0, scale: 0.8 }}
                                                             animate={{ opacity: 1, scale: 1 }}
                                                             exit={{ opacity: 0, scale: 0.8 }}
                                                             transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                             className={cn(
                                                                 "flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all shadow-sm",
                                                                 allergy === 'None'
                                                                     ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:border-emerald-500/30"
                                                                     : "bg-red-500/10 text-red-600 border-red-500/20 dark:border-red-500/30"
                                                             )}
                                                         >
                                                             {allergy}
                                                             {allergy !== 'None' && (
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => {
                                                                         const newAllergies = formData.allergies.filter(a => a !== allergy);
                                                                         setFormData(prev => ({
                                                                             ...prev,
                                                                             allergies: newAllergies.length === 0 ? ['None'] : newAllergies
                                                                         }));
                                                                     }}
                                                                     className="hover:bg-black/10 dark:hover:bg-white/10 rounded-md p-1 transition-colors flex items-center justify-center cursor-pointer active:scale-[0.85]"
                                                                 >
                                                                     <X size={12} className="stroke-[3]" />
                                                                 </button>
                                                             )}
                                                         </motion.div>
                                                     ))}
                                                 </AnimatePresence>
                                             </div>
                                         </div>
 
                                         <div className="space-y-3 pt-4 border-t border-[var(--color-divider)]">
                                             <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Dietary Preferences</label>
                                             <div className="flex flex-wrap gap-2">
                                                 {DIETARY_OPTIONS.map(option => (
                                                     <button
                                                         key={option}
                                                         type="button"
                                                         onClick={() => toggleSelection('dietaryPreferences', option)}
                                                         className={cn(
                                                             "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 active:scale-[0.95] cursor-pointer",
                                                             formData.dietaryPreferences.includes(option)
                                                                 ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20"
                                                                 : "bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]"
                                                         )}
                                                     >
                                                         {option}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
 
                                         <div className="space-y-1.5 pt-4 border-t border-[var(--color-divider)]">
                                             <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Medical History Summary</label>
                                             <textarea
                                                 name="medicalHistory"
                                                 className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                 placeholder="e.g. History of asthma, frequent digestive issues..."
                                                 rows="3"
                                                 value={formData.medicalHistory}
                                                 onChange={handleChange}
                                             />
                                         </div>
                                     </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-6">
                                        <VaccinationStep
                                            formData={formData}
                                            setFormData={setFormData}
                                        />

                                        <div className="space-y-1.5 pt-4 border-t border-[var(--color-divider)]">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Current Medications</label>
                                            <input
                                                type="text"
                                                name="medications"
                                                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                placeholder="e.g. Daily Vitamins, Inhaler"
                                                value={formData.medications}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="p-4 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/20">
                                            <p className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-widest text-center">Ready to initialize clinical tracking?</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex gap-3 pt-6 border-t border-[var(--color-divider)]">
                            {step > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={prevStep}
                                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest active:scale-[0.98] transition-all text-sm"
                                >
                                    Back
                                </Button>
                            )}
                            {step < 4 ? (
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-1 h-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/20 font-black uppercase tracking-widest active:scale-[0.98] transition-all text-sm"
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-xl shadow-[var(--color-primary)]/20 font-black uppercase tracking-widest active:scale-[0.98] transition-all text-sm"
                                >
                                    Complete Setup
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
