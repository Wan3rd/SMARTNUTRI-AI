import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MealLogger from '../components/MealLogger';
import MealDetailModal from '../components/MealDetailModal';
import { Card, CardContent } from '../components/common/Card';
import { Calendar, CheckCircle2, AlertCircle, Clock, ExternalLink, Activity, Info, Star, Trash2, MessageSquare, BadgeCheck, User, Building2, Phone, Plus, Minus, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLoading } from '../context/LoadingContext';
import { cn, formatValue, convertHeight, convertWeight, convertWater } from '../lib/utils';
import api from '../lib/api';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { DashboardSkeleton } from '../components/SkeletonShell';

import Notification from '../components/common/Notification';

export default function ParentDashboard() {
    const { user } = useAuth();
    const { selectedProfile, loading: profileLoading } = useProfile();
    const { startLoading, stopLoading } = useLoading();
    const [allLogs, setAllLogs] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [rules, setRules] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filterTab, setFilterTab] = useState('all');
    const [activeTab, setActiveTab] = useState('status'); // 'status' or 'reviews'
    const [assignedNutritionist, setAssignedNutritionist] = useState(null);
    const [dailyLog, setDailyLog] = useState({ water_intake_glasses: 0, steps_count: 0 });
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // Show welcome notification once on first arrival
        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
            setShowWelcome(true);
            sessionStorage.setItem('hasSeenWelcome', 'true');
        }
    }, []);

    useEffect(() => {
        fetchAssignedNutritionist();
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (selectedProfile) {
                startLoading('Syncing Child Profile...');
                await Promise.all([fetchLogs(), fetchRules(), fetchDailyLog()]);
                setIsInitialSync(false);
                stopLoading();
            } else if (!profileLoading) {
                setIsInitialSync(false);
            }
        };
        loadDashboardData();
    }, [selectedProfile?.id, filterTab, profileLoading]);

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/logs/profile/${selectedProfile.id}`);
            setAllLogs(res.data);

            let filtered = res.data;
            if (filterTab === 'pending') filtered = res.data.filter(log => log.status === 'pending' || log.status === 'rejected');
            else if (filterTab === 'reviewed') filtered = res.data.filter(log => log.status === 'reviewed' || log.status === 'verified');
            else if (filterTab === 'flagged') filtered = res.data.filter(log => log.compliance_status === 'flagged');

            setRecentLogs(filtered.slice(0, 5));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRules = async () => {
        try {
            const res = await api.get(`/rules/profile/${selectedProfile.id}`);
            setRules(res.data);
        } catch (err) {
            console.error("No rules found or error", err);
        }
    };

    const fetchAssignedNutritionist = async () => {
        try {
            const res = await api.get('/auth/my-nutritionist');
            setAssignedNutritionist(res.data);
        } catch (err) {
            // Ignore 404 as it just means no nutritionist is assigned yet
            if (err.response?.status !== 404) {
                console.error("Error fetching nutritionist", err);
            }
        }
    };

    const fetchDailyLog = async () => {
        if (!selectedProfile) return;
        try {
            const res = await api.get(`/progress/today?profileId=${selectedProfile.id}`);
            setDailyLog(res.data || { water_intake_glasses: 0, steps_count: 0 });
        } catch (err) {
            console.error("Error fetching daily progress log:", err);
        }
    };

    const handleQuickWaterChange = async (action) => {
        if (!selectedProfile) return;
        
        // Optimistic UI update
        const prevGlasses = dailyLog?.water_intake_glasses || 0;
        let newGlasses = prevGlasses;
        if (action === 'increment') newGlasses += 1;
        else if (action === 'decrement' && prevGlasses > 0) newGlasses -= 1;
        
        setDailyLog(prev => ({ ...prev, water_intake_glasses: newGlasses }));
        
        try {
            await api.post('/progress/water', { action, profileId: selectedProfile.id });
        } catch (err) {
            console.error("Failed to update water intake on server:", err);
            // Revert state on error
            setDailyLog(prev => ({ ...prev, water_intake_glasses: prevGlasses }));
        }
    };


    // Calculate Today's Intake vs Goals
    const todayLogs = allLogs.filter(log => new Date(log.logged_at).toDateString() === new Date().toDateString());

    let todayIntake = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, water: 0 };
    todayLogs.forEach(log => {
        // Hydration from water_ml field
        todayIntake.water += log.water_ml || 0;

        const analysis = log.nutritionist_review?.verified_analysis || log.ai_analysis;
        if (analysis) {
            todayIntake.calories += analysis.nutrition?.calories || analysis.total_calories_est || 0;
            todayIntake.protein += analysis.nutrition?.protein || analysis.macros_est?.protein_g || 0;
            todayIntake.carbs += analysis.nutrition?.carbs || analysis.macros_est?.carbs_g || 0;
            todayIntake.fat += analysis.nutrition?.fat || analysis.macros_est?.fat_g || 0;
            todayIntake.sugar += analysis.nutrition?.sugar || analysis.macros_est?.sugar_g || 0;
            todayIntake.sodium += analysis.nutrition?.sodium || analysis.macros_est?.sodium_mg || 0;
        }
    });

    const glassesVolume = (dailyLog?.water_intake_glasses || 0) * 250;
    const totalIntakeMl = glassesVolume + todayIntake.water;

    const getRuleForCategory = (category) => {
        // Find rules that match the category or aliases (e.g., 'water' matches 'Fluid/Water')
        const matches = rules.filter(r => {
            const cat = r.category?.toLowerCase();
            const target = category.toLowerCase();
            return cat === target || (target === 'water' && cat === 'fluid/water');
        });

        if (matches.length === 0) return null;

        // Prioritize 'max' rules for limit-based visualization, but accept any (min/max) as the target
        return matches.find(r => r.rule_type?.toLowerCase() === 'max') || matches[0];
    };

    const latestMeal = recentLogs[0];
    const suggestions = latestMeal?.violation_details?.suggestions || [];

    const renderProgressBar = (label, current, rule, unit, color = 'green') => {
        if (!rule) return null;
        const goal = parseFloat(rule.rule_value);
        if (!goal) return null;

        const isMax = rule.rule_type?.toLowerCase() === 'max';
        const percentage = Math.min((current / goal) * 100, 100);
        
        let barColor = 'bg-gradient-to-r from-emerald-500 to-green-400';
        let badgeStyle = '';
        let badgeLabel = '';

        if (isMax) {
            badgeLabel = 'Max Limit';
            badgeStyle = 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5';
            if (current > goal) {
                barColor = 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
            } else if (current > goal * 0.8) {
                barColor = 'bg-gradient-to-r from-amber-500 to-orange-400';
            } else {
                barColor = 'bg-gradient-to-r from-cyan-500 to-blue-400';
            }
        } else {
            badgeLabel = 'Min Target';
            badgeStyle = 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5';
            if (current >= goal) {
                barColor = 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
            } else if (current >= goal * 0.5) {
                barColor = 'bg-gradient-to-r from-amber-500 to-yellow-400';
            } else {
                barColor = 'bg-gradient-to-r from-orange-500 to-rose-400 animate-pulse';
            }
        }

        // Overrides for water or other custom colors if specified and no rule overrides are active
        if (color === 'blue' && !isMax && current < goal) {
            barColor = 'bg-gradient-to-r from-blue-500 to-cyan-400';
        }

        return (
            <div className="mb-5 bg-zinc-50 dark:bg-white/[0.01] p-3.5 rounded-2xl border border-[var(--color-divider)] transition-all duration-300 hover:border-[var(--color-primary)]/20 relative group">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[var(--color-secondary)] uppercase tracking-wider">{label}</span>
                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border select-none", badgeStyle)}>
                            {badgeLabel}
                        </span>
                        {!isMax && current >= goal && (
                            <span className="text-[10px] text-emerald-500 animate-bounce">✓</span>
                        )}
                        {isMax && current > goal && (
                            <span className="text-[10px] text-red-500 font-bold animate-pulse">⚠️ OVER</span>
                        )}
                    </div>
                    <span className={cn("text-xs sm:text-sm font-black tabular-nums flex items-baseline gap-0.5", 
                        (isMax && current > goal) ? 'text-red-500 font-extrabold' : 
                        (!isMax && current >= goal) ? 'text-emerald-500' : 'text-[var(--color-primary)]'
                    )}>
                        {formatValue(current, user?.nutrient_precision)} 
                        <span className="opacity-50 text-[10px] px-0.5">/</span> 
                        {formatValue(goal, user?.nutrient_precision)} 
                        <span className="text-[10px] opacity-70 uppercase pl-0.5">{unit}</span>
                    </span>
                </div>
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner relative">
                    <div
                        className={cn("h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.15)]", barColor)}
                        style={{ width: `${percentage}%` }}
                    />
                    {/* Dashed Guideline at 100% threshold mark */}
                    <div className="absolute top-0 bottom-0 left-[100%] border-l border-dashed border-zinc-400 dark:border-zinc-500 opacity-60 pointer-events-none" />
                </div>
            </div>
        );
    };



    if (isInitialSync) return <DashboardSkeleton />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <AnnouncementBanner />
            <header className="text-center sm:text-left px-2">
                <h1 className={cn("text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--color-secondary)] uppercase tracking-tight leading-tight", user?.privacy_mode && "privacy-blur")}>
                    {selectedProfile?.child_name || 'Child Dashboard'}
                </h1>
                <p className="text-[10px] sm:text-sm text-[var(--color-text-muted)] font-bold uppercase tracking-widest mt-1.5 opacity-80">
                    Clinical development tracking & expert logs
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Logger & Clinical Target */}
                <div className="lg:col-span-7 space-y-6">

                    {selectedProfile && (
                        <MealLogger 
                            key={selectedProfile.id} 
                            profileId={selectedProfile.id} 
                            onLogged={fetchLogs} 
                            recentLogs={recentLogs} 
                            allergies={selectedProfile.allergies || []}
                        />
                    )}

                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-sm bg-white dark:bg-white/5">
                        <CardContent className="p-5 sm:p-8">
                            <h3 className="text-[10px] sm:text-sm font-black text-[var(--color-secondary)] mb-6 flex items-center gap-2.5 uppercase tracking-widest">
                                <Activity size={16} className="text-[var(--color-primary)]" />
                                Daily Nutritional Goal
                            </h3>
                            {rules.length > 0 ? (
                                <div className="space-y-5">
                                    {renderProgressBar('Calories', todayIntake.calories, getRuleForCategory('calories'), 'kcal')}
                                    {(() => {
                                        const waterRule = getRuleForCategory('water') || { rule_value: 1500, rule_type: 'min' };
                                        const convCurrent = convertWater(totalIntakeMl, user?.measurement_system);
                                        const convGoal = convertWater(parseFloat(waterRule.rule_value), user?.measurement_system);
                                        const modifiedRule = { ...waterRule, rule_value: convGoal.value };
                                        return renderProgressBar('Hydration', convCurrent.value, modifiedRule, convCurrent.unit, 'blue');
                                    })()}
                                    {renderProgressBar('Protein', todayIntake.protein, getRuleForCategory('protein'), 'g')}
                                    {renderProgressBar('Sodium', todayIntake.sodium, getRuleForCategory('sodium'), 'mg')}
                                    {renderProgressBar('Sugar', todayIntake.sugar, getRuleForCategory('sugar'), 'g')}
                                    {renderProgressBar('Fats', todayIntake.fat, getRuleForCategory('fats'), 'g')}
                                </div>
                            ) : (
                                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-[var(--color-divider)] text-center">
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">No clinical targets set</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Insights & Expert Feedback */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Assigned Nutritionist Card */}
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-sm group hover:shadow-xl transition-all duration-500 bg-white dark:bg-white/5">
                        <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-[var(--color-primary)] dark:to-[var(--color-primary-hover)] p-3.5 flex items-center justify-between">
                                <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Health Partner</h3>
                                <div className="h-5 w-5 bg-white/20 rounded-md flex items-center justify-center">
                                    <BadgeCheck size={12} className="text-white" />
                                </div>
                            </div>
                             <div className="p-4 sm:p-5 flex flex-row items-center gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl border-2 border-[var(--color-divider)] overflow-hidden bg-[var(--color-bg-page)] flex items-center justify-center shadow-inner relative z-10">
                                        {assignedNutritionist?.profile_image_url ? (
                                            <img src={assignedNutritionist.profile_image_url} alt="Nutri" className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20">
                                                {assignedNutritionist ? <User size={24} className="text-gray-300" /> : <Activity size={24} className="text-[var(--color-primary)] animate-pulse" />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 bg-emerald-500 rounded-lg border-2 border-[var(--color-bg-card)] flex items-center justify-center z-20 shadow-md">
                                        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 bg-white rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-0.5">
                                        {assignedNutritionist ? 'Clinician' : 'Clinical Intelligence'}
                                    </p>
                                    <h4 className={cn("text-sm sm:text-lg lg:text-xl font-black text-[var(--color-text-main)] truncate uppercase leading-tight", user?.privacy_mode && "privacy-blur")}>
                                        {assignedNutritionist?.full_name || 'SmartNutri AI'}
                                    </h4>
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-80 truncate">
                                        {assignedNutritionist?.specialization || 'Clinical AI Monitor'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="px-5 pb-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                                    <div className="flex items-center gap-2.5 p-2 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)]">
                                        <BadgeCheck size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                        <p className="text-[10px] font-black text-[var(--color-text-main)] uppercase truncate">
                                            {assignedNutritionist?.license_no || 'Active Monitoring'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2.5 p-2 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)]">
                                        <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <p className="text-[10px] font-black text-[var(--color-text-main)] uppercase truncate">
                                            {assignedNutritionist?.phone || 'Always Online'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tab Switcher */}
                    <div className="flex p-1.5 bg-[var(--color-divider)] dark:bg-white/5 rounded-[22px] border border-[var(--color-divider)] shadow-inner">
                        {[
                            { id: 'status', label: 'Daily Status', icon: <Activity size={18} /> },
                            { id: 'reviews', label: 'Expert Reviews', icon: <MessageSquare size={18} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-3 h-12 rounded-[18px] text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-lg shadow-emerald-500/10 border-b-2 border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)]/50'}`}
                            >
                                <span className={cn(activeTab === tab.id ? 'text-[var(--color-primary)]' : 'opacity-50', "shrink-0")}>
                                    {tab.icon}
                                </span>
                                <span className={cn("truncate", isMobile ? "hidden xs:inline" : "inline")}>{tab.label}</span>
                                {isMobile && <span className="sr-only">{tab.label}</span>}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'status' ? (
                            <motion.div
                                key="status"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {allLogs.length > 0 && (
                                    <Card className={cn(
                                        "border-2 relative overflow-hidden rounded-[2rem] shadow-xl transition-all duration-500 bg-white dark:bg-zinc-900/50 p-6 sm:p-8",
                                        (latestMeal?.compliance_score || 100) >= 80 
                                            ? 'border-emerald-500/20 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.15)] bg-gradient-to-br from-emerald-500/[0.02] to-teal-500/[0.01]' 
                                            : 'border-amber-500/20 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)] bg-gradient-to-br from-amber-500/[0.02] to-orange-500/[0.01]'
                                    )}>
                                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--color-primary) 0.75px, transparent 0.75px)', backgroundSize: '12px 12px' }} />
                                        <CardContent className="p-0 flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
                                            {/* Circular SVG HUD Ring */}
                                            <div className="relative flex items-center justify-center shrink-0 w-32 h-32 sm:w-36 sm:h-36">
                                                {/* Background soft pulse aura */}
                                                <div className={cn(
                                                    "absolute inset-2 rounded-full blur-[20px] transition-all duration-1000",
                                                    (latestMeal?.compliance_score || 100) >= 80 
                                                        ? 'bg-emerald-500/20 dark:bg-emerald-500/10 animate-pulse' 
                                                        : 'bg-amber-500/20 dark:bg-amber-500/10 animate-pulse'
                                                )} />
                                                
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                    {/* Outer Dotted rotating HUD line */}
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="47"
                                                        fill="transparent"
                                                        stroke="rgba(16, 185, 129, 0.1)"
                                                        strokeWidth="0.75"
                                                        strokeDasharray="3 3"
                                                        className="animate-[spin_40s_linear_infinite]"
                                                    />
                                                    {/* Inner Track */}
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="transparent"
                                                        stroke="rgba(0,0,0,0.06)"
                                                        className="dark:stroke-white/5"
                                                        strokeWidth="8"
                                                    />
                                                    {/* Active Indicator Ring */}
                                                    <motion.circle
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="transparent"
                                                        stroke={(latestMeal?.compliance_score || 100) >= 80 ? 'url(#emeraldGrad)' : 'url(#amberGrad)'}
                                                        strokeWidth="8"
                                                        strokeLinecap="round"
                                                        strokeDasharray={2 * Math.PI * 40}
                                                        initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                                        animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - (latestMeal?.compliance_score || 100) / 100) }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                    />
                                                    <defs>
                                                        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#10b981" />
                                                            <stop offset="100%" stopColor="#059669" />
                                                        </linearGradient>
                                                        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#f59e0b" />
                                                            <stop offset="100%" stopColor="#d97706" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                {/* Centered Score */}
                                                <div className="absolute flex flex-col items-center justify-center select-none text-center">
                                                    <span className="text-3xl sm:text-4xl font-black tracking-tighter text-[var(--color-secondary)] leading-none tabular-nums">
                                                        {latestMeal?.compliance_score || 100}
                                                    </span>
                                                    <span className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">score</span>
                                                </div>
                                            </div>

                                            {/* Score description details */}
                                            <div className="flex-1 text-center md:text-left space-y-3">
                                                <div>
                                                    <span className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-[0.25em]">Clinical Performance</span>
                                                    <h4 className="text-lg sm:text-xl font-black text-[var(--color-secondary)] uppercase mt-0.5 tracking-tight leading-none">
                                                        {(latestMeal?.compliance_score || 100) >= 80 ? 'Optimal Intake Level' : 'Review & Adjust Plan'}
                                                    </h4>
                                                    <p className="text-xs font-medium text-[var(--color-text-muted)] mt-1.5 leading-relaxed max-w-sm">
                                                        {(latestMeal?.compliance_score || 100) >= 80 
                                                            ? 'Your child is maintaining outstanding compliance with all active nutritionist goals and clinical parameters today.'
                                                            : 'Some intake indicators have departed from standard clinical targets. Check details and recommendations below.'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-divider)] text-[10px] font-black uppercase text-[var(--color-text-main)] border border-black/5 dark:border-white/5">
                                                        <Star size={10} className="text-yellow-500 shrink-0" fill="currentColor" />
                                                        <span>Latest rating</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Ultra-Premium Live Wave Hydration Card */}
                                {(() => {
                                    const waterRule = getRuleForCategory('water') || { rule_value: 1500, rule_type: 'min' };
                                    const goalMl = parseFloat(waterRule.rule_value) || 1500;
                                    const hydrationPercentage = Math.min(Math.round((totalIntakeMl / goalMl) * 100), 100);
                                    
                                    const convCurrent = convertWater(totalIntakeMl, user?.measurement_system);
                                    const convGoal = convertWater(goalMl, user?.measurement_system);
                                    
                                    return (
                                        <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-xl transition-all duration-500 bg-white dark:bg-zinc-900/50 p-6 sm:p-8 relative">
                                            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--color-primary) 0.75px, transparent 0.75px)', backgroundSize: '12px 12px' }} />
                                            <CardContent className="p-0 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 relative z-10">
                                                
                                                {/* Tumbler Water Glass Fluid Simulation */}
                                                <div className="relative flex items-center justify-center shrink-0">
                                                    {/* Background light aura */}
                                                    <div className="absolute inset-[-10px] rounded-full blur-[25px] bg-sky-500/10 dark:bg-sky-500/5 animate-pulse" />
                                                    
                                                    {/* Tumbler Cup Container */}
                                                    <div className="relative w-28 h-40 bg-slate-100/50 dark:bg-slate-800/20 rounded-b-[2rem] rounded-t-lg border-[3.5px] border-slate-300 dark:border-slate-700/80 overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] flex items-end">
                                                        
                                                        {/* Animated wave elements container */}
                                                        <div 
                                                            className="w-full absolute bottom-0 left-0 transition-all duration-1000 ease-out" 
                                                            style={{ height: `${hydrationPercentage}%` }}
                                                        >
                                                            {/* Slow overlapping wave */}
                                                            {hydrationPercentage > 0 && (
                                                                <svg 
                                                                    className="absolute top-[-23px] left-0 w-[200%] h-6 text-sky-400/40 dark:text-sky-500/30 fill-current animate-wave-slow pointer-events-none" 
                                                                    viewBox="0 0 1200 120" 
                                                                    preserveAspectRatio="none"
                                                                >
                                                                    <path d="M0,60 C150,100 350,20 500,60 C650,100 850,20 1000,60 C1150,100 1350,20 1500,60 L1500,120 L0,120 Z" />
                                                                </svg>
                                                            )}
                                                            {/* Fast wave */}
                                                            {hydrationPercentage > 0 && (
                                                                <svg 
                                                                    className="absolute top-[-23px] left-0 w-[300%] h-6 text-blue-500/60 dark:text-cyan-400/50 fill-current animate-wave-fast pointer-events-none" 
                                                                    viewBox="0 0 1200 120" 
                                                                    preserveAspectRatio="none"
                                                                >
                                                                    <path d="M0,50 C100,20 250,80 400,50 C550,20 700,80 850,50 C1000,20 1150,80 1300,50 L1300,120 L0,120 Z" />
                                                                </svg>
                                                            )}
                                                            {/* Solid deep fill underneath */}
                                                            <div className="w-full h-40 bg-gradient-to-t from-blue-600/90 to-blue-500/80 dark:from-cyan-600/80 dark:to-cyan-500/70 shadow-[0_0_12px_rgba(59,130,246,0.3)]" />
                                                        </div>

                                                        {/* Realistic Glass Shine & Reflections */}
                                                        <div className="absolute top-0 bottom-0 left-3 w-1.5 bg-white/20 dark:bg-white/10 blur-[0.5px] rounded-full pointer-events-none" />
                                                        <div className="absolute top-0 bottom-0 right-3 w-1.5 bg-white/10 dark:bg-white/5 blur-[0.5px] rounded-full pointer-events-none" />
                                                        <div className="absolute top-2 right-4 w-4 h-4 bg-white/25 dark:bg-white/10 blur-[1px] rounded-full pointer-events-none" />
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                                                        
                                                        {/* Dynamic HUD reading overlay */}
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                                                            <span className="text-sm font-black tracking-tight text-[var(--color-secondary)] dark:text-white tabular-nums drop-shadow-[0_2px_4px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                                                {hydrationPercentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dynamic Content Controls */}
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                                                                <Droplets size={14} className="text-blue-600 dark:text-cyan-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-[0.25em]">Live Hydration Monitor</span>
                                                        </div>
                                                        <h4 className="text-lg sm:text-xl font-black text-[var(--color-secondary)] dark:text-white uppercase tracking-tight leading-none">
                                                            {hydrationPercentage >= 100 ? 'Optimal Hydration Reached!' : 'Daily Fluid Tracker'}
                                                        </h4>
                                                        <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-2 leading-relaxed max-w-sm">
                                                            {hydrationPercentage >= 100 
                                                                ? 'Wonderful job! Your child has met or exceeded the daily recommended hydration goal. Keep it up!' 
                                                                : 'Fluids are vital for core metabolic functions and concentration. Use quick buttons below to add cups easily.'}
                                                        </p>
                                                    </div>

                                                    {/* Goal Status Numbers */}
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--color-secondary)] dark:text-white leading-none">
                                                                {formatValue(convCurrent.value, user?.nutrient_precision)}
                                                            </span>
                                                            <span className="text-sm font-black text-[var(--color-text-muted)]">
                                                                / {formatValue(convGoal.value, user?.nutrient_precision)} {convCurrent.unit}
                                                            </span>
                                                        </div>
                                                        {hydrationPercentage >= 100 && (
                                                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 tracking-wider shadow-sm select-none">
                                                                <BadgeCheck size={12} className="text-emerald-500 shrink-0" />
                                                                Target Achieved
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Quick Log Controls */}
                                                    <div className="flex flex-wrap items-center gap-3.5 pt-1">
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800/40 rounded-2xl p-1 border border-[var(--color-divider)] shrink-0">
                                                            <motion.button 
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleQuickWaterChange('decrement')}
                                                                disabled={(dailyLog?.water_intake_glasses || 0) <= 0}
                                                                className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-all border border-slate-200/50 dark:border-zinc-700/30 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                <Minus size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                            <div className="px-3.5 flex flex-col items-center justify-center select-none shrink-0 min-w-[70px]">
                                                                <span className="text-sm font-black text-[var(--color-text-main)] dark:text-white tabular-nums">{dailyLog?.water_intake_glasses || 0}</span>
                                                                <span className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">glasses</span>
                                                            </div>
                                                            <motion.button 
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleQuickWaterChange('increment')}
                                                                className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-all border border-slate-200/50 dark:border-zinc-700/30 shadow-sm"
                                                            >
                                                                <Plus size={16} strokeWidth={2.5} />
                                                            </motion.button>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0 select-none">
                                                            +1 glass = 250ml / 8.5oz
                                                        </span>
                                                    </div>

                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })()}

                                {suggestions.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                                            <Activity size={12} className="text-[var(--color-primary)]" />
                                            Clinical Insights
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {suggestions.map((s, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="bg-white dark:bg-white/5 p-5 rounded-3xl border-2 border-[var(--color-divider)] flex items-start gap-4 hover:border-[var(--color-primary)]/50 transition-all shadow-sm hover:translate-x-1"
                                                >
                                                    <div className="bg-[var(--color-primary)]/10 p-2.5 rounded-xl">
                                                        <CheckCircle2 size={16} className="text-[var(--color-primary)]" />
                                                    </div>
                                                    <p className="text-sm font-bold text-[var(--color-text-main)] leading-relaxed">{s}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="reviews"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex gap-2">
                                        {['all', 'reviewed', 'pending'].map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setFilterTab(tab)}
                                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${filterTab === tab
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg'
                                                    : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <Link to="/meal-history" className="text-[10px] font-black text-[var(--color-primary)] uppercase hover:underline flex items-center gap-1">
                                        History <ExternalLink size={10} />
                                    </Link>
                                </div>

                                <div className="space-y-4">
                                    {recentLogs.map(log => (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => setSelectedLog(log)}
                                            className="group cursor-pointer bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] overflow-hidden hover:border-[var(--color-primary)] transition-all shadow-sm hover:shadow-xl hover:translate-y-[-2px]"
                                        >
                                            <div className="flex flex-col sm:flex-row">
                                                <div className="w-full sm:w-32 h-48 sm:h-32 bg-zinc-100 flex-shrink-0 relative overflow-hidden">
                                                    <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    {(log.status === 'reviewed' || log.status === 'verified') && (
                                                        <div className="absolute top-3 left-3 bg-green-500 text-white p-1.5 rounded-full shadow-lg border border-white/20">
                                                            <CheckCircle2 size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col justify-center min-w-0">
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{new Date(log.logged_at).toLocaleDateString()} • {log.meal_category}</span>
                                                        <div className="flex gap-2">
                                                            {log.compliance_status === 'flagged' && (
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-red-100 text-red-700 flex items-center gap-1">
                                                                    <AlertCircle size={8} /> Flagged
                                                                </span>
                                                            )}
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                (log.status === 'reviewed' || log.status === 'verified') 
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' 
                                                                    : log.status === 'rejected'
                                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                            }`}>
                                                                {log.status === 'rejected' ? 'Correction Needed' : log.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-black text-[var(--color-text-main)] uppercase line-clamp-1 mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                                                        {log.nutritionist_review?.title || log.ai_analysis?.items?.map(i => i.name).join(', ') || 'Evaluating...'}
                                                    </h4>
                                                    {log.compliance_status === 'flagged' && log.violation_details?.violations?.length > 0 && (
                                                        <p className="text-[9px] font-black text-red-600 uppercase mb-1.5 flex items-center gap-1">
                                                            Reason: {log.violation_details.violations[0].rule || log.violation_details.violations[0].rule_name}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-[var(--color-text-muted)] italic line-clamp-2 leading-tight font-medium">
                                                        {(log.status === 'reviewed' || log.status === 'verified' || log.status === 'rejected') 
                                                            ? `"${log.nutritionist_review?.comment || 'Correction requested.'}"` 
                                                            : "Waiting for professional clinician review..."}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {recentLogs.length === 0 && (
                                        <div className="py-20 text-center bg-[var(--color-bg-page)] rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                                            <p className="text-[var(--color-text-muted)] font-black uppercase text-[10px] tracking-widest">No expert reviews yet</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {selectedLog && (
                <MealDetailModal
                    log={selectedLog}
                    rules={rules}
                    allergies={selectedProfile?.allergies || []}
                    onClose={() => setSelectedLog(null)}
                    onDelete={(deletedId) => {
                        setSelectedLog(null);
                        setAllLogs(prev => prev.filter(l => l.id !== deletedId));
                        setRecentLogs(prev => prev.filter(l => l.id !== deletedId));
                    }}
                />
            )}
            <Notification
                show={showWelcome}
                type="success"
                message={`Welcome, ${user?.full_name}! You can personalize your theme and clinical units in the Settings page.`}
                onClose={() => setShowWelcome(false)}
                duration={5000}
            />
        </div>
    );
}
