import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { ShieldCheck, Activity, Cpu, HardDrive, Database, AlertTriangle, CheckCircle2, MessageSquare, BrainCircuit, RefreshCw, KeySquare, ServerCrash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import AIHealthMonitor from '../admin/components/AIHealthMonitor';
import PlatformDiagnostics from '../admin/components/PlatformDiagnostics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Custom SVG Circular Telemetry Dial Component
const TelemetryDial = ({ value, label, unit, icon: Icon, color, max = 100 }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let ringColor = 'stroke-emerald-500';
    let bgPulse = 'bg-emerald-500/10';
    if (percentage > 85) {
        ringColor = 'stroke-rose-500';
        bgPulse = 'bg-rose-500/10';
    } else if (percentage > 60) {
        ringColor = 'stroke-amber-500';
        bgPulse = 'bg-amber-500/10';
    }

    return (
        <div className="flex flex-col items-center p-3 sm:p-6 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-2xl sm:rounded-3xl shadow-sm relative group hover:shadow-xl transition-all duration-300">
            <div className="relative w-16 h-16 sm:w-28 sm:h-28 flex items-center justify-center">
                {/* Background pulse aura */}
                <div className={`absolute inset-2 sm:inset-3 rounded-full blur-lg sm:blur-xl animate-pulse ${bgPulse}`} />
                
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        className="stroke-zinc-100 dark:stroke-white/5"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        className={ringColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute flex flex-col items-center select-none text-center">
                    <Icon className={`${color} mb-0.5 sm:mb-1 w-3.5 h-3.5 sm:w-4 sm:h-4`} />
                    <span className="text-xs sm:text-xl font-black tracking-tighter text-[var(--color-text-main)] leading-none tabular-nums">
                        {value}
                    </span>
                    <span className="text-[6px] sm:text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{unit}</span>
                </div>
            </div>
            <span className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-2 sm:mt-4 text-center truncate w-full">{label}</span>
        </div>
    );
};

// Custom Glassmorphic Chart Tooltip
const CustomTooltip = ({ active, payload, label, keyName, colorName, range }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        const formatRangeDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            if (range === 'year') {
                const parts = dateStr.split('-');
                if (parts.length === 2) {
                    const d = new Date(parts[0], parts[1] - 1, 1);
                    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                }
            } else {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                }
            }
            return dateStr;
        };

        return (
            <div className="backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border border-zinc-200/50 dark:border-white/10 rounded-2xl p-4 shadow-2xl text-left select-none animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">
                    {formatRangeDate(label)}
                </p>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900" style={{ backgroundColor: colorName }} />
                    <span className="text-sm font-black text-[var(--color-text-main)] tabular-nums">
                        {val.toLocaleString()} <span className="text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-wide">{keyName === 'users' ? 'Sign-ups' : 'Logs'}</span>
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

// Premium Interactive Telemetry Chart Component
const TelemetryChart = ({ data, keyName, label, color, range }) => {
    if (!data || data.length === 0) return null;

    // Calculate dynamic period statistics
    const total = data.reduce((sum, d) => sum + (d[keyName] || 0), 0);
    const average = (total / data.length).toFixed(1);
    
    let peakVal = 0;
    let peakDate = 'N/A';
    data.forEach(d => {
        const val = d[keyName] || 0;
        if (val > peakVal) {
            peakVal = val;
            peakDate = d.date || 'N/A';
        }
    });

    const formatPeakDate = (dateStr) => {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        if (range === 'year') {
            const parts = dateStr.split('-');
            if (parts.length === 2) {
                const d = new Date(parts[0], parts[1] - 1, 1);
                return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            }
        } else {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
        }
        return dateStr;
    };

    const formatXAxis = (tickItem) => {
        if (!tickItem) return '';
        if (range === 'year') {
            const parts = tickItem.split('-');
            if (parts.length === 2) {
                const d = new Date(parts[0], parts[1] - 1, 1);
                return d.toLocaleDateString(undefined, { month: 'short' });
            }
        } else {
            const d = new Date(tickItem);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
        }
        return tickItem;
    };

    const rangeText = range === 'week' ? '7 Days' : range === 'year' ? '12 Months' : '30 Days';

    return (
        <Card className="border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-[2.2rem] overflow-hidden bg-[var(--color-bg-card)] p-4 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300">
            {/* Chart Title and Header */}
            <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                    <span className="text-[7px] sm:text-[8px] font-black text-[var(--color-primary)] uppercase tracking-[0.2em]">Observability Range: {rangeText}</span>
                    <h3 className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight mt-0.5">{label}</h3>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[var(--color-divider)] text-[8px] sm:text-[9px] font-black uppercase text-[var(--color-text-main)] select-none">
                    <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[var(--color-primary)] animate-ping" />
                    <span>Live</span>
                </div>
            </div>

            {/* KPI Metrics Insights Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8 border-b border-[var(--color-divider)] pb-4 sm:pb-6 select-none">
                <div className="p-2 sm:p-3 bg-gray-50/30 dark:bg-white/5 rounded-xl sm:rounded-2xl border border-[var(--color-divider)]">
                    <span className="text-[7px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block">Sum Total</span>
                    <span className="text-xs sm:text-xl font-black text-[var(--color-text-main)] mt-0.5 sm:mt-1 block tabular-nums">{total.toLocaleString()}</span>
                </div>
                <div className="p-2 sm:p-3 bg-gray-50/30 dark:bg-white/5 rounded-xl sm:rounded-2xl border border-[var(--color-divider)]">
                    <span className="text-[7px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block">{range === 'year' ? 'Monthly Avg' : 'Daily Avg'}</span>
                    <span className="text-xs sm:text-xl font-black text-[var(--color-text-main)] mt-0.5 sm:mt-1 block tabular-nums">{average}</span>
                </div>
                <div className="p-2 sm:p-3 bg-gray-50/30 dark:bg-white/5 rounded-xl sm:rounded-2xl border border-[var(--color-divider)]">
                    <span className="text-[7px] sm:text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block">Peak</span>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                        <span className="text-xs sm:text-xl font-black text-[var(--color-text-main)] tabular-nums">{peakVal}</span>
                        {peakVal > 0 && (
                            <span className="text-[6px] sm:text-[8px] font-black text-[var(--color-primary)] uppercase bg-[var(--color-primary)]/10 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full truncate max-w-full block">
                                {formatPeakDate(peakDate)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Interactive Area Chart */}
            <div className="w-full h-44 select-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`chart-grad-${keyName}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.1)" />
                        <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={formatXAxis}
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 8, fontWeight: 900 }}
                            dy={10}
                        />
                        <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 8, fontWeight: 900 }}
                            dx={-5}
                        />
                        <Tooltip 
                            content={<CustomTooltip keyName={keyName} colorName={color} range={range} />} 
                            cursor={{ stroke: color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey={keyName} 
                            stroke={color} 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill={`url(#chart-grad-${keyName})`}
                            activeDot={{ r: 5, strokeWidth: 2, className: 'fill-white dark:fill-zinc-950 stroke-[var(--color-primary)]' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default function AdminTelemetry() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('server'); // 'server' or 'ai'
    const [range, setRange] = useState('month'); // 'week' | 'month' | 'year'

    useEffect(() => {
        fetchTelemetry(range);
        // Live polling every 5 seconds to keep dashboard dials animated and active
        const interval = setInterval(() => {
            fetchTelemetry(range, true);
        }, 5000);
        return () => clearInterval(interval);
    }, [range]);

    const fetchTelemetry = async (activeRange, isPolling = false) => {
        if (!isPolling && !stats) setLoading(true);
        try {
            const res = await api.get(`/admin/stats?range=${activeRange}`);
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch administrative telemetry:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="p-20 text-center font-black uppercase tracking-[0.25em] text-[10px] text-[var(--color-text-muted)] animate-pulse flex flex-col items-center gap-3">
                <RefreshCw size={24} className="animate-spin text-[var(--color-primary)]" />
                Initializing Observability Console...
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20 px-2 sm:px-4">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                            <Activity size={22} className="animate-pulse" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main)] uppercase tracking-tight">System Telemetry</h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-medium max-w-lg flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Real-time dashboard monitoring database latency, server computational loads, and Gemini key health.</span>
                        {stats?.compiledAt && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20 shadow-sm shrink-0">
                                <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-ping" />
                                Synced: {new Date(stats.compiledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>

                {/* Tab selector */}
                <div className="flex p-1 bg-[var(--color-divider)] dark:bg-white/5 rounded-2xl border border-[var(--color-divider)] shadow-inner self-start md:self-center shrink-0">
                    <button
                        onClick={() => setActiveTab('server')}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'server'
                            ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                    >
                        Server & Load
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai'
                            ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                    >
                        AI Infrastructure
                    </button>
                </div>
            </div>

            {/* ── ANOMALOUS TRAFFIC ALARM ── */}
            {stats?.anomalousSpikes?.isSpike && (
                <div className="relative overflow-hidden rounded-[2rem] border-2 border-rose-500/30 bg-rose-500/5 p-5 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-[0_12px_36px_-12px_rgba(239,68,68,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/[0.03] to-red-500/[0.01]" />
                    <div className="relative flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest leading-none">Anomalous Ingestion Density Detected</h4>
                            <p className="text-[10px] text-rose-500/70 font-semibold uppercase tracking-wider mt-1.5 leading-relaxed">
                                {stats.anomalousSpikes.recentLogsCount} logs registered in the last 15 minutes. Heavy database write load active.
                            </p>
                        </div>
                    </div>
                    <Link to="/admin/data" className="relative z-10 px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors shrink-0 shadow-lg shadow-rose-500/20">
                        Content Audit
                    </Link>
                </div>
            )}

            {/* ── MAIN OBSERVED VIEWS ── */}
            <AnimatePresence mode="wait">
                {activeTab === 'server' ? (
                    <motion.div
                        key="server"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Metrics Dials */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-6">
                            <TelemetryDial
                                value={stats?.serverTelemetry?.cpuUsage ?? 8}
                                label="CPU Usage"
                                unit="LOAD %"
                                icon={Cpu}
                                color="text-emerald-500"
                                max={100}
                            />
                            <TelemetryDial
                                value={stats?.serverTelemetry?.ramUsage ?? 45}
                                label="RAM Allocated"
                                unit="MEM %"
                                icon={HardDrive}
                                color="text-amber-500"
                                max={100}
                            />
                            <TelemetryDial
                                value={stats?.serverTelemetry?.dbLatency ?? 14}
                                label="Database Latency"
                                unit="MS TIME"
                                icon={Database}
                                color="text-teal-500"
                                max={150}
                            />
                        </div>

                        {/* Interactive Growth Range Selector Panel */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-bg-card)] border border-[var(--color-divider)] p-5 rounded-[2rem] shadow-sm select-none">
                            <div>
                                <h3 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-wider">Metrics Growth & Workloads</h3>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest mt-1">
                                    Analyze user acquisition velocity and logging volume trends
                                </p>
                            </div>
                            <div className="flex p-1 bg-[var(--color-divider)] dark:bg-white/5 rounded-xl border border-[var(--color-divider)] shadow-inner">
                                <button
                                    onClick={() => setRange('week')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${range === 'week'
                                        ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Week
                                </button>
                                <button
                                    onClick={() => setRange('month')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${range === 'month'
                                        ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Month
                                </button>
                                <button
                                    onClick={() => setRange('year')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${range === 'year'
                                        ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Year
                                </button>
                            </div>
                        </div>

                        {/* Interactive Growth/Activity Trends */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TelemetryChart
                                data={stats?.dailyTrends}
                                keyName="users"
                                label={range === 'year' ? "Monthly User Registrations" : "Daily User Registrations"}
                                color="#3b82f6"
                                range={range}
                            />
                            <TelemetryChart
                                data={stats?.dailyTrends}
                                keyName="meals"
                                label={range === 'year' ? "Monthly Pediatric Meal Logs" : "Daily Pediatric Meal Logs"}
                                color="#8b5cf6"
                                range={range}
                            />
                        </div>

                        {/* Platform Self-Test Diagnostics */}
                        <PlatformDiagnostics />
                    </motion.div>
                ) : (
                    <motion.div
                        key="ai"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AIHealthMonitor stats={stats?.aiHealth} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
