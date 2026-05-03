import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ChefHat, Sparkles, ThumbsDown, Utensils } from 'lucide-react';
import api from '../lib/api';
import ReactMarkdown from 'react-markdown';

export default function AIKitchen() {
    const [cravings, setCravings] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [includeSteps, setIncludeSteps] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recipe, setRecipe] = useState('');

    const handleGenerate = async () => {
        if (!cravings) return;
        setLoading(true);
        setRecipe('');
        try {
            const prompt = `I need a creative recipe idea for a child (aged 7-12). 
            Cravings/Ingredients: ${cravings}. 
            Dislikes/Allergies to avoid: ${dislikes || 'None'}.
            Provide a name for the dish (keep it simple dish name but easy to understand), a short description, and key ingredients. The meal should be suitable for a child aged 7-12. Keep it healthy. Use simple words and provide only foods that area easy to do and possible. Also keep it short as possible. Give a proper layout on your prompt so that it is easy to read and understand${includeSteps ? " Also provide step-by-step cooking instructions." : ""}`;

            const res = await api.post('/ai/gemini', { prompt });
            setRecipe(res.data.output);
        } catch (err) {
            console.error(err);
            setRecipe(err.response?.data?.error || "The AI Chef is taking a nap. Try again later!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                    <ChefHat className="text-[var(--color-primary)]" /> AI Kitchen
                </h1>
                <p className="text-[var(--color-text-muted)] mt-1">Tell our AI Chef what you're craving!</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>What are you in the mood for?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">I'm craving / I have...</label>
                            <textarea
                                className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                                rows="3"
                                placeholder="e.g. Strawberries, something crunchy, breakfast..."
                                value={cravings}
                                onChange={e => setCravings(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                <ThumbsDown size={14} /> I want to avoid...
                            </label>
                            <input
                                className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                                placeholder="e.g. Eggs, nuts, spicy food"
                                value={dislikes}
                                onChange={e => setDislikes(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="includeSteps"
                                className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                checked={includeSteps}
                                onChange={e => setIncludeSteps(e.target.checked)}
                            />
                            <label htmlFor="includeSteps" className="text-sm font-medium cursor-pointer">
                                Include cooking steps
                            </label>
                        </div>
                        <Button
                            className="w-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] items-center justify-between group"
                            onClick={handleGenerate}
                            disabled={loading || !cravings}
                        >
                            <span className="flex items-center gap-2">
                                <Sparkles size={18} className={loading ? "animate-spin" : "group-hover:animate-pulse"} />
                                {loading ? "Cooking up ideas..." : "Generate Recipe"}
                            </span>
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {recipe ? (
                        <Card className="border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-[var(--color-primary)]">
                                    <Utensils size={20} /> Chef's Suggestion
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose dark:prose-invert max-w-none text-[var(--color-text-main)]">
                                    <ReactMarkdown>{recipe}</ReactMarkdown>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 border-2 border-dashed border-[var(--color-divider)] rounded-xl">
                            <ChefHat size={48} className="mb-4 opacity-20" />
                            <p>Your custom recipe will appear here!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
