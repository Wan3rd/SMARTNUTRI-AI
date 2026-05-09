import React, { useState, useRef } from 'react';
import { User, Calendar, Baby, Activity, Info, Loader2, X, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './common/Button';
import { Card, CardContent } from './common/Card';
import api from '../lib/api';

const DIETARY_OPTIONS = [
    "Omnivore (No restrictions)", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Lactose-Free", "Pescatarian"
];

const ALLERGY_OPTIONS = [
    "None", "Peanuts", "Tree Nuts", "Milk/Dairy", "Eggs", "Wheat/Gluten", "Soy", "Fish", "Shellfish", "Sesame"
];

const STEPS = [
    { title: 'Basic Info', icon: Baby },
    { title: 'Measurements', icon: Activity },
    { title: 'Dietary', icon: Info }
];

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MONTHS = [
    { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
    { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
    { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
];
const YEARS = Array.from({ length: 20 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function AddChildModal({ isOpen, onClose, onChildAdded }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const isSubmitting = useRef(false);

    const [dobParts, setDobParts] = useState({
        day: '01',
        month: '01',
        year: new Date().getFullYear().toString()
    });

    const [formData, setFormData] = useState({
        childName: '',
        dateOfBirth: '',
        gender: 'Male',
        heightCm: '',
        weightKg: '',
        activityLevel: 'Moderate',
        allergies: ['None'],
        dietaryPreferences: []
    });

    // Sync DOB parts to formData
    React.useEffect(() => {
        setFormData(prev => ({
            ...prev,
            dateOfBirth: `${dobParts.year}-${dobParts.month}-${dobParts.day}`
        }));
    }, [dobParts]);

    if (!isOpen) return null;

    const validateStep = (targetStep = step) => {
        if (targetStep >= 1) {
            if (!formData.childName.trim()) {
                setMessage({ type: 'error', text: "Please enter the child's name before continuing." });
                return false;
            }
        }
        if (targetStep >= 2) {
            if (!formData.heightCm || parseFloat(formData.heightCm) <= 0) {
                setMessage({ type: 'error', text: "Please enter a valid height (cm)." });
                return false;
            }
            if (!formData.weightKg || parseFloat(formData.weightKg) <= 0) {
                setMessage({ type: 'error', text: "Please enter a valid weight (kg)." });
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
            setStep(prev => Math.min(prev + 1, 3));
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
        if (step < 3) {
            handleNext();
            return;
        }

        // Only on the final step do we validate everything and submit
        if (!validateStep(3)) return;

        isSubmitting.current = true;
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                child_name: formData.childName,
                date_of_birth: formData.dateOfBirth,
                gender: formData.gender,
                height_cm: formData.heightCm,
                weight_kg: formData.weightKg,
                activity_level: formData.activityLevel,
                allergies: formData.allergies,
                dietary_preferences: formData.dietaryPreferences.join(', ')
            };

            await api.post('/profiles', payload);
            setMessage({ type: 'success', text: 'New clinical profile created!' });
            
            if (onChildAdded) onChildAdded();
            
            setTimeout(() => {
                onClose();
                setStep(1);
                setFormData({
                    childName: '', dateOfBirth: '', gender: 'Male', heightCm: '', weightKg: '',
                    activityLevel: 'moderate', allergies: [], dietaryPreferences: []
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

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                <Card className="border-2 border-[var(--color-divider)] rounded-[40px] overflow-hidden shadow-2xl">
                    <CardContent className="p-0">
                        {/* Header */}
                        <div className="bg-[var(--color-primary)] p-6 sm:p-8 text-white relative">
                            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} sm:size={24} />
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

                        <form className="p-6 sm:p-10 space-y-6 sm:space-y-8" onKeyDown={(e) => { if(e.key === 'Enter') e.preventDefault(); }}>
                            {message.text && (
                                <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                                    {message.text}
                                </div>
                            )}

                            {/* Step 1: Basic Info */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Child's Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
                                            <input
                                                type="text" required value={formData.childName}
                                                onChange={(e) => setFormData({...formData, childName: e.target.value})}
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <select
                                                    value={dobParts.month}
                                                    onChange={(e) => setDobParts({...dobParts, month: e.target.value})}
                                                    className="h-14 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                >
                                                    {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                                </select>
                                                <select
                                                    value={dobParts.day}
                                                    onChange={(e) => setDobParts({...dobParts, day: e.target.value})}
                                                    className="h-14 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                >
                                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <select
                                                    value={dobParts.year}
                                                    onChange={(e) => setDobParts({...dobParts, year: e.target.value})}
                                                    className="h-14 px-2 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all text-xs appearance-none text-center cursor-pointer"
                                                >
                                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Gender</label>
                                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border-2 border-[var(--color-divider)]">
                                                {['Male', 'Female'].map(g => (
                                                    <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})}
                                                        className={`flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.gender === g ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Measurements */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Height (cm)</label>
                                            <input
                                                type="number" required value={formData.heightCm}
                                                onChange={(e) => setFormData({...formData, heightCm: e.target.value})}
                                                className="w-full h-14 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                placeholder="e.g. 110"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Weight (kg)</label>
                                            <input
                                                type="number" required value={formData.weightKg}
                                                onChange={(e) => setFormData({...formData, weightKg: e.target.value})}
                                                className="w-full h-14 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all"
                                                placeholder="e.g. 20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Activity Level</label>
                                        <select
                                            value={formData.activityLevel}
                                            onChange={(e) => setFormData({...formData, activityLevel: e.target.value})}
                                            className="w-full h-14 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold focus:border-[var(--color-primary)] outline-none transition-all appearance-none"
                                        >
                                            <option value="sedentary">Sedentary (Little to no exercise)</option>
                                            <option value="moderate">Moderate (Active 3-5 days/week)</option>
                                            <option value="highly_active">Highly Active (Physical training daily)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Dietary */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Allergies</label>
                                        <div className="flex flex-wrap gap-2">
                                            {ALLERGY_OPTIONS.map(a => (
                                                <button key={a} type="button" onClick={() => toggleOption(formData.allergies, a, (val) => setFormData({...formData, allergies: val}))}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.allergies.includes(a) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' : 'border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Dietary Preferences</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DIETARY_OPTIONS.map(d => (
                                                <button key={d} type="button" onClick={() => toggleOption(formData.dietaryPreferences, d, (val) => setFormData({...formData, dietaryPreferences: val}))}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.dietaryPreferences.includes(d) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' : 'border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-[var(--color-divider)]">
                                {step > 1 && (
                                    <Button type="button" variant="outline" onClick={handleBack} className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-divider)]">
                                        <ChevronLeft size={16} /> Back
                                    </Button>
                                )}
                                {step < 3 ? (
                                    <Button type="button" onClick={handleNext} className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 shadow-xl shadow-[var(--color-primary)]/20">
                                        Continue <ChevronRight size={16} />
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2 shadow-xl shadow-[var(--color-primary)]/20">
                                        {loading ? <Loader2 className="animate-spin" size={16} /> : 'Complete Profile'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
