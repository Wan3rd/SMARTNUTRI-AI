import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MealLogger from '../components/MealLogger';
import MealDetailModal from '../components/MealDetailModal';
import { Card, CardContent } from '../components/common/Card';
import { Calendar, CheckCircle2, AlertCircle, Clock, ExternalLink, Activity, Info, Star, Trash2, MessageSquare, BadgeCheck, User, Building2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLoading } from '../context/LoadingContext';
import { cn, formatValue, convertHeight, convertWeight } from '../lib/utils';
import api from '../lib/api';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { DashboardSkeleton } from '../components/SkeletonShell';

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
    const [isInitialSync, setIsInitialSync] = useState(true);

    useEffect(() => {
        fetchAssignedNutritionist();
    }, []);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (selectedProfile) {
                startLoading('Syncing Child Profile...');
                await Promise.all([fetchLogs(), fetchRules()]);
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
            if (filterTab === 'pending') filtered = res.data.filter(log => log.status === 'pending');
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
            console.error("Error fetching nutritionist", err);
        }
    };

    // Calculate Today's Intake vs Goals
    const todayLogs = allLogs.filter(log => new Date(log.logged_at).toDateString() === new Date().toDateString());

    let todayIntake = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 };
    todayLogs.forEach(log => {
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

    const getGoalForCategory = (category) => {
        const rule = rules.find(r => r.category?.toLowerCase() === category.toLowerCase() && r.rule_type?.toLowerCase() === 'max');
        return rule ? parseFloat(rule.rule_value) : null;
    };

    const latestMeal = recentLogs[0];
    const suggestions = latestMeal?.violation_details?.suggestions || [];

    const renderProgressBar = (label, current, goal, unit) => {
        if (!goal) return null;
        const percentage = Math.min((current / goal) * 100, 100);
        const isOver = current > goal;

        return (
            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-[var(--color-secondary)]">{label}</span>
                    <span className={cn("font-bold", isOver ? 'text-red-500' : 'text-[var(--color-primary)]')}>
                        {formatValue(current, user?.nutrient_precision)} / {formatValue(goal, user?.nutrient_precision)} {unit}
                    </span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
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
                                    {renderProgressBar('Calories', todayIntake.calories, getGoalForCategory('calories'), 'kcal')}
                                    {renderProgressBar('Protein', todayIntake.protein, getGoalForCategory('protein'), 'g')}
                                    {renderProgressBar('Sodium', todayIntake.sodium, getGoalForCategory('sodium'), 'mg')}
                                    {renderProgressBar('Sugar', todayIntake.sugar, getGoalForCategory('sugar'), 'g')}
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
                            <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                                <div className="relative flex-shrink-0">
                                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-[var(--color-divider)] overflow-hidden bg-[var(--color-bg-page)] flex items-center justify-center shadow-inner relative z-10">
                                        {assignedNutritionist?.profile_image_url ? (
                                            <img src={assignedNutritionist.profile_image_url} alt="Nutri" className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                        ) : (
                                            <User size={28} className="text-gray-300" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-emerald-500 rounded-lg border-2 border-[var(--color-bg-card)] flex items-center justify-center z-20 shadow-md">
                                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1">Clinician</p>
                                    <h4 className={cn("text-base sm:text-lg lg:text-xl font-black text-[var(--color-text-main)] truncate uppercase leading-none", user?.privacy_mode && "privacy-blur")}>
                                        {assignedNutritionist?.full_name || 'Dr. Expert'}
                                    </h4>
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight mt-1 opacity-80">
                                        {assignedNutritionist?.specialization || 'Clinical Nutritionist'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="px-5 pb-5 space-y-2.5">
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center gap-3 p-2.5 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <BadgeCheck size={14} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-none mb-1 opacity-70">License</p>
                                            <p className="text-xs font-black text-[var(--color-text-main)] uppercase truncate">
                                                {assignedNutritionist?.license_no || 'Pending Verification'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-2.5 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
                                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Phone size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-none mb-1 opacity-70">Contact</p>
                                            <p className="text-xs font-black text-[var(--color-text-main)] uppercase truncate">
                                                {assignedNutritionist?.phone || 'No contact set'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tab Switcher */}
                    <div className="flex p-1.5 bg-[var(--color-divider)] dark:bg-white/5 rounded-[22px] border border-[var(--color-divider)] shadow-inner">
                        {[
                            { id: 'status', label: 'Daily Status', icon: <Activity size={14} /> },
                            { id: 'reviews', label: 'Expert Reviews', icon: <MessageSquare size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-lg shadow-emerald-500/10 border-b-2 border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-card)]/50'}`}
                            >
                                <span className={cn(activeTab === tab.id ? 'text-[var(--color-primary)]' : 'opacity-60', "shrink-0")}>
                                    {tab.icon}
                                </span>
                                <span className="truncate">{tab.label}</span>
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
                                    <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-blue-500/5 border-2 border-[var(--color-primary)]/20 relative overflow-hidden rounded-3xl shadow-lg">
                                        <CardContent className="p-6 sm:p-8 relative z-10">
                                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-6 text-center sm:text-left">
                                                <div>
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Compliance Score</p>
                                                    <div className="flex items-center gap-4 justify-center sm:justify-start">
                                                        <span className="text-5xl sm:text-6xl font-black text-[var(--color-secondary)]">{latestMeal?.compliance_score || 100}</span>
                                                        <div>
                                                            <p className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase">{latestMeal?.compliance_score >= 80 ? 'Optimal!' : 'Review Required'}</p>
                                                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold">Latest clinical rating</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white/50 dark:bg-black/20 p-4 sm:p-5 rounded-2xl border-2 border-white/50 shadow-inner">
                                                    <Star size={24} className="text-yellow-500 sm:w-8 sm:h-8 animate-bounce" fill="currentColor" />
                                                </div>
                                            </div>
                                            <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden border border-black/5 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${latestMeal?.compliance_score || 100}%` }}
                                                    className="h-full bg-gradient-to-r from-green-400 to-[var(--color-primary)] shadow-sm"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

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
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${(log.status === 'reviewed' || log.status === 'verified') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
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
                                                        {(log.status === 'reviewed' || log.status === 'verified') ? `"${log.nutritionist_review?.comment}"` : "Waiting for professional clinician review..."}
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
                    onClose={() => setSelectedLog(null)}
                    onDelete={(deletedId) => {
                        setSelectedLog(null);
                        setAllLogs(prev => prev.filter(l => l.id !== deletedId));
                        setRecentLogs(prev => prev.filter(l => l.id !== deletedId));
                    }}
                />
            )}
        </div>
    );
}
