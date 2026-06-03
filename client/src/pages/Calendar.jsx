import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Activity, ChevronLeft, ChevronRight, Apple, Coffee, Sun, Moon, Flame, Utensils, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Snackbar, Alert } from '@mui/material';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { cn } from '../lib/utils';

import api from '../lib/api';
import { useProfile } from '../context/ProfileContext';
import { useLoading } from '../context/LoadingContext';
import { CalendarSkeleton } from '../components/SkeletonShell';
import MealDetailModal from '../components/MealDetailModal';

export default function Calendar() {
    const navigate = useNavigate();
    const { selectedProfile, loading: profileLoading } = useProfile();
    const { startLoading, stopLoading } = useLoading();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [logs, setLogs] = useState([]);
    const [rules, setRules] = useState([]);
    const [scheduledMeals, setScheduledMeals] = useState([]);
    const [dayStatuses, setDayStatuses] = useState({});
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    
    // Hideable Guide States
    const [showGuide, setShowGuide] = useState(() => {
        return localStorage.getItem('smartnutri_hide_calendar_guide') !== 'true';
    });
    
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Fetch data on mount or when profile/month changes
    React.useEffect(() => {
        if (selectedProfile) {
            fetchData();
        } else if (!profileLoading) {
            setLogs([]);
            setRules([]);
            setScheduledMeals([]);
            setIsInitialSync(false);
        }
    }, [selectedProfile?.id, currentMonth, profileLoading]);

    const fetchData = async () => {
        if (!selectedProfile) return;
        try {
            const [logsRes, rulesRes, plansRes] = await Promise.all([
                api.get(`/logs/profile/${selectedProfile.id}`),
                api.get(`/rules/profile/${selectedProfile.id}`),
                api.get('/meals/plans', { params: { profileId: selectedProfile.id } })
            ]);
            setLogs(logsRes.data);
            setRules(rulesRes.data);
            setScheduledMeals(plansRes.data || []);
            calculateHeatmap(logsRes.data, rulesRes.data);
            setIsInitialSync(false);
        } catch (err) {
            console.error(err);
            setIsInitialSync(false);
        }
    };


    const calculateHeatmap = (mealLogs, profileRules) => {
        const statuses = {};
        const grouped = mealLogs.reduce((acc, log) => {
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
                acc.sodium += (l.total_sodium_mg || 0);
                acc.water += (l.water_ml || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, water: 0 });

            let status = 'success'; // Default Green

            profileRules.forEach(rule => {
                const limit = parseFloat(rule.rule_value);
                if (!limit) return;
                
                let current = 0;
                if (rule.category === 'Calories') current = totals.calories;
                else if (rule.category === 'Protein') current = totals.protein;
                else if (rule.category === 'Carbohydrates' || rule.category === 'Carb') current = totals.carbs;
                else if (rule.category === 'Fats' || rule.category === 'Fat') current = totals.fat;
                else if (rule.category === 'Sodium') current = totals.sodium;
                else if (rule.category === 'Fluid/Water' || rule.category === 'Water') current = totals.water;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
                else if (rule.rule_type === 'max' && current > limit * 0.9 && status !== 'danger') status = 'warning';
                else if (rule.rule_type === 'min' && current < limit) status = 'danger';
                else if (rule.rule_type === 'min' && current < limit * 1.1 && status !== 'danger') status = 'warning';
            });

            statuses[date] = status;
        });
        setDayStatuses(statuses);
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setNotification({ ...notification, open: false });
    };

    const renderHeader = () => {
        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white dark:bg-white/5 p-4 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="flex flex-col items-center sm:items-start">
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Clinical History</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                            setCurrentMonth(new Date());
                            setSelectedDate(new Date());
                        }}
                        className="text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-primary)]"
                    >
                        Today
                    </Button>
                    <div className="flex items-center gap-1 bg-[var(--color-divider)] p-1 rounded-xl">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        let startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            const dayName = format(addDays(startDate, i), 'EEE');
            days.push(
                <div className="text-center py-2" key={i}>
                    <span className="hidden sm:block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                        {dayName}
                    </span>
                    <span className="block sm:hidden text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                        {dayName.charAt(0)}
                    </span>
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-2 px-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;
                const dateKey = day.toLocaleDateString();
                const status = dayStatuses[dateKey];
                const dayLogs = logs.filter(l => isSameDay(new Date(l.logged_at), day));
                const dayPlans = scheduledMeals.filter(p => isSameDay(new Date(p.date), day));
                const hasPrescribedPlan = dayPlans.length > 0;

                days.push(
                    <div
                        className={cn(
                            "min-h-[60px] sm:min-h-[120px] border-2 border-[var(--color-divider)] p-1 sm:p-3 relative transition-all duration-300 cursor-pointer rounded-2xl group",
                            !isSameMonth(day, monthStart) && "opacity-20 pointer-events-none",
                            isSameDay(day, selectedDate) ? "border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10 z-20" : "hover:border-[var(--color-primary)]/30 hover:scale-[1.02]"
                        )}
                        key={day}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <span className={cn(
                            "text-xs sm:text-sm font-black block mb-1 sm:mb-2 tabular-nums",
                            isSameDay(day, new Date()) ? "text-[var(--color-primary)]" : "text-[var(--color-text-main)]"
                        )}>
                            {formattedDate}
                        </span>

                        {/* Status Heatmap Dot/Indicator */}
                        <div className="flex justify-center sm:justify-start gap-1 items-center">
                            {status && (
                                <div className={cn(
                                    "h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shadow-sm",
                                    status === 'danger' ? 'bg-red-500 shadow-red-500/50' :
                                    status === 'warning' ? 'bg-amber-500 shadow-amber-500/50' :
                                    'bg-emerald-500 shadow-emerald-500/50'
                                )} />
                            )}
                            {hasPrescribedPlan && (
                                <div 
                                    className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/50" 
                                    title="Prescribed scheduled plan" 
                                />
                            )}
                            {dayLogs.length > 1 && (
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-400 opacity-40 hidden sm:block" />
                            )}
                        </div>

                        {/* Desktop Only Details */}
                        <div className="hidden sm:block space-y-1.5 mt-3">
                            {hasPrescribedPlan && (
                                <div className="text-[8px] p-1.5 rounded-lg font-black uppercase tracking-tighter truncate bg-[var(--color-primary)]/10 border-l-4 border-[var(--color-primary)] text-[var(--color-primary)]">
                                    Prescribed ({dayPlans.length} meals)
                                </div>
                            )}
                            {dayLogs.slice(0, 2).map((log, idx) => (
                                <div key={idx} className={cn(
                                    "text-[8px] p-1.5 rounded-lg font-black uppercase tracking-tighter truncate border-l-4",
                                    log.compliance_status === 'flagged' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                )}>
                                    {log.meal_category}
                                </div>
                            ))}
                            {dayLogs.length > 2 && (
                                <p className="text-[7px] font-black text-[var(--color-text-muted)] text-center uppercase tracking-widest">+{dayLogs.length - 2} more</p>
                            )}
                        </div>

                        {/* Selected Indicator */}
                        {isSameDay(day, selectedDate) && (
                            <div className="absolute top-2 right-2 h-1 w-1 sm:h-2 sm:w-2 bg-[var(--color-primary)] rounded-full animate-ping" />
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-2 sm:mb-4" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="bg-transparent rounded-2xl">{rows}</div>;
    };

    if (isInitialSync) return <CalendarSkeleton />;

    if (!selectedProfile && !profileLoading) {
        return <div className="p-8 text-center text-[var(--color-text-muted)] font-medium">Please select a child profile to view the health calendar.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-[var(--color-secondary)]">Nutrition Calendar</h1>
                    <p className="text-[var(--color-text-muted)] text-xs md:text-sm mt-1">Plan and track your meals for the month.</p>
                </div>
                {!showGuide && (
                    <button 
                        onClick={() => {
                            setShowGuide(true);
                            localStorage.removeItem('smartnutri_hide_calendar_guide');
                        }}
                        className="h-10 px-4 rounded-xl border border-[var(--color-divider)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50 transition-all flex items-center gap-1.5 bg-white dark:bg-white/5 select-none shrink-0"
                    >
                        <Info size={13} /> Show Guide
                    </button>
                )}
            </div>

            {/* Premium Interactive User Legend & Guide */}
            {showGuide && (
                <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-sm bg-white dark:bg-white/5 p-6 sm:p-8 relative">
                    <button 
                        onClick={() => {
                            setShowGuide(false);
                            localStorage.setItem('smartnutri_hide_calendar_guide', 'true');
                        }}
                        className="absolute top-6 right-6 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors z-20"
                        title="Dismiss Guide"
                    >
                        <X size={16} />
                    </button>
                    <CardContent className="p-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pr-8">
                        <div className="space-y-2 max-w-sm">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                                    <Info size={14} className="text-[var(--color-primary)]" />
                                </div>
                                <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-[0.2em]">Clinical Calendar Guide</span>
                            </div>
                            <h4 className="text-lg font-black text-[var(--color-secondary)] dark:text-white uppercase tracking-tight leading-none">Meal Compliance Heatmap</h4>
                            <p className="text-xs font-semibold text-[var(--color-text-muted)] leading-relaxed">
                                Monthly days are marked by a color-coded evaluation indicator summarizing compliance to active nutritional goals and allergen checks.
                            </p>
                        </div>

                        <div className="flex-1 w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-5 bg-[var(--color-bg-page)] dark:bg-slate-800/40 border border-[var(--color-divider)] rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-primary)]" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">🟢 Compliant</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight block">All targets met</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">🟡 Warning</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight block">Near threshold</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-bounce" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest block">🔴 Danger / Out</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight block">Limits breached</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {/* Selected Day Details */}
            <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-lg bg-white dark:bg-white/5">
                <CardHeader className="flex flex-row items-center justify-between p-6 sm:p-8 border-b-2 border-[var(--color-divider)] bg-gray-50/50 dark:bg-black/20">
                    <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-xl font-black text-[var(--color-secondary)] uppercase tracking-tight">
                            {format(selectedDate, 'MMMM d, yyyy')}
                        </CardTitle>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Daily Clinical Summary</p>
                    </div>
                    <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm",
                        dayStatuses[selectedDate.toLocaleDateString()] === 'danger' ? 'bg-red-500 text-white' :
                        dayStatuses[selectedDate.toLocaleDateString()] === 'warning' ? 'bg-amber-500 text-white' :
                        dayStatuses[selectedDate.toLocaleDateString()] === 'success' ? 'bg-emerald-500 text-white' :
                        'bg-gray-100 text-gray-400'
                    )}>
                        {dayStatuses[selectedDate.toLocaleDateString()] || 'No Records'}
                    </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                    <div className="space-y-8">
                        {/* 1. Prescribed clinical plan section */}
                        {(() => {
                            const dayPlans = scheduledMeals.filter(p => isSameDay(new Date(p.date), selectedDate));
                            if (dayPlans.length === 0) return null;
                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-[var(--color-divider)] pb-2">
                                        <Utensils size={18} className="text-[var(--color-primary)]" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-secondary)]">Prescribed Nutritionist Plan</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dayPlans.map(plan => (
                                            <div key={plan.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-md hover:translate-y-[-2px] relative overflow-hidden",
                                                    plan.is_consumed 
                                                        ? "bg-emerald-50/20 border-emerald-500/20" 
                                                        : "bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-secondary)]/5 border-[var(--color-divider)] hover:border-[var(--color-primary)]/30"
                                                )}
                                            >
                                                <div className="h-16 w-16 rounded-xl border border-[var(--color-divider)] overflow-hidden flex-shrink-0 bg-white dark:bg-white/5 flex items-center justify-center shadow-inner">
                                                    {plan.image_url ? (
                                                        <img src={plan.image_url} alt={plan.recipe_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Utensils size={24} className="text-[var(--color-primary)]/50" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-wider bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                                                            {plan.meal_type}
                                                        </span>
                                                        {plan.is_consumed && (
                                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                                Consumed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-[var(--color-text-main)] text-sm truncate uppercase tracking-tight leading-tight">
                                                        {plan.recipe_name}
                                                    </h4>
                                                    <div className="flex gap-2 mt-1.5 text-[10px] font-bold text-[var(--color-text-muted)] tracking-tighter">
                                                        <span className="flex items-center gap-0.5"><Flame size={10} className="text-orange-500" /> {plan.calories || 0} kcal</span>
                                                        <span>•</span>
                                                        <span>P: {plan.protein_g || 0}g</span>
                                                        <span>•</span>
                                                        <span>C: {plan.carbs_g || 0}g</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 2. Parent logs section */}
                        {(() => {
                            const dayLogs = logs.filter(l => isSameDay(new Date(l.logged_at), selectedDate));
                            const dayPlans = scheduledMeals.filter(p => isSameDay(new Date(p.date), selectedDate));
                            if (dayLogs.length === 0 && dayPlans.length === 0) {
                                return (
                                    <div className="py-16 text-center bg-[var(--color-bg-page)] rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                                        <div className="h-16 w-16 bg-gray-50 dark:bg-white/5 rounded-full flex-shrink-0 flex items-center justify-center mx-auto mb-4 opacity-50">
                                            <Apple className="text-[var(--color-text-muted)]" size={32} />
                                        </div>
                                        <p className="text-[var(--color-text-muted)] font-black uppercase text-[10px] tracking-[0.2em]">No clinical logs or prescribed plans for this day</p>
                                    </div>
                                );
                            }
                            if (dayLogs.length === 0) return null;
                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b-2 border-[var(--color-divider)] pb-2">
                                        <Apple size={18} className="text-emerald-500" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-secondary)]">Parent Uploaded Logs</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {dayLogs.map(log => (
                                            <div key={log.id}
                                                className="flex flex-col xs:flex-row items-start xs:items-center gap-5 p-5 rounded-3xl bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] group cursor-pointer hover:border-[var(--color-primary)] transition-all hover:shadow-xl hover:translate-y-[-2px]"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-[var(--color-divider)] overflow-hidden flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                                    <img src={log.image_url} alt="meal" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 w-full">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <h4 className="font-black text-[var(--color-text-main)] text-lg uppercase tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
                                                                {log.meal_category}
                                                            </h4>
                                                        </div>
                                                        <span className={cn(
                                                            "text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm",
                                                            log.compliance_status === 'flagged' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                                        )}>
                                                            {log.compliance_status}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-[var(--color-divider)]/50">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                                <Flame size={12} className="text-orange-500" />
                                                            </div>
                                                            <span className="text-xs font-black tabular-nums">{log.total_calories} <span className="text-[9px] text-[var(--color-text-muted)]">KCAL</span></span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-600">P</div>
                                                            <span className="text-xs font-black tabular-nums">{log.total_protein_g} <span className="text-[9px] text-[var(--color-text-muted)]">G</span></span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-600">C</div>
                                                            <span className="text-xs font-black tabular-nums">{log.total_carbs_g} <span className="text-[9px] text-[var(--color-text-muted)]">G</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </CardContent>
            </Card>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>

            {selectedLog && (
                <MealDetailModal
                    log={selectedLog}
                    rules={rules}
                    allergies={selectedProfile?.allergies || []}
                    onClose={() => setSelectedLog(null)}
                    onDelete={(deletedId) => {
                        setSelectedLog(null);
                        setLogs(prev => prev.filter(l => l.id !== deletedId));
                    }}
                />
            )}
        </div>
    );
}
