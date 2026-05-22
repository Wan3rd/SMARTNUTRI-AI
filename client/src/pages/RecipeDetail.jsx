import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import { Clock, Users, ArrowLeft, Flame, ChefHat, ScrollText, CheckCircle2, ArrowUpRight } from 'lucide-react';
import api from '../lib/api';
import { RecipeDetailSkeleton } from '../components/SkeletonShell';
import { useNotification } from '../context/NotificationContext';

export default function RecipeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const res = await api.get(`/meals/${id}`);
                setRecipe(res.data);
            } catch (err) {
                console.error("Failed to fetch recipe info", err);
                showNotification("Failed to load recipe details. Please try again.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchRecipe();
    }, [id, showNotification]);

    if (loading) return <RecipeDetailSkeleton />;
    if (!recipe) return <div className="p-10 text-center">Recipe not found.</div>;

    // Helper to get nutrient value
    const getNutrient = (name) => {
        const n = recipe.nutrition?.nutrients.find(nx => nx.name === name);
        return n ? `${Math.round(n.amount)}${n.unit}` : 'N/A';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:bg-transparent hover:text-[var(--color-primary)]">
                <ArrowLeft size={20} /> Back to Meals
            </Button>

            <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden shadow-lg">
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 md:p-10">
                    <div className="text-white">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">{recipe.title}</h1>
                        <div className="flex gap-4 text-sm font-medium opacity-90">
                            <span className="flex items-center gap-1"><Clock size={16} /> {recipe.readyInMinutes} min</span>
                            <span className="flex items-center gap-1"><Users size={16} /> {recipe.servings} servings</span>
                            <span className="flex items-center gap-1 text-[var(--color-accent)]"><Flame size={16} fill="currentColor" /> {getNutrient('Calories')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Ingredients & Nutrition */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                                <Flame size={20} /> Nutrition Facts
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Protein</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Protein')}</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Carbs</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Carbohydrates')}</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Fat</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Fat')}</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Fiber</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Fiber')}</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Sugar</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Sugar')}</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center">
                                    <div className="text-sm text-[var(--color-text-muted)]">Sodium</div>
                                    <div className="font-bold text-[var(--color-text-main)]">{getNutrient('Sodium')}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                                <ChefHat size={20} /> Ingredients
                            </h3>
                            <ul className="space-y-3">
                                {recipe.extendedIngredients?.map((ing) => (
                                    <li key={ing.id} className="flex items-start gap-3 text-sm text-[var(--color-text-main)]">
                                        <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-[var(--color-primary)]"></div>
                                        <span>{ing.original}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Instructions */}
                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-[var(--color-secondary)] mb-6 flex items-center gap-2">
                                <ScrollText size={22} /> Instructions
                            </h3>

                            {/* Improved Instructions Logic */}
                            {recipe.instructions && !recipe.instructions.startsWith('http') && recipe.instructions.length > 50 ? (
                                <div className="text-[var(--color-text-main)] leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
                            ) : (
                                <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                    <p className="mb-4 text-[var(--color-text-muted)]">Full cooking instructions are hosted on the partner website.</p>
                                    <a
                                        href={recipe.sourceUrl || recipe.instructions}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-transform hover:scale-105 shadow-lg shadow-[var(--color-primary)]/25"
                                    >
                                        View Full Recipe <ArrowUpRight size={16} />
                                    </a>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
