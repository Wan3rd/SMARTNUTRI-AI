import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import {
    X, UserPlus, AlertCircle, CheckCircle,
    Stethoscope, Activity, Heart, Scale,
    ArrowRight, ArrowLeft, Loader2, Info,
    User, Mail, Calendar, Baby, ShieldCheck, Plus, Trash2, Search, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import Notification from './common/Notification';
import { useEffect } from 'react';
import { cn } from '../lib/utils';
import ConfirmDialog from './common/ConfirmDialog';
import VaccinationStep from './VaccinationStep';

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

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
    { id: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/wk' },
    { id: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/wk' },
    { id: 'very', label: 'Very Active', desc: 'Hard exercise 6-7 days/wk' },
    { id: 'extra', label: 'Extra Active', desc: 'Physical job / 2x training' }
];

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

const BRISTOL_TYPES = [
    { type: 1, label: 'Type 1', desc: 'Hard Lumps', detail: 'Separate hard lumps, like nuts (hard to pass). Indicates severe constipation.' },
    { type: 2, label: 'Type 2', desc: 'Lumpy', detail: 'Sausage-shaped, but lumpy. Indicates mild constipation.' },
    { type: 3, label: 'Type 3', desc: 'Cracked', detail: 'Like a sausage but with cracks on its surface. Normal.' },
    { type: 4, label: 'Type 4', desc: 'Smooth', detail: 'Like a sausage or snake, smooth and soft. Ideal.' },
    { type: 5, label: 'Type 5', desc: 'Soft Blobs', detail: 'Soft blobs with clear-cut edges (passed easily). Lacking fiber.' },
    { type: 6, label: 'Type 6', desc: 'Mushy', detail: 'Fluffy pieces with ragged edges, a mushy stool. Mild diarrhea.' },
    { type: 7, label: 'Type 7', desc: 'Liquid', detail: 'Watery, no solid pieces (entirely liquid). Severe diarrhea.' }
];

const STEPS = [
    { id: 'identity', title: 'Identity', icon: User },
    { id: 'clinical', title: 'Clinical', icon: Stethoscope },
    { id: 'anthropo', title: 'Physical', icon: Scale },
    { id: 'vaccines', title: 'Vaccines', icon: ShieldCheck },
    { id: 'lifestyle', title: 'Lifestyle', icon: Activity }
];

export default function CreatePatientModal({ isOpen, onClose, onClientAdded, parentId = null, parentEmail = '', parentName = '' }) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });
    const [vaccineTypes, setVaccineTypes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAllergiesDropdownOpen, setIsAllergiesDropdownOpen] = useState(false);
    const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setIsClosing(false);
        } else {
            setIsMounted(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const triggerCloseAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    }, [onClose]);

    const [formData, setFormData] = useState({
        // Parent Info
        parent_name: parentName,
        parent_email: parentEmail,
        // Child Basic
        child_name: '',
        date_of_birth: '',
        gender: 'Male',
        // Clinical
        medical_history: '',
        family_history: '',
        food_intolerances: '',
        symptoms: '',
        medications: '',
        allergies: ['None'],
        // Anthropometric
        height_cm: '',
        weight_kg: '',
        waist_circumference: '',
        weigh_in_conditions: '',
        // Lifestyle
        activity_level: 'moderate',
        lifestyle_factors: '',
        dietary_preferences: ['Omnivore (No restrictions)'],
        bristol_stool_scale: 4,
        // Vaccinations
        vaccinations: [] // Array of { vaccination_type_id, date_administered, notes }
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                parent_name: parentName,
                parent_email: parentEmail
            }));
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, parentName, parentEmail]);

    const fetchVaccineTypes = async () => {
        try {
            const res = await api.get('/profiles/vaccination-types');
            setVaccineTypes(res.data);
        } catch (err) {
            console.error("Failed to fetch vaccines", err);
        }
    };

    useEffect(() => {
        if (isOpen && step === 3 && vaccineTypes.length === 0) {
            fetchVaccineTypes();
        }
    }, [isOpen, step, vaccineTypes.length]);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const isDirty = () => {
        // Check if any critical field has been touched
        return (
            formData.child_name !== '' ||
            formData.date_of_birth !== '' ||
            formData.medical_history !== '' ||
            formData.height_cm !== '' ||
            formData.weight_kg !== '' ||
            formData.vaccinations.length > 0
        );
    };

    const handleClose = () => {
        if (isDirty()) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Patient Draft?',
                message: 'You are currently in the middle of a clinical intake process. Are you sure you want to stop? All entered medical history and profiling data will be permanently lost.',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    triggerCloseAnimation();
                }
            });
        } else {
            triggerCloseAnimation();
        }
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const isStepValid = () => {
        if (step === 0) {
            if (!parentId && (!formData.parent_name || !formData.parent_email)) return false;
            if (!formData.child_name || !formData.date_of_birth) return false;
            if (!parentId && !formData.parent_email.includes('@')) return false;
        }
        if (step === 2) {
            if (!formData.height_cm || !formData.weight_kg) return false;
        }
        return true;
    };

    const validateStep = () => {
        if (step === 0) {
            if (!parentId && (!formData.parent_name || !formData.parent_email)) {
                setNotif({ show: true, message: 'Please fill in all identity fields before proceeding.', type: 'error' });
                return false;
            }
            if (!formData.child_name || !formData.date_of_birth) {
                setNotif({ show: true, message: 'Please fill in child identity fields before proceeding.', type: 'error' });
                return false;
            }
            if (new Date(formData.date_of_birth) > new Date()) {
                setNotif({ show: true, message: 'Date of birth cannot be in the future.', type: 'error' });
                return false;
            }
            if (!parentId && !formData.parent_email.includes('@')) {
                setNotif({ show: true, message: 'Please enter a valid email address.', type: 'error' });
                return false;
            }
        }
        if (step === 2) {
            if (!formData.height_cm || !formData.weight_kg) {
                setNotif({ show: true, message: 'Initial height and weight are required for clinical profiling.', type: 'error' });
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(s => Math.min(s + 1, STEPS.length - 1));
        }
    };
    const prevStep = () => {
        setNotif({ ...notif, show: false });
        setStep(s => Math.max(s - 1, 0));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setNotif({ ...notif, show: false });

        try {
            const payload = {
                ...formData,
                dietary_preferences: formData.dietary_preferences.join(', '), // Convert array to string for backend
                parentId // Pass parentId if adding to existing client
            };

            const res = await api.post('/nutritionist/create-client', payload);

            if (onClientAdded) onClientAdded();
            triggerCloseAnimation();
            setStep(0);
            setFormData({
                parent_name: '', parent_email: '', child_name: '', date_of_birth: '', gender: 'Male',
                medical_history: '', family_history: '', food_intolerances: '', symptoms: '',
                medications: '', allergies: ['None'], height_cm: '', weight_kg: '',
                waist_circumference: '', weigh_in_conditions: '',
                activity_level: 'moderate', lifestyle_factors: '',
                dietary_preferences: ['Omnivore (No restrictions)'], bristol_stool_scale: 4,
                vaccinations: []
            });

        } catch (err) {
            setNotif({
                show: true,
                type: 'error',
                message: err.response?.data?.message || 'Failed to create profile. Please check all fields.'
            });
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {!parentId && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Parent Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                            <input name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="e.g. Maria Clara" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Parent Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                            <input name="parent_email" type="email" value={formData.parent_email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="email@example.com" />
                                        </div>
                                    </div>
                                </div>
                                <div className="h-px bg-[var(--color-divider)] my-4" />
                            </>
                        )}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Child's Full Name</label>
                            <div className="relative">
                                <Baby className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                <input name="child_name" value={formData.child_name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Child's Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Birth Date</label>
                                <input name="date_of_birth" type="date" max={new Date().toISOString().split('T')[0]} value={formData.date_of_birth} onChange={handleChange} className="w-full px-3 sm:px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sex</label>
                                <div className="flex bg-[var(--color-bg-page)] p-1 rounded-2xl border-2 border-slate-200 dark:border-[var(--color-divider)]">
                                    {['Male', 'Female'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                                            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${formData.gender === g
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                : 'text-[var(--color-text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Medical History</label>
                            <textarea name="medical_history" value={formData.medical_history} onChange={handleChange} className="w-full px-4 py-2 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] h-24 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="e.g. Asthma, Past surgeries..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Family History</label>
                            <textarea name="family_history" value={formData.family_history} onChange={handleChange} className="w-full px-4 py-2 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] h-24 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Diabetes, Hypertension in family..." />
                        </div>
                        <div className="space-y-1">
                            <label className="block mb-2 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Known Allergies</label>

                            <div className="mb-4 relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAllergiesDropdownOpen(!isAllergiesDropdownOpen)}
                                    className={cn(
                                        "w-full h-11 px-4 flex items-center justify-between rounded-xl border-2 transition-all cursor-pointer bg-[var(--color-bg-page)]",
                                        isAllergiesDropdownOpen ? "border-[var(--color-danger)]/50 ring-4 ring-[var(--color-danger)]/10" : "border-[var(--color-divider)]"
                                    )}
                                >
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate">
                                        <Plus size={14} className="inline mr-2" /> <span className="truncate">Add Allergy...</span>
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
                                                onClick={() => {
                                                    const newAllergies = formData.allergies.filter(a => a !== allergy);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        allergies: newAllergies.length === 0 ? ['None'] : newAllergies
                                                    }));
                                                }}
                                                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Current Medications</label>
                            <input name="medications" value={formData.medications} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Vitamins, Maintenance..." />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Symptoms & Food Intolerances</label>
                            <input name="food_intolerances" value={formData.food_intolerances} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Lactose intolerance, Bloating..." />
                        </div>
                        <div className="md:col-span-2 space-y-3 p-4 bg-[var(--color-warning)]/10 rounded-2xl border-2 border-[var(--color-warning)]/30">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-warning)] flex items-center gap-2 mb-2">
                                <Activity size={12} /> Bristol Stool Scale (Baseline)
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                {BRISTOL_TYPES.map(type => (
                                    <button
                                        key={type.type}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, bristol_stool_scale: type.type })}
                                        className={`flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-2xl border-2 transition-all group ${formData.bristol_stool_scale === type.type
                                            ? 'bg-[var(--color-warning)] border-[var(--color-warning)] text-white shadow-lg shadow-[var(--color-warning)]/20'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-warning)] border-[var(--color-divider)] hover:border-[var(--color-warning)]/40'
                                            }`}
                                    >
                                        <span className="text-lg sm:text-xl">
                                            {type.type === 1 && '🥜'}
                                            {type.type === 2 && '🍇'}
                                            {type.type === 3 && '🥖'}
                                            {type.type === 4 && '🐍'}
                                            {type.type === 5 && '💧'}
                                            {type.type === 6 && '☁️'}
                                            {type.type === 7 && '🌊'}
                                        </span>
                                        <div className="text-center">
                                            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-tight">{type.label}</p>
                                            <p className={`text-[7px] sm:text-[8px] font-bold uppercase leading-tight mt-0.5 ${formData.bristol_stool_scale === type.type ? 'text-white/90' : 'text-[var(--color-warning)]/70'}`}>
                                                {type.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-[var(--color-warning)] font-medium bg-[var(--color-warning)]/10 p-3 rounded-xl border border-[var(--color-warning)]/30 leading-relaxed mt-2">
                                <strong>Assessment Guide:</strong> {BRISTOL_TYPES.find(t => t.type === formData.bristol_stool_scale)?.detail}
                            </p>
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Height (cm)</label>
                                <input name="height_cm" type="number" step="0.1" value={formData.height_cm} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="000.0" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Weight (kg)</label>
                                <input name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="00.0" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Waist (cm)</label>
                                <input name="waist_circumference" type="number" step="0.1" value={formData.waist_circumference} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="Optional" />
                            </div>
                        </div>
                        <div className="bg-[var(--color-bg-page)] p-6 rounded-3xl border-2 border-[var(--color-divider)]">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <Info size={12} className="text-[var(--color-info)]" /> Standard Weigh-in Conditions
                                </label>
                                <textarea
                                    name="weigh_in_conditions"
                                    value={formData.weigh_in_conditions}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full px-4 py-3 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl text-sm font-medium text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-slate-400 resize-none"
                                    placeholder="e.g. Morning, Before Breakfast, Wearing Diaper Only"
                                />
                                <p className="text-[8px] text-[var(--color-text-main)] opacity-40 italic font-bold uppercase tracking-tight">Consistent clinical baseline is critical for accurate growth velocity calculations.</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <VaccinationStep
                        formData={formData}
                        setFormData={setFormData}
                        disabled={loading}
                    />
                );
            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Dietary Preferences (Select multiple)</label>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_OPTIONS.map(option => {
                                    const isSelected = formData.dietary_preferences.includes(option);
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => {
                                                    const current = prev.dietary_preferences;
                                                    let updated;
                                                    if (isSelected) {
                                                        updated = current.filter(item => item !== option);
                                                        if (updated.length === 0) updated = ["Omnivore (No restrictions)"]; // fallback
                                                    } else {
                                                        // If selecting distinct value, remove "Omnivore" if present
                                                        updated = [...current.filter(i => i !== "Omnivore (No restrictions)"), option];
                                                    }
                                                    return { ...prev, dietary_preferences: updated };
                                                });
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all border-2 cursor-pointer ${isSelected
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-slate-200 dark:border-[var(--color-divider)] hover:border-emerald-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Physical Activity Level</label>
                            <button
                                type="button"
                                onClick={() => setIsActivityDropdownOpen(!isActivityDropdownOpen)}
                                className={cn(
                                    "w-full px-4 py-3 flex items-center justify-between bg-[var(--color-bg-page)] border-2 rounded-2xl text-sm text-[var(--color-text-main)] font-bold outline-none transition-all cursor-pointer",
                                    isActivityDropdownOpen ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-[var(--color-divider)] hover:border-emerald-300"
                                )}
                            >
                                <div className="flex flex-col items-start">
                                    <span>{ACTIVITY_LEVELS.find(a => a.id === formData.activity_level)?.label}</span>
                                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium -mt-0.5">{ACTIVITY_LEVELS.find(a => a.id === formData.activity_level)?.desc}</span>
                                </div>
                                <ChevronDown size={18} className={cn("text-[var(--color-text-muted)] transition-transform duration-300", isActivityDropdownOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {isActivityDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsActivityDropdownOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 w-full mt-2 py-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            {ACTIVITY_LEVELS.map(level => (
                                                <button
                                                    key={level.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, activity_level: level.id }));
                                                        setIsActivityDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors flex flex-col items-start border-l-4",
                                                        formData.activity_level === level.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-transparent"
                                                    )}
                                                >
                                                    <span className={cn("text-sm font-bold", formData.activity_level === level.id ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-text-main)]")}>{level.label}</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)]">{level.desc}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Lifestyle & Habits</label>
                            <textarea name="lifestyle_factors" value={formData.lifestyle_factors} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] h-32 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="e.g. High sugar intake, Poor sleep quality, Picky eater..." />
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                <Heart size={12} className="animate-pulse" /> Clinical Profiling Ready
                            </p>
                            <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/60 mt-1 uppercase tracking-wider">The system will generate a growth dashboard based on these baseline values.</p>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return createPortal(
        <div 
            className={cn(
                "fixed inset-0 z-[200] flex items-center justify-center sm:p-6 transition-all duration-500 ease-out",
                isMounted && !isClosing ? "bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" : "bg-slate-900/0 dark:bg-black/0 backdrop-blur-none"
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) handleClose();
            }}
        >
            <Card 
                className={cn(
                    "w-full sm:max-w-2xl relative shadow-2xl overflow-hidden rounded-none sm:rounded-[2.5rem] bg-[var(--color-bg-card)] border-none min-h-[100dvh] sm:min-h-0 sm:max-h-[90vh] flex flex-col transition-all duration-500 ease-out transform",
                    isMounted && !isClosing ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                )}
            >
                {/* Header with Stepper */}
                <div className="bg-[var(--color-divider)] p-5 sm:px-8 sm:pt-6 sm:pb-5 shrink-0">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-main)] tracking-tight uppercase">Patient Profiling</h2>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Initial Clinical Intake</p>
                        </div>
                        <button
                            onClick={() => !loading && handleClose()}
                            disabled={loading}
                            className="p-2 bg-[var(--color-bg-card)] rounded-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all border border-[var(--color-divider)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X size={18} sm:size={20} />
                        </button>
                    </div>

                    <div className="flex justify-between items-center px-1 sm:px-4">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 z-10">
                                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${step >= i ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-muted)]'}`}>
                                        <s.icon size={step === i ? 18 : 16} className="sm:w-5 sm:h-5" />
                                    </div>
                                    <span className={cn(
                                        "text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-opacity hidden sm:block",
                                        step === i ? "opacity-100" : "opacity-40 sm:opacity-100"
                                    )}>{s.title}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] bg-[var(--color-divider)] mx-1 sm:mx-2 -mt-1 sm:-mt-6">
                                        <motion.div
                                            className="h-full bg-emerald-500"
                                            initial={{ width: '0%' }}
                                            animate={{ width: step > i ? '100%' : '0%' }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide sm:custom-scrollbar p-5 sm:px-8 sm:pt-4 sm:pb-8">
                    <Notification
                        show={notif.show}
                        type={notif.type}
                        message={notif.message}
                        onClose={() => setNotif({ ...notif, show: false })}
                    />

                    <fieldset disabled={loading} className="w-full border-none p-0 m-0 min-h-[300px]">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </fieldset>
                    {step === 0 && (
                        <p className="text-[9px] text-center text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-3.5 bg-[var(--color-info)]/10 py-3 rounded-xl border border-[var(--color-info)]/30">
                            * Default parent password: <span className="text-[var(--color-primary)]">smartnutri123</span>
                        </p>
                    )}
                </div>

                <div className="p-4 sm:p-6 bg-[var(--color-bg-card)] border-t border-[var(--color-divider)] shrink-0">
                    <div className="flex gap-3 sm:gap-4 max-w-md mx-auto w-full">
                        {step > 0 && (
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={loading}
                                className="h-12 sm:h-14 px-5 sm:px-8 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex gap-2 disabled:opacity-50"
                            >
                                <ArrowLeft size={14} /> <span className="hidden xs:inline">Back</span>
                            </Button>
                        )}
                        {step < STEPS.length - 1 ? (
                            <Button
                                onClick={nextStep}
                                disabled={loading}
                                className={cn(
                                    "flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex gap-2 shadow-xl transition-all duration-300 disabled:opacity-50",
                                    isStepValid()
                                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                        : "bg-slate-800 dark:bg-slate-700 hover:opacity-90"
                                )}
                            >
                                Next Step <ArrowRight size={14} />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex gap-2 shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <>{parentId ? 'Add Child Profile' : 'Finalize Profile'} <CheckCircle size={14} /></>}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                isDestructive={true}
            />
        </div>,
        document.body
    );
}
