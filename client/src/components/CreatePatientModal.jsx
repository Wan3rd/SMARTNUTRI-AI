import React, { useState } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { 
    X, UserPlus, AlertCircle, CheckCircle, 
    Stethoscope, Activity, Heart, Scale, 
    ArrowRight, ArrowLeft, Loader2, Info,
    User, Mail, Calendar, Baby, ShieldCheck, Plus, Trash2, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useEffect } from 'react';

const STEPS = [
    { id: 'identity', title: 'Identity', icon: User },
    { id: 'clinical', title: 'Clinical', icon: Stethoscope },
    { id: 'anthropo', title: 'Physical', icon: Scale },
    { id: 'vaccines', title: 'Vaccines', icon: ShieldCheck },
    { id: 'lifestyle', title: 'Lifestyle', icon: Activity }
];

export default function CreatePatientModal({ isOpen, onClose, onClientAdded }) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [formData, setFormData] = useState({
        // Parent Info
        parent_name: '',
        parent_email: '',
        // Child Basic
        child_name: '',
        date_of_birth: '',
        gender: 'male',
        // Clinical
        medical_history: '',
        family_history: '',
        food_intolerances: '',
        symptoms: '',
        medications: '',
        allergies: '',
        // Anthropometric
        height_cm: '',
        weight_kg: '',
        waist_circumference: '',
        weighing_time: '',
        is_fasting: false,
        is_post_voiding: false,
        // Lifestyle
        activity_level: 'moderate',
        lifestyle_factors: '',
        // Vaccinations
        vaccinations: [] // Array of { vaccination_type_id, date_administered }
    });
    const [vaccineTypes, setVaccineTypes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchVaccineTypes();
        }
    }, [isOpen]);

    const fetchVaccineTypes = async () => {
        try {
            const res = await api.get('/profiles/vaccination-types');
            setVaccineTypes(res.data);
        } catch (err) {
            console.error("Failed to fetch vaccines", err);
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

    const validateStep = () => {
        if (step === 0) {
            if (!formData.parent_name || !formData.parent_email || !formData.child_name || !formData.date_of_birth) {
                setMessage({ type: 'error', text: 'Please fill in all identity fields before proceeding.' });
                return false;
            }
            if (!formData.parent_email.includes('@')) {
                setMessage({ type: 'error', text: 'Please enter a valid email address.' });
                return false;
            }
        }
        if (step === 2) {
            if (!formData.height_cm || !formData.weight_kg) {
                setMessage({ type: 'error', text: 'Initial height and weight are required for clinical profiling.' });
                return false;
            }
        }
        setMessage(null);
        return true;
    };

    const nextStep = () => {
        if (validateStep()) {
            setStep(s => Math.min(s + 1, STEPS.length - 1));
        }
    };
    const prevStep = () => {
        setMessage(null);
        setStep(s => Math.max(s - 1, 0));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const payload = {
                ...formData,
                allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean)
            };

            const res = await api.post('/nutritionist/create-client', payload);
            setMessage({ type: 'success', text: 'Patient profile created successfully!' });
            
            if (onClientAdded) onClientAdded();
            
            setTimeout(() => {
                onClose();
                setStep(0);
                setMessage(null);
                setFormData({
                    parent_name: '', parent_email: '', child_name: '', date_of_birth: '', gender: 'male',
                    medical_history: '', family_history: '', food_intolerances: '', symptoms: '',
                    medications: '', allergies: '', height_cm: '', weight_kg: '',
                    waist_circumference: '', weighing_time: '', is_fasting: false, is_post_voiding: false,
                    activity_level: 'moderate', lifestyle_factors: '',
                    vaccinations: []
                });
            }, 2000);

        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to create profile. Please check all fields.'
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Parent Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                    <input name="parent_name" value={formData.parent_name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="e.g. Maria Clara" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Parent Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                    <input name="parent_email" type="email" value={formData.parent_email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="email@example.com" />
                                </div>
                            </div>
                        </div>
                        <div className="h-px bg-[var(--color-divider)] my-4" />
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Child's Full Name</label>
                            <div className="relative">
                                <Baby className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={16} />
                                <input name="child_name" value={formData.child_name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Child's Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Birth Date</label>
                                <input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Sex</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
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
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Allergies (comma separated)</label>
                            <input name="allergies" value={formData.allergies} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Peanuts, Shellfish..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Current Medications</label>
                            <input name="medications" value={formData.medications} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Vitamins, Maintenance..." />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Symptoms & Food Intolerances</label>
                            <input name="food_intolerances" value={formData.food_intolerances} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Lactose intolerance, Bloating..." />
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Height (cm)</label>
                                <input name="height_cm" type="number" step="0.1" value={formData.height_cm} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="000.0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Weight (kg)</label>
                                <input name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="00.0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Waist (cm)</label>
                                <input name="waist_circumference" type="number" step="0.1" value={formData.waist_circumference} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-slate-200 dark:border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400" placeholder="Optional" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-bg-page)] p-6 rounded-3xl border-2 border-[var(--color-divider)]">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <Info size={12} className="text-emerald-500" /> Weighing Conditions
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" name="is_fasting" checked={formData.is_fasting} onChange={handleChange} className="peer hidden" />
                                            <div className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-[var(--color-divider)] bg-[var(--color-bg-card)] peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all shadow-sm" />
                                            <CheckCircle size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <span className="text-xs font-bold text-[var(--color-text-main)] opacity-80">Fasting Status</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" name="is_post_voiding" checked={formData.is_post_voiding} onChange={handleChange} className="peer hidden" />
                                            <div className="h-5 w-5 rounded-md border-2 border-slate-300 dark:border-[var(--color-divider)] bg-[var(--color-bg-card)] peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all shadow-sm" />
                                            <CheckCircle size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <span className="text-xs font-bold text-[var(--color-text-main)] opacity-80">Post-voiding Status</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] opacity-70">Weighing Time</label>
                                <input name="weighing_time" type="time" value={formData.weighing_time} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500" />
                                <p className="text-[8px] text-[var(--color-text-main)] opacity-40 italic">Best practice: Early morning before breakfast.</p>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] whitespace-nowrap">Immunization Records</label>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search vaccines..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] border border-slate-200 dark:border-[var(--color-divider)] rounded-xl text-xs text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {vaccineTypes
                                .filter(type => type.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(type => {
                                const isSelected = formData.vaccinations.some(v => v.vaccination_type_id === type.id);
                                return (
                                    <div 
                                        key={type.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    vaccinations: prev.vaccinations.filter(v => v.vaccination_type_id !== type.id)
                                                }));
                                            } else {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    vaccinations: [...prev.vaccinations, { vaccination_type_id: type.id, date_administered: new Date().toISOString().split('T')[0] }]
                                                }));
                                            }
                                        }}
                                        className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 shadow-md' : 'bg-[var(--color-bg-page)] border-slate-200 dark:border-[var(--color-divider)] hover:border-emerald-300'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500'}`}>
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--color-text-main)]'}`}>{type.name}</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)]">{type.description || 'Standard Pediatric Vaccine'}</p>
                                            </div>
                                        </div>
                                        {isSelected ? (
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="date" 
                                                    onClick={(e) => e.stopPropagation()}
                                                    value={formData.vaccinations.find(v => v.vaccination_type_id === type.id)?.date_administered}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        const newDate = e.target.value;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            vaccinations: prev.vaccinations.map(v => 
                                                                v.vaccination_type_id === type.id ? { ...v, date_administered: newDate } : v
                                                            )
                                                        }));
                                                    }}
                                                    className="text-[10px] bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-slate-200 dark:border-[var(--color-divider)] rounded-lg p-1.5 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                                <CheckCircle className="text-emerald-500" size={18} />
                                            </div>
                                        ) : (
                                            <Plus className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={18} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Physical Activity Level</label>
                            <select name="activity_level" value={formData.activity_level} onChange={handleChange} className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl text-sm text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                                <option value="sedentary">Sedentary (Little to no exercise)</option>
                                <option value="light">Lightly Active (Light exercise 1-3 days/week)</option>
                                <option value="moderate">Moderately Active (Moderate exercise 3-5 days/week)</option>
                                <option value="very">Very Active (Hard exercise 6-7 days/week)</option>
                                <option value="extra">Extra Active (Very hard exercise & physical job)</option>
                            </select>
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl relative shadow-2xl overflow-hidden rounded-[2.5rem] bg-[var(--color-bg-card)] border-none">
                {/* Header with Stepper */}
                <div className="bg-[var(--color-divider)] p-8 pb-4">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight uppercase">Patient Profiling</h2>
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Initial Clinical Intake</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-[var(--color-bg-card)] rounded-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-all border border-[var(--color-divider)]">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex justify-between items-center px-4">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center gap-2 z-10">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${step >= i ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-muted)]'}`}>
                                        <s.icon size={20} />
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${step >= i ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>{s.title}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] bg-[var(--color-divider)] mx-2 -mt-6">
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

                <CardContent className="p-8">
                    {message && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-3xl flex items-center gap-3 text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                        >
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            {message.text}
                        </motion.div>
                    )}

                    <div className="min-h-[300px]">
                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-4 mt-10">
                        {step > 0 && (
                            <Button 
                                variant="outline" 
                                onClick={prevStep}
                                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] flex gap-2"
                            >
                                <ArrowLeft size={14} /> Back
                            </Button>
                        )}
                        {step < STEPS.length - 1 ? (
                            <Button 
                                onClick={nextStep}
                                className="flex-1 h-14 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] flex gap-2 shadow-xl hover:opacity-90"
                            >
                                Next Step <ArrowRight size={14} />
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] flex gap-2 shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <>Finalize Patient Profile <CheckCircle size={14} /></>}
                            </Button>
                        )}
                    </div>
                    {step === 0 && (
                        <p className="text-[9px] text-center text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-6 bg-slate-100 dark:bg-white/5 py-2 rounded-xl">
                            * Default parent password: <span className="text-emerald-600 dark:text-emerald-400">smartnutri123</span>
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
