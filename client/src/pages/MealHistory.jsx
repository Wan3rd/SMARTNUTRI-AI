import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { motion } from 'framer-motion';
import { Activity, Calendar, Filter, Search, CheckCircle2, AlertCircle, Clock, ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import api from '../lib/api';
import { HistorySkeleton } from '../components/SkeletonShell';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLoading } from '../context/LoadingContext';
import MealDetailModal from '../components/MealDetailModal';
import Notification from '../components/common/Notification';

export default function MealHistory() {
    const { user } = useAuth();
    const { profiles, selectedProfile, loading: profileLoading } = useProfile();
    const { startLoading, stopLoading } = useLoading();
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [rules, setRules] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });
    const [isInitialSync, setIsInitialSync] = useState(true);
    
    // Hideable Guide States
    const [showGuide, setShowGuide] = useState(() => {
        return localStorage.getItem('smartnutri_hide_history_guide') !== 'true';
    });

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [complianceFilter, setComplianceFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Pagination (Legacy)
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 12;

    useEffect(() => {
        const loadHistoryData = async () => {
            if (selectedProfile) {
                setSelectedHistoryDate(null);
                await Promise.all([fetchLogs(), fetchRules()]);
                setIsInitialSync(false);
            } else if (!profileLoading) {
                setIsInitialSync(false);
            }
        };
        loadHistoryData();
    }, [selectedProfile?.id, profileLoading]);

    useEffect(() => {
        const handleLogReviewed = (e) => {
            if (selectedProfile && e.detail?.childName === selectedProfile.child_name) {
                console.log("[MealHistory] Real-time review event received, updating history logs...");
                fetchLogs();
                fetchRules();
            }
        };

        window.addEventListener('meal-log-reviewed', handleLogReviewed);
        return () => {
            window.removeEventListener('meal-log-reviewed', handleLogReviewed);
        };
    }, [selectedProfile?.id]);

    useEffect(() => {
        applyFilters();
    }, [logs, statusFilter, complianceFilter, searchQuery, dateRange]);

    const fetchRules = async () => {
        try {
            const res = await api.get(`/rules/profile/${selectedProfile.id}`);
            setRules(res.data);
        } catch (err) {
            console.error("Error fetching rules", err);
        }
    };

    const dayStatuses = useMemo(() => {
        if (!logs || !selectedProfile || !rules) return {};
        const statuses = {};

        // Group all dates from BOTH mealLogs and dailyLogs to compute accurate compliance status
        const datesSet = new Set();
        logs.forEach(log => {
            if (log.logged_at) datesSet.add(new Date(log.logged_at).toLocaleDateString());
        });
        dailyLogs.forEach(d => {
            if (d.date) datesSet.add(new Date(d.date).toLocaleDateString());
        });

        datesSet.forEach(dateStr => {
            const dayLogs = logs.filter(log => log.logged_at && new Date(log.logged_at).toLocaleDateString() === dateStr);
            const dayProgress = dailyLogs.find(d => d.date && new Date(d.date).toLocaleDateString() === dateStr);

            const totals = dayLogs.reduce((acc, l) => {
                acc.calories += (l.total_calories || 0);
                acc.protein += (l.total_protein_g || 0);
                acc.carbs += (l.total_carbs_g || 0);
                acc.fat += (l.total_fat_g || 0);
                acc.sugar += (l.total_sugar_g || 0);
                acc.sodium += (l.total_sodium_mg || 0);
                acc.water += (l.water_ml || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, water: 0 });

            if (dayProgress) {
                totals.water += (dayProgress.water_intake_glasses || 0) * 250;
            }

            let status = 'success';
            
            // Check Profile Targets (if any, only if there are food logs logged)
            if (dayLogs.length > 0) {
                if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 1.05) status = 'danger';
                else if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 0.9) status = 'warning';
            }

            // Check Rules Engine
            rules.forEach(rule => {
                const limit = parseFloat(rule.rule_value);
                if (!limit) return;
                
                // Skip non-water checks if no food logs are logged
                const isWaterRule = rule.category === 'Fluid/Water' || rule.category === 'Water';
                if (dayLogs.length === 0 && !isWaterRule) return;

                let current = 0;
                if (rule.category === 'Calories') current = totals.calories;
                else if (rule.category === 'Protein') current = totals.protein;
                else if (rule.category === 'Carbohydrates') current = totals.carbs;
                else if (rule.category === 'Fats') current = totals.fat;
                else if (rule.category === 'Sugar') current = totals.sugar;
                else if (rule.category === 'Sodium') current = totals.sodium;
                else if (rule.category === 'Fluid/Water' || rule.category === 'Water') current = totals.water;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
                else if (rule.rule_type === 'min' && current < limit) status = 'danger';
            });

            statuses[dateStr] = status;
        });
        return statuses;
    }, [logs, dailyLogs, selectedProfile, rules]);

    const dailyViolations = useMemo(() => {
        if (!selectedHistoryDate || !logs || !rules) return [];
        const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate);
        const dayProgress = dailyLogs.find(d => new Date(d.date).toLocaleDateString() === selectedHistoryDate);

        const totals = dayLogs.reduce((acc, l) => {
            acc.calories += (l.total_calories || 0);
            acc.protein += (l.total_protein_g || 0);
            acc.carbs += (l.total_carbs_g || 0);
            acc.fat += (l.total_fat_g || 0);
            acc.sugar += (l.total_sugar_g || 0);
            acc.sodium += (l.total_sodium_mg || 0);
            acc.water += (l.water_ml || 0);
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, water: 0 });

        if (dayProgress) {
            totals.water += (dayProgress.water_intake_glasses || 0) * 250;
        }

        const violations = [];
        rules.forEach(rule => {
            const limit = parseFloat(rule.rule_value);
            if (!limit) return;
            
            // Skip non-water checks if no food logs are logged
            const isWaterRule = rule.category === 'Fluid/Water' || rule.category === 'Water';
            if (dayLogs.length === 0 && !isWaterRule) return;

            let current = 0;
            if (rule.category === 'Calories') current = totals.calories;
            else if (rule.category === 'Protein') current = totals.protein;
            else if (rule.category === 'Carbohydrates') current = totals.carbs;
            else if (rule.category === 'Fats') current = totals.fat;
            else if (rule.category === 'Sugar') current = totals.sugar;
            else if (rule.category === 'Sodium') current = totals.sodium;
            else if (rule.category === 'Fluid/Water' || rule.category === 'Water') current = totals.water;

            const isViolation = (rule.rule_type === 'max' && current > limit) || (rule.rule_type === 'min' && current < limit);
            if (isViolation) {
                violations.push({
                    name: rule.rule_name,
                    category: rule.category,
                    actual: Math.round(current),
                    limit: limit,
                    unit: rule.rule_unit,
                    rule_type: rule.rule_type
                });
            }
        });
        return violations;
    }, [selectedHistoryDate, logs, dailyLogs, rules]);

    const fetchLogs = async () => {
        try {
            const [logsRes, progressRes] = await Promise.all([
                api.get(`/logs/profile/${selectedProfile.id}`),
                api.get(`/progress/history/${selectedProfile.id}`)
            ]);
            const sortedLogs = logsRes.data.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
            setLogs(sortedLogs);
            setDailyLogs(progressRes.data || []);
            
            if (sortedLogs.length > 0) {
                const hasLogsOnCurrentSelection = selectedHistoryDate && (
                    sortedLogs.some(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate) ||
                    (progressRes.data || []).some(d => new Date(d.date).toLocaleDateString() === selectedHistoryDate)
                );
                if (!hasLogsOnCurrentSelection) {
                    const latestDate = new Date(sortedLogs[0].logged_at).toLocaleDateString();
                    setSelectedHistoryDate(latestDate);
                }
            }

            // Mark all fetched reviews as seen
            const reviewedIds = logsRes.data.filter(l => l.status === 'reviewed' || l.status === 'verified').map(l => l.id);
            if (reviewedIds.length > 0) {
                const existingSeen = JSON.parse(localStorage.getItem('seen_meal_reviews') || '[]');
                const newSeen = Array.from(new Set([...existingSeen, ...reviewedIds]));
                localStorage.setItem('seen_meal_reviews', JSON.stringify(newSeen));
                // Dispatch event to clear sidebar badge instantly
                window.dispatchEvent(new Event('seen-reviews-updated'));
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const applyFilters = () => {
        let filtered = [...logs];

        // Status filter
        if (statusFilter === 'pending') {
            filtered = filtered.filter(log => log.status === 'pending');
        } else if (statusFilter === 'reviewed') {
            filtered = filtered.filter(log => log.status === 'reviewed' || log.status === 'verified');
        } else if (statusFilter === 'rejected') {
            filtered = filtered.filter(log => log.status === 'rejected');
        }

        // Compliance filter
        if (complianceFilter !== 'all') {
            filtered = filtered.filter(log => log.compliance_status === complianceFilter);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(log => {
                const analysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
                const items = analysis?.items?.map(i => i.name.toLowerCase()).join(' ') || '';
                const review = log.nutritionist_review?.title?.toLowerCase() || '';
                return items.includes(searchQuery.toLowerCase()) || review.includes(searchQuery.toLowerCase());
            });
        }

        // Date range filter
        if (dateRange.start) {
            filtered = filtered.filter(log => new Date(log.logged_at) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            filtered = filtered.filter(log => new Date(log.logged_at) <= new Date(dateRange.end));
        }

        setFilteredLogs(filtered);
        setCurrentPage(1); 

        // Auto-select the first date in the filtered set if the current one is gone
        const availableDates = Object.keys(filtered.reduce((acc, log) => {
            const date = new Date(log.logged_at).toLocaleDateString();
            acc[date] = true;
            return acc;
        }, {}));
        
        if (selectedHistoryDate && !availableDates.includes(selectedHistoryDate)) {
            setSelectedHistoryDate(availableDates.sort((a, b) => new Date(b) - new Date(a))[0] || null);
        } else if (!selectedHistoryDate && availableDates.length > 0) {
            setSelectedHistoryDate(availableDates.sort((a, b) => new Date(b) - new Date(a))[0]);
        }
    };

    const getComplianceBadge = (status) => {
        const badges = {
            compliant: { color: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20', icon: CheckCircle2, label: 'Compliant' },
            flagged: { color: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20', icon: AlertCircle, label: 'Flagged' },
            pending: { color: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20', icon: Clock, label: 'Pending' }
        };
        return badges[status] || badges.pending;
    };

    const getStatusBadge = (status) => {
        if (status === 'verified') {
            return { color: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20', label: 'Clinically Verified' };
        } else if (status === 'reviewed') {
            return { color: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20', label: 'Reviewed' };
        } else if (status === 'rejected') {
            return { color: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20', label: 'Correction Needed' };
        } else {
            return { color: 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)] border border-[var(--color-divider)]', label: 'Awaiting Review' };
        }
    };

    // Pagination
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    if (isInitialSync) return <HistorySkeleton />;

    if (!selectedProfile && !profileLoading) {
        const hasNoProfiles = !profiles || profiles.length === 0;
        return (
            <div className="p-8 text-center text-[var(--color-text-muted)] font-medium">
                {hasNoProfiles 
                    ? "No child profiles found. Please add a child profile to view meal history." 
                    : "Please select a child profile to view meal history."}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end gap-3">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                        <Calendar size={20} className="text-[var(--color-primary)] md:hidden" />
                        <Calendar size={28} className="text-[var(--color-primary)] hidden md:block" /> Meal History
                    </h1>
                    <p className="text-xs md:text-sm text-[var(--color-text-muted)] mt-0.5 md:mt-1">Complete tracking of all logged meals</p>
                </div>
                {!showGuide && (
                    <button 
                        onClick={() => {
                            setShowGuide(true);
                            localStorage.removeItem('smartnutri_hide_history_guide');
                        }}
                        className="h-8 md:h-10 px-2.5 md:px-4 rounded-xl border border-[var(--color-divider)] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50 transition-all flex items-center gap-1 md:gap-1.5 bg-white dark:bg-white/5 select-none shrink-0 whitespace-nowrap"
                    >
                        <Info size={11} className="md:hidden" />
                        <Info size={13} className="hidden md:block" />
                        <span className="md:hidden">Guide</span>
                        <span className="hidden md:inline">Show Guide</span>
                    </button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--color-bg-card)] p-3 sm:p-4 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-2 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
                {/* Search — full width on mobile, 2-col span on desktop */}
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={15} />
                    <input
                        type="text"
                        placeholder="Search meals or ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-xs sm:text-sm font-medium"
                    />
                </div>
                {/* Dropdowns — side-by-side on mobile, 1-col each on desktop */}
                <div className="grid grid-cols-2 gap-2 md:contents">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-[10px] sm:text-xs font-black uppercase tracking-tight"
                    >
                        <option value="all">All Reviews</option>
                        <option value="reviewed">Expert Reviewed</option>
                        <option value="pending">Awaiting Review</option>
                        <option value="rejected">Correction Needed</option>
                    </select>
                    <select
                        value={complianceFilter}
                        onChange={(e) => setComplianceFilter(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-[10px] sm:text-xs font-black uppercase tracking-tight"
                    >
                        <option value="all">All Compliance</option>
                        <option value="compliant">Compliant Only</option>
                        <option value="flagged">Flagged Only</option>
                    </select>
                </div>
            </div>


            <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
                {/* LEFT SIDEBAR: DATE SELECTION */}
                <div className="w-full md:w-72 flex-shrink-0 space-y-4">
                    {/* Interactive User Legend & Guide */}
                    {showGuide && (
                        <Card className="border border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-white/5 relative">
                            <CardContent className="p-4 sm:p-5 space-y-4 select-none pr-8">
                                <button 
                                    onClick={() => {
                                        setShowGuide(false);
                                        localStorage.setItem('smartnutri_hide_history_guide', 'true');
                                    }}
                                    className="absolute top-4 right-4 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                                    title="Dismiss Guide"
                                >
                                    <X size={12} />
                                </button>
                                <div>
                                    <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mb-1">💡 Meal Compliance Guide</h4>
                                    <p className="text-[11px] font-semibold text-[var(--color-text-muted)] leading-relaxed">
                                        Understand how SmartNutri-AI and expert clinicians evaluate logged child meals:
                                    </p>
                                </div>
                            
                            <div className="space-y-3 pt-1.5 border-t border-[var(--color-divider)] border-dashed">
                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 flex items-center justify-center shrink-0 text-[var(--color-success)]">
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-[var(--color-success)] uppercase tracking-wider block">🟢 Safe / Compliant</span>
                                        <span className="text-[10.5px] font-semibold text-[var(--color-text-muted)] leading-tight block">Fully matches child profile thresholds and contains no active allergen threats.</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 flex items-center justify-center shrink-0 text-[var(--color-danger)]">
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-[var(--color-danger)] uppercase tracking-wider block">🔴 Flagged / Hazard</span>
                                        <span className="text-[10.5px] font-semibold text-[var(--color-text-muted)] leading-tight block">Contains ingredients matching your child's specified food allergens or dietary exclusions.</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <div className="h-5 w-5 rounded-full bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 flex items-center justify-center shrink-0 text-[var(--color-info)]">
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-info)] animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-[var(--color-info)] uppercase tracking-wider block">🔵 Clinician Reviewed</span>
                                        <span className="text-[10.5px] font-semibold text-[var(--color-text-muted)] leading-tight block">Verified by an expert nutritionist. AI errors have been manually corrected.</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/15">
                                <p className="text-[10.5px] font-bold text-[var(--color-primary)] leading-normal flex items-start gap-1.5">
                                    <Info size={13} className="shrink-0 mt-0.5 text-[var(--color-primary)]" />
                                    <span>
                                        <strong>Caregiver Tip:</strong> Select any date list card to view full macro charts. Tap individual meals to request an audit or correct entries.
                                    </span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    )}

                    <Card className="border border-[var(--color-divider)]">
                        <CardContent className="p-4">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-4">Select Date</label>
                            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:max-h-[700px] scrollbar-thin pb-2 md:pb-0 snap-x px-1">
                                {Object.keys(filteredLogs.reduce((acc, log) => {
                                    const date = new Date(log.logged_at).toLocaleDateString();
                                    acc[date] = true;
                                    return acc;
                                }, {})).sort((a, b) => new Date(b) - new Date(a)).map(date => {
                                    const isSelected = selectedHistoryDate === date;
                                    const dayLogs = filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === date);
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedHistoryDate(date)}
                                            className={`flex-shrink-0 snap-start flex items-center justify-between p-2.5 sm:p-3.5 md:p-4 rounded-2xl border-2 transition-all text-left min-w-[145px] sm:min-w-[160px] md:min-w-0 ${
                                                isSelected 
                                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-xl shadow-emerald-500/30' 
                                                : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm ${
                                                    dayStatuses[date] === 'danger' ? 'bg-[var(--color-danger)]' :
                                                    dayStatuses[date] === 'warning' ? 'bg-[var(--color-warning)]' :
                                                    dayStatuses[date] === 'success' ? 'bg-[var(--color-success)]' :
                                                    'bg-zinc-300'
                                                }`} />
                                                <div className="text-left">
                                                    <div className={`text-sm font-black ${isSelected ? 'text-white' : 'text-[var(--color-text-main)]'}`}>{date}</div>
                                                    <div className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
                                                        {dayLogs.length} Entries • {Math.round(dayLogs.reduce((s, l) => s + (l.total_calories || 0), 0))} kcal
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {logs.length === 0 && (
                                    <div className="p-8 text-center text-[var(--color-text-muted)] italic text-sm">No log history available.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT AREA: DAILY LOGS */}
                <div className="flex-grow space-y-8">
                    {selectedHistoryDate && (
                        <>
                            {/* DAILY SUMMARY CARD */}
                            <div className="p-4 sm:p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-black text-[var(--color-secondary)] uppercase tracking-widest">Daily Clinical Summary</h3>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter mt-0.5">
                                            {new Date(selectedHistoryDate).toLocaleDateString(undefined, { dateStyle: 'full' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-xl border border-[var(--color-success)]/20 shrink-0">
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Tracking Active</span>
                                    </div>
                                </div>

                                {/* VIOLATIONS ALERT PANEL */}
                                {dailyViolations.length > 0 && (
                                    <div className="mb-4 p-3 bg-[var(--color-danger)]/5 border-2 border-[var(--color-danger)]/20 rounded-2xl animate-in fade-in duration-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
                                            <span className="text-[10px] font-black text-[var(--color-danger)] uppercase tracking-[0.2em]">Clinical Limit Alerts</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {dailyViolations.map((v, i) => (
                                                <div key={i} className="text-[10px] font-black flex items-center bg-[var(--color-bg-page)] px-3 py-1.5 rounded-xl border-2 border-[var(--color-divider)] shadow-sm">
                                                    <span className="text-[var(--color-danger)] mr-1.5 uppercase tracking-tight">{v.name}</span>
                                                    <span className="text-[var(--color-text-main)]">{v.actual}{v.unit}</span>
                                                    <span className="mx-2 text-[var(--color-text-muted)] opacity-30">/</span>
                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{v.rule_type === 'min' ? 'Min Goal' : 'Limit'} {v.limit}{v.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                                    {[
                                        { label: 'Total Calories', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_calories || 0), 0), unit: 'kcal', color: 'text-[var(--color-primary)]' },
                                        { label: 'Total Protein', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_protein_g || 0), 0), unit: 'g', color: 'text-blue-500' },
                                        { label: 'Total Carb', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_carbs_g || 0), 0), unit: 'g', color: 'text-orange-500' },
                                        { label: 'Total Fat', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_fat_g || 0), 0), unit: 'g', color: 'text-amber-500' }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)]/30 transition-all">
                                            <div className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1 sm:mb-2">{stat.label}</div>
                                            <div className={`text-xl sm:text-2xl font-black ${stat.color} dark:brightness-125`}>{Math.round(stat.value)} <span className="text-[10px] opacity-70">{stat.unit}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* MEAL SEQUENCE */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b-2 border-[var(--color-divider)] pb-4 px-2">
                                    <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Meal Sequence</h4>
                                    <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                                        {logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).length} Entries Captured
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate)
                                        .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
                                        .map(log => (
                                        <div 
                                            key={log.id} 
                                            onClick={() => setSelectedLog(log)}
                                            className="group relative bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)]/50 transition-all overflow-hidden flex flex-row cursor-pointer"
                                        >
                                            {/* Meal image - compact fixed width on mobile */}
                                            <div className="w-24 sm:w-44 md:w-56 flex-shrink-0 relative overflow-hidden">
                                                <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">
                                                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className={`absolute bottom-2 left-2 sm:bottom-4 sm:left-4 px-2 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg ${
                                                    log.compliance_status === 'flagged' ? 'bg-[var(--color-danger)] text-white' : 
                                                    log.compliance_status === 'pending' ? 'bg-[var(--color-warning)] text-white' :
                                                    'bg-[var(--color-success)] text-white'
                                                }`}>
                                                    {log.compliance_status === 'flagged' ? 'Flagged' : log.compliance_status === 'pending' ? 'Pending' : 'OK'}
                                                </div>
                                            </div>
                                            {/* Meal info */}
                                            <div className="p-3 sm:p-5 flex-grow flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-start justify-between mb-1 gap-2">
                                                        <h5 className="text-xs sm:text-sm font-black text-[var(--color-secondary)] uppercase tracking-tight truncate">{log.meal_category}</h5>
                                                        {(() => {
                                                            const badge = getStatusBadge(log.status);
                                                            return (
                                                                <div className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shrink-0 ${badge.color}`}>
                                                                    {badge.label}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-black text-[var(--color-text-main)] line-clamp-1 uppercase">
                                                        {log.nutritionist_review?.title || log.ai_analysis?.meal_summary || "Meal Log Entry"}
                                                    </h3>
                                                    <div className="flex gap-3 sm:gap-6 mt-2 sm:mt-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Cal</span>
                                                            <span className="text-xs sm:text-sm font-black text-[var(--color-text-main)]">{log.total_calories || 0} <span className="text-[9px] opacity-60">kcal</span></span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Pro</span>
                                                            <span className="text-xs sm:text-sm font-black text-blue-600">{log.total_protein_g || 0} <span className="text-[9px] opacity-60">g</span></span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Ate</span>
                                                            <span className="text-xs sm:text-sm font-black text-orange-600">{log.consumption_percent || 100}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Meal Detail Modal */}
            {selectedLog && (
                <MealDetailModal 
                    log={selectedLog} 
                    onClose={() => setSelectedLog(null)} 
                    onDelete={() => {
                        setSelectedLog(null);
                        fetchLogs();
                        showNotif("Meal log deleted successfully");
                    }}
                />
            )}

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />
        </div>
    );
}
