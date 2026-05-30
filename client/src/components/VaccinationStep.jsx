import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, CheckCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

export default function VaccinationStep({ formData, setFormData, field = 'vaccinations' }) {
    const [vaccineTypes, setVaccineTypes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchVaccineTypes = async () => {
            setLoading(true);
            try {
                const res = await api.get('/profiles/vaccination-types');
                setVaccineTypes(res.data);
            } catch (err) {
                console.error("Failed to fetch vaccines", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVaccineTypes();
    }, []);

    const vaccinations = formData[field] || [];

    const toggleVaccine = (type) => {
        const isSelected = vaccinations.some(v => v.vaccination_type_id === type.id);
        if (isSelected) {
            setFormData(prev => ({
                ...prev,
                [field]: prev[field].filter(v => v.vaccination_type_id !== type.id)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: [...prev[field], { 
                    vaccination_type_id: type.id, 
                    date_administered: new Date().toISOString().split('T')[0],
                    notes: ''
                }]
            }));
        }
    };

    const updateVaccine = (typeId, updates) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map(v => 
                v.vaccination_type_id === typeId ? { ...v, ...updates } : v
            )
        }));
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
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

            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="py-10 text-center">
                        <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Loading vaccines...</p>
                    </div>
                ) : (
                    vaccineTypes
                        .filter(type => type.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(type => {
                        const isSelected = vaccinations.some(v => v.vaccination_type_id === type.id);
                        const vaccineData = vaccinations.find(v => v.vaccination_type_id === type.id);

                        return (
                            <div 
                                key={type.id}
                                onClick={() => toggleVaccine(type)}
                                className={`group cursor-pointer p-4 rounded-2xl border-2 transition-all active:scale-[0.98] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isSelected ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 shadow-md' : 'bg-[var(--color-bg-page)] border-slate-200 dark:border-[var(--color-divider)] hover:border-emerald-300'}`}
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
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <input 
                                                type="date" 
                                                max={new Date().toISOString().split('T')[0]}
                                                value={vaccineData?.date_administered || ''}
                                                onChange={(e) => updateVaccine(type.id, { date_administered: e.target.value })}
                                                className="text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-slate-200 dark:border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto"
                                            />
                                            <input 
                                                type="text"
                                                placeholder="Batch # / Notes"
                                                value={vaccineData?.notes || ''}
                                                onChange={(e) => updateVaccine(type.id, { notes: e.target.value })}
                                                className="flex-1 w-full sm:w-32 text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-slate-200 dark:border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-emerald-500 outline-none placeholder:opacity-50"
                                            />
                                        </div>
                                        <CheckCircle className="text-emerald-500 hidden sm:block" size={18} />
                                    </div>
                                ) : (
                                    <Plus className="text-slate-300 group-hover:text-emerald-500 transition-colors ml-auto sm:ml-0" size={18} />
                                )}
                            </div>
                        );
                    })
                )}
                {!loading && vaccineTypes.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-[var(--color-divider)] rounded-3xl">
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">No vaccine types configured in system</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
