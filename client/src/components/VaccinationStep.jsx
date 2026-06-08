import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, CheckCircle, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';

export default function VaccinationStep({ formData, setFormData, field = 'vaccinations', disabled = false }) {
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
        if (disabled) return;
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
        if (disabled) return;
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map(v =>
                v.vaccination_type_id === typeId ? { ...v, ...updates } : v
            )
        }));
    };

    const handleAddCustomVaccine = (name) => {
        if (disabled || !name.trim()) return;
        const nameLower = name.trim().toLowerCase();
        
        // If it matches a configured type, toggle standard type selection
        const matchingType = vaccineTypes.find(t => t.name.toLowerCase() === nameLower);
        if (matchingType) {
            const isAlreadySelected = vaccinations.some(v => v.vaccination_type_id === matchingType.id);
            if (!isAlreadySelected) {
                toggleVaccine(matchingType);
            }
            setSearchTerm('');
            return;
        }

        // Avoid adding duplicate custom entries
        const alreadyAdded = vaccinations.some(v => !v.vaccination_type_id && v.custom_name?.toLowerCase() === nameLower);
        if (alreadyAdded) {
            setSearchTerm('');
            return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], {
                custom_name: name.trim(),
                date_administered: new Date().toISOString().split('T')[0],
                notes: ''
            }]
        }));
        setSearchTerm('');
    };

    const updateCustomVaccine = (customName, updates) => {
        if (disabled) return;
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map(v =>
                (!v.vaccination_type_id && v.custom_name === customName) ? { ...v, ...updates } : v
            )
        }));
    };

    const removeCustomVaccine = (customName) => {
        if (disabled) return;
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter(v => v.vaccination_type_id || v.custom_name !== customName)
        }));
    };

    const filteredTypes = vaccineTypes.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const hasExactMatch = searchTerm.trim() && vaccineTypes.some(
        t => t.name.toLowerCase() === searchTerm.trim().toLowerCase()
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)]">Immunization Records</label>
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]/50" size={14} />
                    <input
                        type="text"
                        placeholder="Search or type custom vaccine..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={disabled}
                        className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-xl text-xs text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-text-muted)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[280px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {/* Custom Add Button if no exact match is found */}
                {!loading && searchTerm.trim() && !hasExactMatch && (
                    <button
                        type="button"
                        onClick={() => handleAddCustomVaccine(searchTerm)}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 text-xs font-black uppercase tracking-wider text-[var(--color-primary)] transition-all cursor-pointer w-full text-left"
                    >
                        <div className="flex items-center gap-3">
                            <Plus size={16} />
                            <span>Add custom vaccine: "{searchTerm.trim()}"</span>
                        </div>
                    </button>
                )}

                {loading ? (
                    <div className="py-10 text-center">
                        <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Loading vaccines...</p>
                    </div>
                ) : (
                    <>
                        {/* Selected Custom Vaccines */}
                        {vaccinations
                            .filter(v => !v.vaccination_type_id && v.custom_name)
                            .map((customV, idx) => (
                                <div
                                    key={`custom-${idx}`}
                                    className="group p-4 rounded-2xl border-2 border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-[var(--color-primary)] text-white">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--color-primary)]">{customV.custom_name}</p>
                                            <p className="text-[10px] text-[var(--color-text-main)] opacity-70">Custom Immunization</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                            <input
                                                type="date"
                                                max={new Date().toISOString().split('T')[0]}
                                                value={customV.date_administered || ''}
                                                onChange={(e) => updateCustomVaccine(customV.custom_name, { date_administered: e.target.value })}
                                                disabled={disabled}
                                                className="text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none w-full sm:w-auto disabled:opacity-50"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Batch # / Notes"
                                                value={customV.notes || ''}
                                                onChange={(e) => updateCustomVaccine(customV.custom_name, { notes: e.target.value })}
                                                disabled={disabled}
                                                className="flex-1 w-full sm:w-32 text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none placeholder:opacity-50 disabled:opacity-50"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeCustomVaccine(customV.custom_name)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                        {/* Standard Filtered Vaccine Types */}
                        {filteredTypes.map(type => {
                            const isSelected = vaccinations.some(v => v.vaccination_type_id === type.id);
                            const vaccineData = vaccinations.find(v => v.vaccination_type_id === type.id);

                            return (
                                <div
                                    key={type.id}
                                    onClick={() => !disabled && toggleVaccine(type)}
                                    className={`group p-4 rounded-2xl border-2 transition-all flex ${isSelected ? 'flex-col sm:flex-row items-start sm:items-center' : 'flex-row items-center'} justify-between gap-4 ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.98]'} ${isSelected ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 shadow-md' : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] hover:border-[var(--color-primary)]/40'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)]'}`}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-main)]'}`}>{type.name}</p>
                                            <p className={`text-[10px] ${isSelected ? 'text-[var(--color-text-main)] opacity-70' : 'text-[var(--color-text-muted)]'}`}>{type.description || 'Standard Pediatric Vaccine'}</p>
                                        </div>
                                    </div>
                                    {isSelected ? (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                                <input
                                                    type="date"
                                                    max={new Date().toISOString().split('T')[0]}
                                                    value={vaccineData?.date_administered || ''}
                                                    onChange={(e) => updateVaccine(type.id, { date_administered: e.target.value })}
                                                    disabled={disabled}
                                                    className="text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Batch # / Notes"
                                                    value={vaccineData?.notes || ''}
                                                    onChange={(e) => updateVaccine(type.id, { notes: e.target.value })}
                                                    disabled={disabled}
                                                    className="flex-1 w-full sm:w-32 text-xs bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-divider)] rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none placeholder:opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <CheckCircle className="text-[var(--color-success)] hidden sm:block" size={18} />
                                        </div>
                                    ) : (
                                        <Plus className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors ml-auto sm:ml-0" size={18} />
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
                {!loading && filteredTypes.length === 0 && (!searchTerm.trim() || hasExactMatch) && (
                    <div className="py-10 text-center border-2 border-dashed border-[var(--color-divider)] rounded-3xl">
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">No vaccine types configured in system</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
