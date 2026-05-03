import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MealLogger from '../components/MealLogger';
import MealDetailModal from '../components/MealDetailModal';
import { Card, CardContent } from '../components/common/Card';
import { Calendar, CheckCircle2, AlertCircle, Clock, ExternalLink, Activity, Info, Star, Trash2 } from 'lucide-react';
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
                <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Child's Nutrition Dashboard</h1>
                <p className="text-[var(--color-text-muted)]">Track meals, view daily compliance, and receive Expert AI advice.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Logger & Profile Selector */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border border-[var(--color-divider)]">
                        <CardContent className="p-4">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest block mb-2">Switch Profile</label>
                            <div className="flex flex-wrap gap-2">
                                {profiles.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProfile(p)}
                                        className={`px-4 py-2 rounded-xl border transition-all text-sm font-bold ${selectedProfile?.id === p.id
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'}`}
                                    >
                                        {p.child_name}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gamification Banner */}
                    {selectedProfile && (
                        <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 border-none shadow-lg transform hover:scale-[1.01] transition-transform overflow-hidden relative">
                            <div className="absolute -right-4 -top-4 opacity-20">
                                <Star size={100} fill="white" />
                            </div>
                            <CardContent className="p-4 flex items-center justify-between relative z-10">
                                <div>
                                    <p className="text-yellow-100 text-[10px] font-black uppercase tracking-widest mb-1">Kid's Reward Center</p>
                                    <h3 className="text-white text-xl font-black">
                                        {todayLogs.filter(l => l.compliance_status !== 'flagged').length} Smart Stars Today! 🌟
                                    </h3>
                                    <p className="text-yellow-100 text-xs mt-1 font-medium">Keep eating healthy meals to earn more stars!</p>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(Math.max(3, todayLogs.filter(l => l.compliance_status !== 'flagged').length))].map((_, i) => (
                                        <Star key={i} size={24} className={i < todayLogs.filter(l => l.compliance_status !== 'flagged').length ? "text-white drop-shadow-md" : "text-white/30"} fill={i < todayLogs.filter(l => l.compliance_status !== 'flagged').length ? "currentColor" : "none"} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {selectedProfile && (
                        <MealLogger profileId={selectedProfile.id} onLogged={fetchLogs} recentLogs={recentLogs} />
                    )}

                    {/* Today's Intake Progress Bars */}
                    <Card className="border border-[var(--color-divider)]">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-[var(--color-primary)]" />
                                Today's Target Intake
                            </h3>
                            {rules.length > 0 ? (
                                <div>
                                    {renderProgressBar('Calories', todayIntake.calories, getGoalForCategory('calories'), 'kcal')}
                                    {renderProgressBar('Protein', todayIntake.protein, getGoalForCategory('protein'), 'g')}
                                    {renderProgressBar('Sodium', todayIntake.sodium, getGoalForCategory('sodium'), 'mg')}
                                    {renderProgressBar('Sugar', todayIntake.sugar, getGoalForCategory('sugar'), 'g')}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--color-text-muted)] italic">No daily targets set by nutritionist yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* System Feedback & Adaptive Suggestions */}
                    {suggestions.length > 0 && (
                        <Card className="border-2 border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <h3 className="text-sm font-bold text-[var(--color-secondary)] flex items-center gap-2 uppercase tracking-wider">
                                    <Activity size={16} className="text-[var(--color-primary)]" />
                                    Smart Next Meal Tips
                                </h3>
                                <div className="space-y-2">
                                    {suggestions.map((s, i) => (
                                        <div key={i} className="flex gap-3 bg-white dark:bg-black/20 p-3 rounded-xl border border-[var(--color-primary)]/10 shadow-sm">
                                            <div className="bg-[var(--color-primary)]/10 p-1.5 rounded-lg h-fit">
                                                <CheckCircle2 size={14} className="text-[var(--color-primary)]" />
                                            </div>
                                            <p className="text-xs text-[var(--color-secondary)] font-medium leading-relaxed">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Recent Feedback & Status */}
                <div className="lg:col-span-7 space-y-6">
                    {allLogs.length > 0 && (
                        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 border-green-100 dark:border-green-900/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Activity size={100} />
                            </div>
                            <CardContent className="p-4 relative z-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Daily Compliance Score</p>
                                            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm border border-yellow-200">
                                                ⭐ Expert Evaluated
                                            </span>
                                        </div>
                                        <div className="flex items-end gap-3">
                                            <p className={`text-4xl font-black ${latestMeal?.compliance_score >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                                                {latestMeal?.compliance_score || 100}
                                            </p>
                                            <div className="mb-1">
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">Health Status</p>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                    {latestMeal?.compliance_score >= 80 ? 'Excellent Balance!' : 'Adjustment Needed'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-[var(--color-text-muted)] font-medium">
                                            {allLogs.filter(l => l.compliance_status === 'compliant').length} / {allLogs.length} meals compliant
                                        </p>
                                        <Link to="/meal-history" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 justify-end mt-1 font-bold">
                                            View Full History <ExternalLink size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                                <Clock size={20} className="text-[var(--color-primary)]" />
                                Recent Meal Feedback
                            </h2>
                            <Link to="/meal-history" className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                View All <ExternalLink size={14} />
                            </Link>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {[
                                { key: 'all', label: 'All', count: allLogs.length },
                                { key: 'pending', label: 'Pending', count: allLogs.filter(l => l.status === 'pending').length },
                                { key: 'reviewed', label: 'Reviewed', count: allLogs.filter(l => l.status === 'reviewed').length },
                                { key: 'flagged', label: 'Flagged', count: allLogs.filter(l => l.compliance_status === 'flagged').length }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilterTab(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === tab.key
                                        ? 'bg-[var(--color-primary)] text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {recentLogs.map(log => (
                                <Card key={log.id} onClick={() => setSelectedLog(log)} className="border border-[var(--color-divider)] hover:border-[var(--color-primary)]/40 transition-all overflow-hidden cursor-pointer">
                                    <CardContent className="p-0 flex flex-col md:flex-row min-h-32">
                                        <div className="w-full md:w-32 h-40 md:h-auto bg-gray-100 flex-shrink-0 relative">
                                            <img src={log.image_url} alt="Meal" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-tight">
                                                        {new Date(log.logged_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                                    </p>
                                                    <h3 className="font-bold text-[var(--color-secondary)] line-clamp-1">
                                                        {log.nutritionist_review?.title || log.ai_analysis?.items?.map(i => i.name).join(', ') || 'Pending detection...'}
                                                    </h3>
                                                </div>
                                                <div className={`flex flex-col items-end gap-1`}>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if(window.confirm("Are you sure you want to delete this meal log?")) {
                                                                    api.delete(`/logs/${log.id}`).then(() => {
                                                                        setAllLogs(prev => prev.filter(l => l.id !== log.id));
                                                                        setRecentLogs(prev => prev.filter(l => l.id !== log.id));
                                                                    });
                                                                }
                                                            }}
                                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                            title="Delete meal"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            <CheckCircle2 size={12} /> {log.status}
                                                        </div>
                                                    </div>
                                                    {log.compliance_status === 'flagged' && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                                            <AlertCircle size={12} /> Exceeds Limit
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* XAI Feedback Section */}
                                            {log.compliance_status === 'flagged' && typeof log.violation_details === 'object' && log.violation_details?.xai_feedback && (
                                                <div className="mt-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30 flex items-start gap-2">
                                                    <Info size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-[11px] text-red-800 dark:text-red-400 font-medium leading-relaxed">
                                                        {log.violation_details.xai_feedback}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-end mt-3">
                                                <p className="text-xs text-[var(--color-text-muted)] italic line-clamp-1 flex-1 pr-4">
                                                    {log.status === 'reviewed' ? `Nutritionist: "${log.nutritionist_review?.comment}"` : "Waiting for nutritionist's advice..."}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {recentLogs.length === 0 && (
                                <div className="py-20 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-[var(--color-divider)]">
                                    <p className="text-[var(--color-text-muted)] font-medium">No meals logged yet today.</p>
                                    <p className="text-xs mt-1">Upload a photo to get professional feedback.</p>
                                </div>
                            )}
                        </div>
                    </section>
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
                        // Re-fetch progress bars by updating state
                    }}
                />
            )}
        </div>
    );
}
