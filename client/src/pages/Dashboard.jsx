import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { ProgressBar } from '../components/common/ProgressBar';
import { Button } from '../components/common/Button';
import { Droplets, Flame, Utensils, AlertCircle, Edit2, Sparkles, X, BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { getNutriMetrics } from '../utils/nutrition';
import ReactMarkdown from 'react-markdown';

export default function Dashboard() {
    const { user } = useAuth();
    const { selectedProfile: profile, loading: profileLoading, refreshProfiles } = useProfile();
    const [todayMeals, setTodayMeals] = useState([]);
    const [consumed, setConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [progress, setProgress] = useState({ water_intake_glasses: 0 });
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit Goals State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // AI Water State
    const [aiWaterLoading, setAiWaterLoading] = useState(false);

    const [aiWaterAdvice, setAiWaterAdvice] = useState('');

    // AI Judge State
    const [aiJudgeLoading, setAiJudgeLoading] = useState(false);
    const [aiJudgeResult, setAiJudgeResult] = useState('');

    useEffect(() => {
        const fetchProfileAndData = async () => {
            if (!profile) {
                if (!profileLoading) setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const p = profile;
                
                // Calculate Metrics (Merge with custom targets)
                const calculated = getNutriMetrics(p);
                const mergedMetrics = {
                    calories: p.calories_target || calculated.calories,
                    protein: p.protein_target || calculated.protein,
                    carbs: p.carbs_target || calculated.carbs,
                    fat: p.fat_target || calculated.fat,
                    water: calculated.water
                };
                setMetrics(mergedMetrics);

                // Fetch Today's Progress
                const resProgress = await api.get(`/progress/today?profileId=${p.id}`);
                setProgress(resProgress.data);

                // Fetch Meals for Today
                const resPlans = await api.get(`/meals/plans?profileId=${p.id}`);
                if (resPlans.data) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${year}-${month}-${day}`;

                    const todays = resPlans.data.filter(meal => {
                        // Ensure we compare YYYY-MM-DD parts only
                        return meal.date.startsWith(todayStr);
                    });
                    setTodayMeals(todays);

                    // Calculate Consumed Nutrition
                    const total = todays.reduce((acc, meal) => {
                        return {
                            calories: acc.calories + (meal.calories || 0),
                            protein: acc.protein + (meal.protein_g || 0),
                            carbs: acc.carbs + (meal.carbs_g || 0),
                            fat: acc.fat + (meal.fats_g || 0)
                        };
                    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
                    setConsumed(total);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndData();
    }, [profile?.id, profileLoading]);

    const updateWater = async (action) => {
        try {
            // Optimistic update
            const oldVal = progress.water_intake_glasses;
            const newVal = action === 'increment' ? oldVal + 1 : Math.max(0, oldVal - 1);
            setProgress(prev => ({ ...prev, water_intake_glasses: newVal }));

            const res = await api.post('/progress/water', { action, profileId: profile.id });
            // Sync with server result just in case
            setProgress(res.data);
        } catch (err) {
            console.error("Failed to update water", err);
        }
    };

    const handleEditClick = () => {
        setEditForm({
            calories: metrics.calories,
            protein: metrics.protein,
            carbs: metrics.carbs,
            fat: metrics.fat
        });
        setIsEditing(true);
    };

    const handleSaveGoals = async () => {
        try {
            const updated = {
                ...profile,
                calories_target: parseInt(editForm.calories),
                protein_target: parseInt(editForm.protein),
                carbs_target: parseInt(editForm.carbs),
                fat_target: parseInt(editForm.fat)
            };

            // Optimistic Update
            setMetrics({ ...metrics, ...editForm });
            setIsEditing(false);

            await api.put(`/profiles/${profile.id}`, updated);
            await refreshProfiles();
        } catch (err) {
            console.error("Failed to update goals", err);
        }
    };

    const handleAskAIWater = async () => {
        setAiWaterLoading(true);
        try {
            const age = new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear();
            const prompt = `Identify the ideal daily water intake (in number of glasses) for a child with the following details: Age: ${age}, Gender: ${profile.gender}, Weight: ${profile.weight_kg}kg, Activity Level: ${profile.activity_level}. Return JUST the range of glasses and a very short explanation.`;

            const res = await api.post('/ai/gemini', { prompt });
            // Standardizing response structure from Gemini API
            const text = res.data.output;
            setAiWaterAdvice(text);
        } catch (err) {
            console.error("AI Error", err);
            setAiWaterAdvice("Sorry, I couldn't reach the nutrition brain right now.");
        } finally {
            setAiWaterLoading(false);
        }
    };

    const handleJudgeDay = async () => {
        if (todayMeals.length === 0) return;
        setAiJudgeLoading(true);
        try {
            const mealList = todayMeals.map(m => `${m.meal_type}: ${m.recipe_name} (${m.calories}kcal)`).join(', ');
            const prompt = `Act as a fun, encouraging nutritionist for kids. Analyze this daily meal plan: [${mealList}]. Give it a Grade (A, B, C...) and one specific, helpful tip to make it better. Keep it short and friendly.`;

            const res = await api.post('/ai/gemini', { prompt });
            setAiJudgeResult(res.data.output);
        } catch (err) {
            console.error(err);
        } finally {
            setAiJudgeLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading dashboard...</div>;
    }

    // Determine greeting name
    const displayName = profile?.child_name || user?.full_name?.split(' ')[0] || 'there';

    // If no profile exists, prompt to create one
    if (!profile && !loading) {
        return (
            <div className="text-center py-12 space-y-4">
                <h2 className="text-2xl font-bold text-[var(--color-secondary)]">Welcome to SmartNutri!</h2>
                <p className="text-[var(--color-text-muted)]">Please set up a child profile to get personalized recommendations.</p>
                <Link to="/onboarding" className="inline-block px-6 py-2 bg-[var(--color-primary)] text-white rounded-full font-medium">
                    Create Profile
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Hello, {displayName}! 👋</h1>
                        <p className="text-[var(--color-text-muted)] mt-1">Here is the daily nutrition overview.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleEditClick} className="gap-2">
                        <Edit2 size={16} /> Edit Goals
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-[var(--color-accent)]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--color-text-muted)] flex items-center gap-2">
                            <Flame size={16} className="text-[var(--color-accent)]" /> Calories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[var(--color-text-main)]">
                            {consumed.calories} <span className="text-sm font-normal text-gray-400">/ {metrics?.calories}</span>
                        </div>
                        <ProgressBar value={(consumed.calories / (metrics?.calories || 1)) * 100} className="mt-3" indicatorColor="bg-[var(--color-accent)]" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">Protein</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {consumed.protein}g <span className="text-sm font-normal text-gray-400">/ {metrics?.protein}g</span>
                        </div>
                        <ProgressBar 
                            value={(consumed.protein / (metrics?.protein || 1)) * 100} 
                            className="mt-3" 
                            indicatorColor="bg-blue-500" 
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">Carbs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {consumed.carbs}g <span className="text-sm font-normal text-gray-400">/ {metrics?.carbs}g</span>
                        </div>
                        <ProgressBar 
                            value={(consumed.carbs / (metrics?.carbs || 1)) * 100} 
                            className="mt-3" 
                            indicatorColor="bg-green-500" 
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">Fat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {consumed.fat}g <span className="text-sm font-normal text-gray-400">/ {metrics?.fat}g</span>
                        </div>
                        <ProgressBar 
                            value={(consumed.fat / (metrics?.fat || 1)) * 100} 
                            className="mt-3" 
                            indicatorColor="bg-yellow-500" 
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Today's Plan */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Utensils size={18} /> Today's Meals
                        </CardTitle>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-xs"
                            onClick={handleJudgeDay}
                            disabled={todayMeals.length === 0 || aiJudgeLoading}
                        >
                            <BrainCircuit size={14} className="mr-1" />
                            {aiJudgeLoading ? "Judging..." : "Judge My Day"}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {todayMeals.length > 0 ? (
                            todayMeals.map((meal, i) => (
                                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] p-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[var(--color-text-main)]">{meal.meal_type}: {meal.recipe_name}</span>
                                        <span className="text-xs text-[var(--color-text-muted)]">{meal.calories} kcal</span>
                                    </div>
                                    <input type="checkbox" className="h-5 w-5 rounded-md border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer" />
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-[var(--color-text-muted)] py-4">
                                No meals planned for today. <Link to="/calendar" className="text-[var(--color-primary)] hover:underline">Generate a plan!</Link>
                            </div>
                        )}


                        {/* AI Judge Result */}
                        {aiJudgeResult && (
                            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-900/40">
                                <h4 className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300 mb-2">
                                    <Sparkles size={16} /> The Verdict
                                </h4>
                                <div className="text-sm text-[var(--color-text-main)] [&>p]:mb-2 last:[&>p]:mb-0">
                                    <ReactMarkdown>{aiJudgeResult}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Water & Tips */}
                <div className="space-y-6">
                    <Card className="bg-[var(--color-primary)]/10 border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-[var(--color-primary)]">
                                <Droplets size={18} /> Water Intake
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-[var(--color-primary-hover)]">
                                    {progress.water_intake_glasses} <span className="text-lg text-gray-500">/ 8</span>
                                </div>
                                <p className="text-sm text-[var(--color-text-muted)] mb-4">glasses</p>
                                <div className="flex justify-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50"
                                        onClick={() => updateWater('decrement')}
                                        disabled={progress.water_intake_glasses <= 0}
                                    >
                                        -
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 font-bold text-[var(--color-primary)]"
                                        onClick={() => updateWater('increment')}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            {/* AI Section */}
                            <div className="mt-6 pt-4 border-t border-[var(--color-divider)]">
                                <h4 className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1 mb-2">
                                    <Sparkles size={12} /> SMARTNUTRI AI ADVICE
                                </h4>
                                {aiWaterAdvice ? (
                                    <p className="text-sm text-[var(--color-text-main)] italic">"{aiWaterAdvice}"</p>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs bg-white text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                                        onClick={handleAskAIWater}
                                        disabled={aiWaterLoading}
                                    >
                                        {aiWaterLoading ? 'Thinking...' : 'Ask AI for Recommendation'}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {
                        profile?.allergies && profile.allergies.length > 0 && !profile.allergies.includes("None") && (
                            <Card className="border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30">
                                <CardHeader>
                                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <AlertCircle size={18} /> Allergies Alert
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.allergies.map(a => (
                                            <span key={a} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium dark:bg-red-900/40 dark:text-red-300">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }

                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Tip</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                based on {profile?.activity_level} activity: Ensure sufficient hydration after sports!
                            </p>
                        </CardContent>
                    </Card>
                </div >
            </div >

            {/* Edit Goals Modal */}
            {
                isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <Card className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-xl">Set Nutrition Goals</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                                    <X size={20} />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Daily Calories (kcal)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-lg dark:bg-black/20"
                                        value={editForm.calories}
                                        onChange={e => setEditForm({ ...editForm, calories: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Protein (g)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded-lg dark:bg-black/20"
                                            value={editForm.protein}
                                            onChange={e => setEditForm({ ...editForm, protein: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Carbs (g)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded-lg dark:bg-black/20"
                                            value={editForm.carbs}
                                            onChange={e => setEditForm({ ...editForm, carbs: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fat (g)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 border rounded-lg dark:bg-black/20"
                                            value={editForm.fat}
                                            onChange={e => setEditForm({ ...editForm, fat: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button className="w-full mt-4 bg-[var(--color-primary)] text-white" onClick={handleSaveGoals}>
                                    Save Goals
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

        </div >
    );
}
