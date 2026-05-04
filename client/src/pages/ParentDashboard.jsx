import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MealLogger from '../components/MealLogger';
import MealDetailModal from '../components/MealDetailModal';
import { Card, CardContent } from '../components/common/Card';
import { Calendar, CheckCircle2, AlertCircle, Clock, ExternalLink, Activity, Info, Star, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function ParentDashboard() {
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [allLogs, setAllLogs] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filterTab, setFilterTab] = useState('all');
    const [activeTab, setActiveTab] = useState('status'); // 'status' or 'reviews'

    useEffect(() => {
        fetchProfiles();
    }, []);

    useEffect(() => {
        if (selectedProfile) {
            fetchLogs();
            fetchRules();
        }
    }, [selectedProfile, filterTab]);

    const fetchProfiles = async () => {
        try {
            const res = await api.get('/profiles');
            setProfiles(res.data);
            if (res.data.length > 0) setSelectedProfile(res.data[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/logs/profile/${selectedProfile.id}`);
            setAllLogs(res.data);

            let filtered = res.data;
            if (filterTab === 'pending') filtered = res.data.filter(log => log.status === 'pending');
            else if (filterTab === 'reviewed') filtered = res.data.filter(log => log.status === 'reviewed');
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
                    <span className={`font-bold ${isOver ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>
                        {Math.round(current)} / {goal} {unit}
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

    if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)] font-medium">Loading SmartNutri...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Child Dashboard</h1>
                <p className="text-[var(--color-text-muted)] font-medium">Track growth, view daily compliance, and expert evaluations.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Logger & Profile Selector */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-sm">
                        <CardContent className="p-6">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] block mb-4">Switch Active Profile</label>
                            <div className="flex flex-wrap gap-3">
                                {profiles.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProfile(p)}
                                        className={`px-6 py-2.5 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${selectedProfile?.id === p.id
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/30'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)] hover:translate-y-[-2px]'}`}
                                    >
                                        {p.child_name}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reward Progress */}
                    {selectedProfile && (
                        <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 border-none shadow-xl rounded-3xl overflow-hidden relative group">
                            <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                <Star size={120} fill="white" />
                            </div>
                            <CardContent className="p-8 flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-yellow-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Kid Reward Center</p>
                                    <h3 className="text-white text-2xl font-black italic">
                                        {todayLogs.filter(l => l.compliance_status !== 'flagged').length} STARS EARNED TODAY! 🌟
                                    </h3>
                                    <p className="text-yellow-100/80 text-xs mt-2 font-bold uppercase tracking-tight">Feed {selectedProfile.child_name} healthy meals to reach the goal!</p>
                                </div>
                                <div className="flex gap-2 bg-black/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={20} className={i < todayLogs.filter(l => l.compliance_status !== 'flagged').length ? "text-yellow-200 drop-shadow-lg animate-pulse" : "text-white/20"} fill={i < todayLogs.filter(l => l.compliance_status !== 'flagged').length ? "currentColor" : "none"} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {selectedProfile && (
                        <MealLogger profileId={selectedProfile.id} onLogged={fetchLogs} recentLogs={recentLogs} />
                    )}

                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-sm">
                        <CardContent className="p-8">
                            <h3 className="text-sm font-black text-[var(--color-secondary)] mb-6 flex items-center gap-3 uppercase tracking-widest">
                                <Activity size={18} className="text-[var(--color-primary)]" />
                                Daily Nutritional Goal
                            </h3>
                            {rules.length > 0 ? (
                                <div className="space-y-4">
                                    {renderProgressBar('Calories', todayIntake.calories, getGoalForCategory('calories'), 'kcal')}
                                    {renderProgressBar('Protein', todayIntake.protein, getGoalForCategory('protein'), 'g')}
                                    {renderProgressBar('Sodium', todayIntake.sodium, getGoalForCategory('sodium'), 'mg')}
                                    {renderProgressBar('Sugar', todayIntake.sugar, getGoalForCategory('sugar'), 'g')}
                                </div>
                            ) : (
                                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-[var(--color-divider)] text-center">
                                    <p className="text-xs text-[var(--color-text-muted)] font-black uppercase">No clinical targets set</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Insights & Expert Feedback */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl border-2 border-[var(--color-divider)]">
                        {[
                            { id: 'status', label: 'Daily Status', icon: <Activity size={14} /> },
                            { id: 'reviews', label: 'Expert Reviews', icon: <MessageSquare size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-white dark:bg-zinc-800 text-[var(--color-primary)] shadow-md border-b-2 border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                            >
                                {tab.icon} {tab.label}
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
                                        <CardContent className="p-8 relative z-10">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Compliance Score</p>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-6xl font-black text-[var(--color-secondary)]">{latestMeal?.compliance_score || 100}</span>
                                                        <div>
                                                            <p className="text-sm font-black text-[var(--color-text-main)] uppercase">{latestMeal?.compliance_score >= 80 ? 'Optimal!' : 'Review Required'}</p>
                                                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold">Latest clinical rating</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white/50 dark:bg-black/20 p-5 rounded-2xl border-2 border-white/50 shadow-inner">
                                                    <Star size={32} className="text-yellow-500 animate-bounce" fill="currentColor" />
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
                                            <div className="flex">
                                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-100 flex-shrink-0 relative overflow-hidden">
                                                    <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    {log.status === 'reviewed' && (
                                                        <div className="absolute top-2 left-2 bg-green-500 text-white p-1 rounded-full shadow-lg border border-white/20">
                                                            <CheckCircle2 size={10} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col justify-center min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{new Date(log.logged_at).toLocaleDateString()} • {log.meal_category}</span>
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${log.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-[var(--color-text-main)] uppercase line-clamp-2 mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                                                        {log.nutritionist_review?.title || log.ai_analysis?.items?.map(i => i.name).join(', ') || 'Evaluating...'}
                                                    </h4>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] italic line-clamp-2 leading-tight font-medium">
                                                        {log.status === 'reviewed' ? `"${log.nutritionist_review?.comment}"` : "Waiting for professional clinician review..."}
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
