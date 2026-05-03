import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Apple, Coffee, Sun, Moon, Flame } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { cn } from '../lib/utils';

import api from '../lib/api';

export default function Calendar() {
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDay, setLoadingDay] = useState(false);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Fetch plans on mount
    React.useEffect(() => {
        fetchPlans();
    }, [currentMonth]); // Reload when month changes? Or just once.

    const fetchPlans = async () => {
        try {
            const res = await api.get('/meals/plans'); // Need to create this GET route too
            setPlans(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await api.post('/meals/generate');
            await fetchPlans(); // Refresh

            setNotification({
                open: true,
                message: 'Successfully generated a new weekly plan tailored for your child!',
                severity: 'success'
            });
        } catch (err) {
            console.error(err);
            setNotification({
                open: true,
                message: 'Failed to generate plan. Please try again.',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateDay = async () => {
        if (!selectedDate) return;

        setLoadingDay(true);
        try {
            // Format date to local YYYY-MM-DD
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            await api.post('/meals/generate/day', { date: dateStr });
            await fetchPlans(); // Refresh

            setNotification({
                open: true,
                message: `Plan for ${format(selectedDate, 'MMMM d')} has been regenerated!`,
                severity: 'success'
            });
        } catch (err) {
            console.error(err);
            setNotification({
                open: true,
                message: 'Failed to regenerate meals for this day.',
                severity: 'error'
            });
        } finally {
            setLoadingDay(false);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setNotification({ ...notification, open: false });
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-secondary)]">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <Button onClick={handleGenerate} disabled={loading} className="bg-[var(--color-primary)] text-white gap-2">
                        {loading ? 'Generating...' : '✨ Generate AI Plan'}
                    </Button>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft size={20} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight size={20} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const dateFormat = "EEE";
        const days = [];
        let startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="text-center font-medium text-[var(--color-text-muted)] py-2" key={i}>
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            );
        }
        return <div className="grid grid-cols-7 mb-2">{days}</div>;
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

                days.push(
                    <div
                        className={cn(
                            "min-h-[100px] border border-[var(--color-divider)] p-2 relative transition-colors hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer rounded-lg",
                            !isSameMonth(day, monthStart) && "text-[var(--color-text-muted)] bg-gray-50/50 dark:bg-black/20",
                            isSameDay(day, selectedDate) && "border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10"
                        )}
                        key={day}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <span className={cn(
                            "text-sm font-medium block mb-2 text-[var(--color-text-main)]",
                            isSameDay(day, new Date()) && "text-[var(--color-primary)] font-bold"
                        )}>
                            {formattedDate}
                        </span>

                        {/* Real Events */}
                        <div className="space-y-1 mt-1">
                            {plans
                                .filter(p => {
                                    // Robust Date Parsing: Treat YYYY-MM-DD as Local
                                    const pDateStr = typeof p.date === 'string' ? p.date.substring(0, 10) : '';
                                    const pDate = new Date(`${pDateStr}T00:00:00`);
                                    return isSameDay(pDate, day);
                                })
                                .slice(0, 2) // Show max 2
                                .map((plan, idx) => (
                                    <div key={idx} className="text-xs p-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-secondary)] truncate">
                                        🍽️ {plan.recipe_name}
                                    </div>
                                ))
                            }
                        </div>

                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-2 mb-2" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="bg-[var(--color-bg-card)] p-4 rounded-2xl shadow-sm border border-[var(--color-divider)]">{rows}</div>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Nutrition Calendar</h1>
                <p className="text-[var(--color-text-muted)] mt-1">Plan and track your meals for the month.</p>
            </div>

            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {/* Selected Day Details */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Meals for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerateDay}
                        disabled={loadingDay}
                        className="text-xs h-8 gap-1.5 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                    >
                        {loadingDay ? 'Regenerating...' : '🔄 Regenerate Day'}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {plans.filter(p => {
                            const pDateStr = typeof p.date === 'string' ? p.date.substring(0, 10) : '';
                            const pDate = new Date(`${pDateStr}T00:00:00`);
                            return isSameDay(pDate, selectedDate);
                        }).length > 0 ? (
                            plans.filter(p => {
                                const pDateStr = typeof p.date === 'string' ? p.date.substring(0, 10) : '';
                                const pDate = new Date(`${pDateStr}T00:00:00`);
                                return isSameDay(pDate, selectedDate);
                            }).map(plan => (
                                <div key={plan.id}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => {
                                        if (plan.recipe_id) {
                                            navigate(`/meals/${plan.recipe_id}`);
                                        }
                                    }}
                                >
                                    <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                        <img src={plan.image_url} alt="meal" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-[var(--color-text-main)] w-3/4 truncate" title={plan.recipe_name}>
                                                {plan.recipe_name}
                                            </p>
                                            <span className="text-xs font-bold text-[var(--color-primary)] px-2 py-1 bg-[var(--color-primary)]/10 rounded-full">
                                                {plan.meal_type}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <Flame size={12} className="text-orange-500" />
                                                <span className="font-bold">{plan.calories}</span> kcal
                                            </span>
                                            {plan.protein_g > 0 && (
                                                <span className="px-1.5 py-0.5 bg-blue-600 text-white dark:bg-blue-900/40 dark:text-blue-300 rounded font-bold">
                                                    {plan.protein_g}g Proteins
                                                </span>
                                            )}
                                            {plan.carbs_g > 0 && (
                                                <span className="px-1.5 py-0.5 bg-green-600 text-white dark:bg-green-900/40 dark:text-green-300 rounded font-bold">
                                                    {plan.carbs_g}g Carbs
                                                </span>
                                            )}
                                            {plan.fats_g > 0 && (
                                                <span className="px-1.5 py-0.5 bg-amber-500 text-white dark:bg-yellow-900/40 dark:text-yellow-300 rounded font-bold">
                                                    {plan.fats_g}g Fats
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-[var(--color-text-muted)] py-4">No meals planned for this day.</p>
                        )}
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
        </div>
    );
}
