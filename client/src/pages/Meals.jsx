import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Search, Filter, Clock, Flame, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import { MealsGridSkeleton } from '../components/SkeletonShell';

const FILTERS = {
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Teatime'],
    cuisines: ['Asian', 'American', 'British', 'Chinese', 'French', 'Indian', 'Italian', 'Japanese', 'Mediterranean', 'Mexican', 'Middle Eastern', 'South East Asian'],
    diets: ['Balanced', 'High-Protein', 'Low-Carb', 'Low-Fat'],
    health: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Peanut-Free', 'Paleo']
};

export default function Meals() {
    const navigate = useNavigate();
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState({
        mealType: '',
        cuisine: '',
        diet: '',
        health: []
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchMeals();
    }, [debouncedQuery, selectedFilters]);

    const fetchMeals = async () => {
        setLoading(true);
        try {
            const params = {
                query: debouncedQuery,
                ...selectedFilters
            };
            const res = await api.get('/meals/search', { params });
            setMeals(res.data.results || []);
        } catch (err) {
            console.error("Failed to fetch meals", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (category, value) => {
        setSelectedFilters(prev => {
            if (category === 'health') {
                const current = prev.health;
                return {
                    ...prev,
                    health: current.includes(value)
                        ? current.filter(item => item !== value)
                        : [...current, value]
                };
            } else {
                return {
                    ...prev,
                    [category]: prev[category] === value ? '' : value
                };
            }
        });
    };

    const clearFilters = () => {
        setSelectedFilters({ mealType: '', cuisine: '', diet: '', health: [] });
        setSearchQuery('');
    };

    const activeFilterCount = (selectedFilters.mealType ? 1 : 0) +
        (selectedFilters.cuisine ? 1 : 0) +
        (selectedFilters.diet ? 1 : 0) +
        selectedFilters.health.length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Meal Library 🥗</h1>
                        <p className="text-[var(--color-text-muted)] mt-1">Discover healthy and delicious recipes.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search meals..."
                                className="h-10 pl-10 pr-4 rounded-full border border-[var(--color-divider)] bg-[var(--color-bg-page)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full md:w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className={`cursor-pointer transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]' : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={18} />
                        </Button>
                    </div>
                </div>

                {/* Collapsible Filter Panel */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-[var(--color-divider)] space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-[var(--color-secondary)]">Refine Results</h3>
                            <button onClick={clearFilters} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] underline">
                                Clear All
                            </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Meal Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Meal Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {FILTERS.mealTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => toggleFilter('mealType', type)}
                                            className={`px-3 py-1.5 text-sm rounded-full transition-all border ${selectedFilters.mealType === type
                                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] font-medium shadow-sm'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cuisine Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Cuisine</label>
                                <div className="flex flex-wrap gap-2">
                                    {FILTERS.cuisines.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => toggleFilter('cuisine', c)}
                                            className={`px-3 py-1.5 text-sm rounded-full transition-all border ${selectedFilters.cuisine === c
                                                ? 'bg-purple-600 text-white border-purple-600 font-medium shadow-sm'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-purple-600'
                                                }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Diet */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Diet</label>
                                <div className="flex flex-wrap gap-2">
                                    {FILTERS.diets.map(diet => (
                                        <button
                                            key={diet}
                                            onClick={() => toggleFilter('diet', diet)}
                                            className={`px-3 py-1.5 text-sm rounded-full transition-all border ${selectedFilters.diet === diet
                                                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] font-medium shadow-sm'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-accent)]'
                                                }`}
                                        >
                                            {diet}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Health */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Health</label>
                                <div className="flex flex-wrap gap-2">
                                    {FILTERS.health.map(label => (
                                        <button
                                            key={label}
                                            onClick={() => toggleFilter('health', label)}
                                            className={`px-3 py-1.5 text-sm rounded-full transition-all border ${selectedFilters.health.includes(label)
                                                ? 'bg-[var(--color-secondary)] text-white border-[var(--color-secondary)] font-medium shadow-sm'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-secondary)]'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Filters Display (if panel closed) */}
            {!showFilters && activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-muted)] mr-1 self-center">Active:</span>
                    {selectedFilters.mealType && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold rounded-lg border border-[var(--color-primary)]/20">
                            {selectedFilters.mealType} <X size={12} className="cursor-pointer" onClick={() => toggleFilter('mealType', selectedFilters.mealType)} />
                        </span>
                    )}
                    {selectedFilters.cuisine && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-200 dark:border-purple-800">
                            {selectedFilters.cuisine} <X size={12} className="cursor-pointer" onClick={() => toggleFilter('cuisine', selectedFilters.cuisine)} />
                        </span>
                    )}
                    {selectedFilters.diet && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-bold rounded-lg border border-[var(--color-accent)]/20">
                            {selectedFilters.diet} <X size={12} className="cursor-pointer" onClick={() => toggleFilter('diet', selectedFilters.diet)} />
                        </span>
                    )}
                    {selectedFilters.health.map(h => (
                        <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] text-xs font-bold rounded-lg border border-[var(--color-secondary)]/20">
                            {h} <X size={12} className="cursor-pointer" onClick={() => toggleFilter('health', h)} />
                        </span>
                    ))}
                </div>
            )}


            {loading ? (
                <MealsGridSkeleton />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meals.length > 0 ? (
                        meals.map((meal) => {
                            // Extract calories if available (Edamam structure flattened)
                            const calories = meal.nutrition?.calories;
                            const proteinStr = meal.nutrition?.protein;
                            const protein = proteinStr ? parseInt(proteinStr) : 0;

                            return (
                                <Card
                                    key={meal.id}
                                    className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer border border-[var(--color-divider)]"
                                    onClick={() => navigate(`/meals/${meal.id}`)}
                                >
                                    <div className="h-48 overflow-hidden relative">
                                        <img
                                            src={meal.image}
                                            alt={meal.title}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                                        />
                                        {calories && (
                                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-gray-900 dark:text-white shadow-sm border border-transparent dark:border-white/10">
                                                {Math.round(calories)} kcal
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-bold text-lg text-[var(--color-text-main)] mb-1 line-clamp-1">{meal.title}</h3>
                                        <div className="flex items-center text-xs text-[var(--color-text-muted)] gap-4">
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {meal.readyInMinutes ? `${meal.readyInMinutes} min` : 'N/A'}
                                            </div>
                                            {protein > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Flame size={14} className="text-orange-500" />
                                                    {Math.round(protein)}g Protein
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center text-[var(--color-text-muted)] py-12">
                            <h3 className="text-lg font-medium text-[var(--color-text-main)] mb-2">No meals found</h3>
                            <p>Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
