import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Info, CheckCircle2, Circle, ChevronDown, ChevronUp, Utensils, Flame, Leaf, Wheat, Droplets, Apple, Beef } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../context/ProfileContext';
import { useLoading } from '../context/LoadingContext';
import { DailyPlanSkeleton } from '../components/SkeletonShell';
import api from '../lib/api';


// Static Food Exchange Dictionary
const FEL_DICTIONARY = {
    Vegetables: {
        icon: <Leaf className="text-emerald-500" size={16} />,
        definition: "1 Serving = 1/2 cup cooked OR 1 cup raw",
        examples: ["1/2 cup cooked spinach", "1 cup raw lettuce", "1/2 cup boiled carrots", "1 cup cucumber slices"]
    },
    Fruit: {
        icon: <Apple className="text-red-500" size={16} />,
        definition: "1 Serving = 1 PC or 1 SLICE (40-60 GRAMS)",
        examples: ["1 medium apple", "1 slice papaya (40g)", "1 small banana", "10 grapes"]
    },
    Milk: {
        icon: <Droplets className="text-blue-500" size={16} />,
        definition: "1 Serving = 1 cup or 250 mL",
        examples: ["1 cup low-fat milk", "1 cup soy milk", "1/2 cup evaporated milk"]
    },
    Rice: {
        icon: <Wheat className="text-amber-500" size={16} />,
        definition: "1 Serving = 1/2 cup cooked rice",
        examples: ["1/2 cup white/brown rice", "1 slice bread", "1/2 cup corn", "1 small potato"]
    },
    Meat: {
        icon: <Beef className="text-rose-500" size={16} />,
        definition: "1 Serving = 30-40 grams",
        examples: ["1 matchbox-size chicken/pork", "1 egg", "1 slice cheese", "1/4 cup tofu"]
    },
    Fat: {
        icon: <Flame className="text-yellow-500" size={16} />,
        definition: "1 Serving = 1 tsp",
        examples: ["1 tsp cooking oil", "1 tsp butter", "1 tsp mayonnaise", "5 pcs peanuts"]
    }
};

const isSnackMatch = (mealPlanType, checklistMealName) => {
    if (!mealPlanType || !checklistMealName) return false;
    const pt = mealPlanType.toLowerCase();
    const ct = checklistMealName.toLowerCase();
    if (pt === 'snack' && (ct === 'am snack' || ct === 'pm snack')) {
        return true;
    }
    return pt === ct;
};

export default function DailyPlan() {
    const { selectedProfile, loading: profileLoading } = useProfile();
    const { startLoading, stopLoading } = useLoading();
    const [plan, setPlan] = useState([]);
    const [sugarLimit, setSugarLimit] = useState('');
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [expandedMeal, setExpandedMeal] = useState("Breakfast");
    const [activeSwap, setActiveSwap] = useState(null);
    const [scheduledMeals, setScheduledMeals] = useState([]);

    useEffect(() => {
        const fetchPlan = async () => {
            if (!selectedProfile) {
                if (!profileLoading) setIsInitialSync(false);
                return;
            }
            try {
                const currentDate = format(new Date(), 'yyyy-MM-dd');

                // Fetch matrix, adherence, and scheduled meal plans in parallel
                const [matrixRes, adherenceRes, plansRes] = await Promise.all([
                    api.get(`/nutritionist/portion-plan/${selectedProfile.id}`),
                    api.get(`/nutritionist/adherence/${selectedProfile.id}?date=${currentDate}`),
                    api.get('/meals/plans', { params: { profileId: selectedProfile.id } })
                ]);

                const matrix = matrixRes.data;
                const adherenceLogs = adherenceRes.data || [];
                const allPlans = plansRes.data || [];

                // Filter scheduled meals for today's local date
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const todaysScheduled = allPlans.filter(p => {
                    const planDateStr = format(new Date(p.date), 'yyyy-MM-dd');
                    return planDateStr === todayStr;
                });
                setScheduledMeals(todaysScheduled);

                const times = {
                    'Breakfast': '8:00 AM',
                    'AM Snack': '10:30 AM',
                    'Lunch': '1:00 PM',
                    'PM Snack': '3:30 PM',
                    'Dinner': '6:30 PM'
                };

                const defaultMatrix = [
                    { meal_type: 'Breakfast', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
                    { meal_type: 'AM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
                    { meal_type: 'Lunch', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
                    { meal_type: 'PM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
                    { meal_type: 'Dinner', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
                ];

                let combinedMatrix = defaultMatrix;
                if (matrix && matrix.length > 0) {
                    combinedMatrix = defaultMatrix.map(row => {
                        const savedRow = matrix.find(r => r.meal_type === row.meal_type);
                        return savedRow ? { ...row, ...savedRow } : row;
                    });
                }

                // Extract sugar limit from Breakfast row where it is typically stored
                const overallSugarLimit = combinedMatrix.find(r => r.meal_type === 'Breakfast')?.sugar || '';
                setSugarLimit(overallSugarLimit);

                const parsedPlan = combinedMatrix.map(mealRow => {
                    const items = [];
                    ['vegetables', 'fruit', 'milk', 'rice', 'meat', 'fat'].forEach(key => {
                        if (mealRow[key]) {
                            const categoryName = key.charAt(0).toUpperCase() + key.slice(1);
                            // Check if this specific item was completed today
                            const isCompleted = adherenceLogs.some(log =>
                                log.meal_type === mealRow.meal_type &&
                                log.category.toLowerCase() === key &&
                                log.completed
                            );
                            items.push({
                                category: categoryName,
                                amount: mealRow[key],
                                completed: isCompleted
                            });
                        }
                    });

                    return {
                        meal: mealRow.meal_type,
                        time: times[mealRow.meal_type] || '',
                        items
                    };
                }).filter(meal => meal.items.length > 0);

                setPlan(parsedPlan);
                if (parsedPlan.length > 0) {
                    setExpandedMeal(parsedPlan[0].meal);
                }
            } catch (err) {
                console.error("Failed to fetch portion plan", err);
            } finally {
                setIsInitialSync(false);
            }
        };
        fetchPlan();
    }, [selectedProfile?.id, profileLoading]);

    const toggleItem = async (mealIndex, itemIndex) => {
        const newPlan = [...plan];
        const item = newPlan[mealIndex].items[itemIndex];
        const newCompletedStatus = !item.completed;

        // Optimistic UI update
        item.completed = newCompletedStatus;
        setPlan(newPlan);

        // Sync to server
        try {
            const currentDate = format(new Date(), 'yyyy-MM-dd');
            await api.post(`/nutritionist/adherence/${selectedProfile.id}`, {
                date: currentDate,
                meal_type: newPlan[mealIndex].meal,
                category: item.category.toLowerCase(),
                completed: newCompletedStatus
            });
        } catch (err) {
            console.error("Failed to sync adherence", err);
            // Revert on failure
            const revertedPlan = [...plan];
            revertedPlan[mealIndex].items[itemIndex].completed = !newCompletedStatus;
            setPlan(revertedPlan);
        }
    };

    const toggleScheduledMeal = async (mealId) => {
        // Optimistic UI update
        setScheduledMeals(prev => prev.map(m => m.id === mealId ? { ...m, is_consumed: !m.is_consumed } : m));

        try {
            await api.patch(`/meals/plans/${mealId}/toggle`);
        } catch (err) {
            console.error("Failed to toggle scheduled meal consumption", err);
            // Revert on failure
            setScheduledMeals(prev => prev.map(m => m.id === mealId ? { ...m, is_consumed: !m.is_consumed } : m));
        }
    };


    const calculateProgress = () => {
        const totals = {
            Vegetables: { target: 0, current: 0 },
            Fruit: { target: 0, current: 0 },
            Milk: { target: 0, current: 0 },
            Rice: { target: 0, current: 0 },
            Meat: { target: 0, current: 0 },
            Fat: { target: 0, current: 0 }
        };

        plan.forEach(meal => {
            meal.items.forEach(item => {
                if (totals[item.category]) {
                    totals[item.category].target += 1;
                    if (item.completed) {
                        totals[item.category].current += 1;
                    }
                }
            });
        });

        return totals;
    };

    const progress = calculateProgress();

    if (isInitialSync) return <DailyPlanSkeleton />;

    if (!selectedProfile) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-center pt-20">
                <h2 className="text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Welcome to Daily Plan</h2>
                <p className="text-[var(--color-text-muted)] font-medium">Please set up a child profile to receive a clinical meal plan.</p>
            </div>
        );
    }

    if (plan.length === 0 && !sugarLimit) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-center pt-20">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 text-emerald-500 rounded-full mb-4 shadow-sm">
                    <Utensils size={32} />
                </div>
                <h2 className="text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">No Plan Configured</h2>
                <p className="text-[var(--color-text-muted)] font-medium max-w-md mx-auto">
                    The nutritionist has not yet configured a portion plan for {selectedProfile.child_name}.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Daily Meal Plan</h1>
                <p className="text-[var(--color-text-muted)] mt-1 font-medium">Follow the prescribed food exchange list for {selectedProfile.child_name}. Tap any item to see swap options.</p>

                {sugarLimit && (
                    <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 p-3 rounded-xl">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Nutritionist Clinical Note</p>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                            {sugarLimit}
                        </span>
                    </div>
                )}
            </header>

            {/* Daily Progress Rings */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
                {Object.entries(progress).filter(([_, data]) => data.target > 0).map(([category, data]) => {
                    const dict = FEL_DICTIONARY[category];
                    if (!dict) return null;
                    const percentage = Math.min(100, (data.current / data.target) * 100);
                    return (
                        <div key={category} className="bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                {dict.icon}
                            </div>
                            <div className="w-full bg-[var(--color-divider)] h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{category}</span>
                                <span className="text-[8px] font-bold text-gray-400">{data.current}/{data.target}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Meals Checklist */}
            <div className="space-y-4">
                {plan.map((meal, mealIdx) => {
                    const isExpanded = expandedMeal === meal.meal;
                    const allCompleted = meal.items.every(i => i.completed);

                    return (
                        <Card key={meal.meal} className={cn(
                            "border-2 transition-all duration-300 rounded-[2rem] overflow-hidden",
                            allCompleted ? "border-emerald-500/30 bg-emerald-50/10" : isExpanded ? "border-[var(--color-primary)] shadow-lg" : "border-[var(--color-divider)]"
                        )}>
                            <CardHeader
                                className={cn("p-4 sm:p-6 cursor-pointer hover:bg-[var(--color-bg-page)] transition-colors flex flex-row items-center justify-between", isExpanded && "bg-[var(--color-bg-page)] border-b-2 border-[var(--color-divider)]")}
                                onClick={() => setExpandedMeal(isExpanded ? null : meal.meal)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm",
                                        allCompleted ? "bg-emerald-100 text-emerald-600" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                    )}>
                                        {allCompleted ? <CheckCircle2 size={24} /> : <Utensils size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tight">{meal.meal}</h3>
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{meal.time}</p>
                                    </div>
                                </div>
                                <div>
                                    {isExpanded ? <ChevronUp className="text-[var(--color-text-muted)]" /> : <ChevronDown className="text-[var(--color-text-muted)]" />}
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent className="p-0">
                                    {scheduledMeals.find(sm => isSnackMatch(sm.meal_type, meal.meal)) && (
                                        (() => {
                                            const sm = scheduledMeals.find(sm => isSnackMatch(sm.meal_type, meal.meal));
                                            const isRealRecipe = sm.recipe_id && !sm.recipe_id.startsWith('ai-gen-') && !sm.recipe_id.startsWith('manual-');
                                            return (
                                                <div className="p-4 sm:p-6 bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-secondary)]/5 border-b-2 border-[var(--color-divider)]">
                                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                                        <div className="flex gap-4 items-center flex-1 min-w-0">
                                                            {sm.image_url ? (
                                                                <img src={sm.image_url} alt={sm.recipe_name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-sm border border-[var(--color-divider)] flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center border border-[var(--color-divider)] flex-shrink-0">
                                                                    <Utensils size={28} />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-[0.2em] block mb-1">Prescribed Recommendation</span>
                                                                <h4 className="text-sm sm:text-base font-black text-[var(--color-secondary)] leading-tight uppercase tracking-tight truncate">{sm.recipe_name}</h4>
                                                                <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2 text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] tracking-tight">
                                                                    <span className="flex items-center gap-1"><Flame size={12} className="text-amber-500" /> {sm.calories || 0} kcal</span>
                                                                    <span>•</span>
                                                                    <span>P: {sm.protein_g || 0}g</span>
                                                                    <span>•</span>
                                                                    <span>C: {sm.carbs_g || 0}g</span>
                                                                    <span>•</span>
                                                                    <span>F: {sm.fats_g || 0}g</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto items-stretch sm:items-end flex-shrink-0">
                                                            <button
                                                                onClick={() => toggleScheduledMeal(sm.id)}
                                                                className={cn(
                                                                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all h-10",
                                                                    sm.is_consumed 
                                                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25" 
                                                                        : "bg-white dark:bg-transparent border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]"
                                                                )}
                                                            >
                                                                <CheckCircle2 size={14} />
                                                                {sm.is_consumed ? "Consumed" : "Mark Consumed"}
                                                            </button>
                                                            {isRealRecipe && (
                                                                <Link 
                                                                    to={`/meals/${sm.recipe_id}`}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-105 h-10 shadow-md shadow-[var(--color-primary)]/20 text-center"
                                                                >
                                                                    View Recipe
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                    <div className="divide-y-2 divide-[var(--color-divider)]">
                                        {meal.items.map((item, itemIdx) => {
                                            const dict = FEL_DICTIONARY[item.category];
                                            return (
                                                <div key={itemIdx} className={cn("flex flex-col sm:flex-row sm:items-center p-4 sm:p-6 gap-4 transition-colors", item.completed && "bg-emerald-50/30")}>
                                                    {/* Checkbox & Details */}
                                                    <div
                                                        className="flex items-center gap-4 flex-1 cursor-pointer group"
                                                        onClick={() => toggleItem(mealIdx, itemIdx)}
                                                    >
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                                            item.completed ? "bg-emerald-500 border-emerald-500 text-white scale-110" : "border-gray-300 group-hover:border-[var(--color-primary)]"
                                                        )}>
                                                            {item.completed && <CheckCircle2 size={14} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {dict.icon}
                                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{item.category}</span>
                                                            </div>
                                                            <p className={cn("text-sm font-bold uppercase tracking-tight", item.completed ? "text-emerald-700 line-through opacity-70" : "text-[var(--color-text-main)]")}>
                                                                {item.amount}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Swap Button */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveSwap(activeSwap === item.category ? null : item.category);
                                                        }}
                                                        className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest flex items-center gap-2 h-9"
                                                    >
                                                        <Info size={14} />
                                                        View Options
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Static Swap Dictionary Modal (Pop-up from bottom) */}
            {activeSwap && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[var(--color-bg-card)] w-full max-w-md rounded-[2rem] border-2 border-[var(--color-divider)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
                        <div className="p-6 border-b-2 border-[var(--color-divider)] flex items-center justify-between bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-[var(--color-divider)]">
                                    {FEL_DICTIONARY[activeSwap].icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tight">{activeSwap} Equivalents</h3>
                                    <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">
                                        {FEL_DICTIONARY[activeSwap].definition}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">You can use any of the following to equal 1 serving:</p>
                            <ul className="space-y-3">
                                {FEL_DICTIONARY[activeSwap].examples.map((ex, i) => (
                                    <li key={i} className="flex items-center gap-3 bg-[var(--color-bg-page)] p-3 rounded-xl border border-[var(--color-divider)]">
                                        <div className="h-1.5 w-1.5 bg-[var(--color-primary)] rounded-full" />
                                        <span className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-tight">{ex}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button className="w-full mt-6 h-12 rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => setActiveSwap(null)}>
                                Got it
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
