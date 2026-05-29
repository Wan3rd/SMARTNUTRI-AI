import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { motion } from 'framer-motion';
import { Activity, Calendar, Filter, Search, CheckCircle2, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });
    const [isInitialSync, setIsInitialSync] = useState(true);

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
        const grouped = logs.reduce((acc, log) => {
            const date = new Date(log.logged_at).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(log);
            return acc;
        }, {});

        Object.keys(grouped).forEach(date => {
            const dayLogs = grouped[date];
            const totals = dayLogs.reduce((acc, l) => {
                acc.calories += (l.total_calories || 0);
                acc.protein += (l.total_protein_g || 0);
                acc.carbs += (l.total_carbs_g || 0);
                acc.fat += (l.total_fat_g || 0);
                acc.sugar += (l.total_sugar_g || 0);
                acc.sodium += (l.total_sodium_mg || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });

            let status = 'success';
            
            // Check Profile Targets (if any)
            if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 1.05) status = 'danger';
            else if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 0.9) status = 'warning';

            // Check Rules Engine
            rules.forEach(rule => {
                const limit = parseFloat(rule.rule_value);
                if (!limit) return;
                
                let current = 0;
                if (rule.category === 'Calories') current = totals.calories;
                else if (rule.category === 'Protein') current = totals.protein;
                else if (rule.category === 'Carbohydrates') current = totals.carbs;
                else if (rule.category === 'Fats') current = totals.fat;
                else if (rule.category === 'Sugar') current = totals.sugar;
                else if (rule.category === 'Sodium') current = totals.sodium;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
            });

            statuses[date] = status;
        });
        return statuses;
    }, [logs, selectedProfile, rules]);

    const dailyViolations = useMemo(() => {
        if (!selectedHistoryDate || !logs || !rules) return [];
        const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate);
        const totals = dayLogs.reduce((acc, l) => {
            acc.calories += (l.total_calories || 0);
            acc.protein += (l.total_protein_g || 0);
            acc.carbs += (l.total_carbs_g || 0);
            acc.fat += (l.total_fat_g || 0);
            acc.sugar += (l.total_sugar_g || 0);
            acc.sodium += (l.total_sodium_mg || 0);
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });

        const violations = [];
        rules.forEach(rule => {
            const limit = parseFloat(rule.rule_value);
            if (!limit) return;
            
            let current = 0;
            if (rule.category === 'Calories') current = totals.calories;
            else if (rule.category === 'Protein') current = totals.protein;
            else if (rule.category === 'Carbohydrates') current = totals.carbs;
            else if (rule.category === 'Fats') current = totals.fat;
            else if (rule.category === 'Sugar') current = totals.sugar;
            else if (rule.category === 'Sodium') current = totals.sodium;

            if (rule.rule_type === 'max' && current > limit) {
                violations.push({
                    name: rule.rule_name,
                    category: rule.category,
                    actual: Math.round(current),
                    limit: limit,
                    unit: rule.rule_unit
                });
            }
        });
        return violations;
    }, [selectedHistoryDate, logs, rules]);

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/logs/profile/${selectedProfile.id}`);
            const sortedLogs = res.data.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
            setLogs(sortedLogs);
            
            if (sortedLogs.length > 0) {
                const latestDate = new Date(sortedLogs[0].logged_at).toLocaleDateString();
                setSelectedHistoryDate(latestDate);
            }

            // Mark all fetched reviews as seen
            const reviewedIds = res.data.filter(l => l.status === 'reviewed' || l.status === 'verified').map(l => l.id);
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
                const items = log.ai_analysis?.items?.map(i => i.name.toLowerCase()).join(' ') || '';
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
            compliant: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2, label: 'Compliant' },
            flagged: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertCircle, label: 'Flagged' },
            pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: Clock, label: 'Pending' }
        };
        return badges[status] || badges.pending;
    };

    const getStatusBadge = (status) => {
        if (status === 'verified') {
            return { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Clinically Verified' };
        } else if (status === 'reviewed') {
            return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Reviewed' };
        } else if (status === 'rejected') {
            return { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50', label: 'Correction Needed' };
        } else {
            return { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Awaiting Review' };
        }
    };

    // Pagination
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    if (isInitialSync) return <HistorySkeleton />;

    if (!selectedProfile && !profileLoading) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">Please select a child profile to view meal history.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                    <Calendar className="text-[var(--color-primary)]" /> Meal History
                </h1>
                <p className="text-[var(--color-text-muted)] mt-1">Complete tracking of all logged meals</p>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[var(--color-bg-card)] p-4 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search meals or ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-medium"
                    />
                </div>
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-black uppercase tracking-tight"
                    >
                        <option value="all">All Reviews</option>
                        <option value="reviewed">Expert Reviewed</option>
                        <option value="pending">Awaiting Review</option>
                        <option value="rejected">Correction Needed</option>
                    </select>
                </div>
                <div>
                    <select
                        value={complianceFilter}
                        onChange={(e) => setComplianceFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:border-[var(--color-primary)] outline-none transition-all text-sm font-black uppercase tracking-tight"
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
                    <Card className="border border-[var(--color-divider)]">
                        <CardContent className="p-4">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-4">Select Date</label>
                            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:max-h-[700px] scrollbar-hide pb-3 md:pb-0 snap-x">
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
                                            className={`flex-shrink-0 snap-start flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all text-left min-w-[140px] md:min-w-0 ${
                                                isSelected 
                                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg md:scale-[1.02] z-10 shadow-emerald-500/20' 
                                                : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm ${
                                                    dayStatuses[date] === 'danger' ? 'bg-red-500' :
                                                    dayStatuses[date] === 'warning' ? 'bg-amber-500' :
                                                    dayStatuses[date] === 'success' ? 'bg-emerald-500' :
                                                    'bg-gray-300'
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
                            <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-widest">Daily Clinical Summary</h3>
                                        <p className="text-[11px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter mt-1">
                                            {new Date(selectedHistoryDate).toLocaleDateString(undefined, { dateStyle: 'full' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Clinical Tracking Active</span>
                                        </div>
                                    </div>
                                </div>

                                {/* VIOLATIONS ALERT PANEL */}
                                {dailyViolations.length > 0 && (
                                    <div className="mb-6 p-4 bg-rose-50/50 dark:bg-rose-500/5 border-2 border-rose-100 dark:border-rose-500/20 rounded-2xl animate-in fade-in duration-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em]">Clinical Limit Alerts</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {dailyViolations.map((v, i) => (
                                                <div key={i} className="text-[11px] font-black flex items-center bg-[var(--color-bg-page)] px-4 py-2 rounded-2xl border-2 border-[var(--color-divider)] shadow-sm">
                                                    <span className="text-[var(--color-danger)] mr-2 uppercase tracking-tight">{v.name}</span>
                                                    <span className="text-[var(--color-text-main)]">{v.actual}{v.unit}</span>
                                                    <span className="mx-3 text-[var(--color-text-muted)] opacity-30">/</span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold">Limit {v.limit}{v.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Calories', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_calories || 0), 0), unit: 'kcal', color: 'text-[var(--color-primary)]' },
                                        { label: 'Total Protein', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_protein_g || 0), 0), unit: 'g', color: 'text-blue-500' },
                                        { label: 'Total Carb', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_carbs_g || 0), 0), unit: 'g', color: 'text-orange-500' },
                                        { label: 'Total Fat', value: filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_fat_g || 0), 0), unit: 'g', color: 'text-amber-500' }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] group hover:border-[var(--color-primary)]/30 transition-all">
                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">{stat.label}</div>
                                            <div className={`text-2xl font-black ${stat.color} dark:brightness-125`}>{Math.round(stat.value)} <span className="text-xs opacity-70">{stat.unit}</span></div>
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

                                <div className="grid grid-cols-1 gap-4">
                                    {filteredLogs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate)
                                        .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
                                        .map(log => (
                                        <div 
                                            key={log.id} 
                                            onClick={() => setSelectedLog(log)}
                                            className="group relative bg-[var(--color-bg-card)] rounded-[2.5rem] border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)]/50 transition-all overflow-hidden flex flex-col md:flex-row h-auto md:h-44 cursor-pointer"
                                        >
                                            <div className="w-full md:w-56 h-44 md:h-auto relative overflow-hidden flex-shrink-0">
                                                <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-widest">
                                                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${
                                                    log.compliance_status === 'flagged' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                                }`}>
                                                    {log.compliance_status === 'flagged' ? 'Flagged' : 'Compliant'}
                                                </div>
                                            </div>
                                            <div className="p-6 flex-grow flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h5 className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-tight">{log.meal_category}</h5>
                                                        {(() => {
                                                            const badge = getStatusBadge(log.status);
                                                            return (
                                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badge.color}`}>
                                                                    {badge.label}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <h3 className="text-lg font-black text-[var(--color-text-main)] line-clamp-1 uppercase">
                                                        {log.nutritionist_review?.title || log.ai_analysis?.meal_summary || "Meal Log Entry"}
                                                    </h3>
                                                    <div className="flex gap-6 mt-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Calories</span>
                                                            <span className="text-sm font-black text-[var(--color-text-main)]">{log.total_calories || 0} <span className="text-[10px] opacity-60">kcal</span></span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Protein</span>
                                                            <span className="text-sm font-black text-blue-600">{log.total_protein_g || 0} <span className="text-[10px] opacity-60">g</span></span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Consumption</span>
                                                            <span className="text-sm font-black text-orange-600">
                                                                {log.consumption_percent || 100}%
                                                            </span>
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
