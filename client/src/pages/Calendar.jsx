import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Apple, Coffee, Sun, Moon, Flame } from 'lucide-react';
import { Snackbar, Alert } from '@mui/material';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { cn } from '../lib/utils';

import api from '../lib/api';
import { useProfile } from '../context/ProfileContext';

export default function Calendar() {
    const navigate = useNavigate();
    const { selectedProfile, loading: profileLoading } = useProfile();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [logs, setLogs] = useState([]);
    const [rules, setRules] = useState([]);
    const [dayStatuses, setDayStatuses] = useState({});
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Fetch data on mount or when profile/month changes
    React.useEffect(() => {
        if (selectedProfile) {
            fetchData();
        } else if (!profileLoading) {
            setLogs([]);
            setRules([]);
        }
    }, [selectedProfile?.id, currentMonth, profileLoading]);

    const fetchData = async () => {
        if (!selectedProfile) return;
        try {
            const [logsRes, rulesRes] = await Promise.all([
                api.get(`/logs/profile/${selectedProfile.id}`),
                api.get(`/rules/profile/${selectedProfile.id}`)
            ]);
            setLogs(logsRes.data);
            setRules(rulesRes.data);
            calculateHeatmap(logsRes.data, rulesRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const calculateHeatmap = (mealLogs, profileRules) => {
        const statuses = {};
        const grouped = mealLogs.reduce((acc, log) => {
            const date = new Date(log.logged_at).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(log);
            return acc;
        }, {});

        Object.keys(grouped).forEach(date => {
            const dayLogs = grouped[date];
            const totals = dayLogs.reduce((acc, l) => {
                acc.calories += (l.total_calories || 0);
                acc.protein += (l.total_protein_g || 0);
                acc.carbs += (l.total_carbs_g || 0);
                acc.fat += (l.total_fat_g || 0);
                acc.sodium += (l.total_sodium_mg || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 });

            let status = 'success'; // Default Green

            profileRules.forEach(rule => {
                const limit = parseFloat(rule.rule_value);
                if (!limit) return;
                
                let current = 0;
                if (rule.category === 'Calories') current = totals.calories;
                else if (rule.category === 'Protein') current = totals.protein;
                else if (rule.category === 'Carbohydrates' || rule.category === 'Carb') current = totals.carbs;
                else if (rule.category === 'Fats' || rule.category === 'Fat') current = totals.fat;
                else if (rule.category === 'Sodium') current = totals.sodium;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
                else if (rule.rule_type === 'max' && current > limit * 0.9 && status !== 'danger') status = 'warning';
            });

            statuses[date] = status;
        });
        setDayStatuses(statuses);
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

                        {/* Heatmap Indicator */}
                        <div className="absolute inset-0 z-0 opacity-10 rounded-lg">
                            <div className={cn(
                                "w-full h-full",
                                dayStatuses[day.toLocaleDateString()] === 'danger' ? 'bg-red-500' :
                                dayStatuses[day.toLocaleDateString()] === 'warning' ? 'bg-amber-500' :
                                dayStatuses[day.toLocaleDateString()] === 'success' ? 'bg-emerald-500' :
                                ''
                            )} />
                        </div>

                        {/* Real Logs */}
                        <div className="space-y-1 mt-1 relative z-10">
                            {logs
                                .filter(l => isSameDay(new Date(l.logged_at), day))
                                .slice(0, 2)
                                .map((log, idx) => (
                                    <div key={idx} className={cn(
                                        "text-[9px] p-1 rounded font-black uppercase tracking-tighter truncate",
                                        log.compliance_status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                    )}>
                                        🍽️ {log.meal_category}
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
                    <CardTitle>Daily Log for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            dayStatuses[selectedDate.toLocaleDateString()] === 'danger' ? 'bg-red-100 text-red-700' :
                            dayStatuses[selectedDate.toLocaleDateString()] === 'warning' ? 'bg-amber-100 text-amber-700' :
                            dayStatuses[selectedDate.toLocaleDateString()] === 'success' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-500'
                        )}>
                            {dayStatuses[selectedDate.toLocaleDateString()] || 'No Data'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {logs.filter(l => isSameDay(new Date(l.logged_at), selectedDate)).length > 0 ? (
                            logs.filter(l => isSameDay(new Date(l.logged_at), selectedDate)).map(log => (
                                <div key={log.id}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] cursor-pointer hover:shadow-md transition-all"
                                    onClick={() => navigate('/meal-history')}
                                >
                                    <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                        <img src={log.image_url} alt="meal" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-[var(--color-text-main)] w-3/4 truncate">
                                                {log.meal_category}
                                            </p>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                                                log.compliance_status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                                            )}>
                                                {log.compliance_status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <Flame size={12} className="text-orange-500" />
                                                <span className="font-bold">{log.total_calories}</span> kcal
                                            </span>
                                            <span className="font-bold text-blue-600 uppercase tracking-tighter">Protein: {log.total_protein_g}g</span>
                                            <span className="font-bold text-emerald-600 uppercase tracking-tighter">Carb: {log.total_carbs_g}g</span>
                                            <span className="font-bold text-orange-600 uppercase tracking-tighter">Fat: {log.total_fat_g}g</span>
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
