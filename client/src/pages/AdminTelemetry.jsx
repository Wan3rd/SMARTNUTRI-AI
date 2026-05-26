import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/common/Card';
import { ShieldCheck, Activity, Cpu, HardDrive, Database, AlertTriangle, CheckCircle2, MessageSquare, BrainCircuit, RefreshCw, KeySquare, ServerCrash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import AIHealthMonitor from '../admin/components/AIHealthMonitor';

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
        <div className="flex flex-col items-center p-6 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-3xl shadow-sm relative group hover:shadow-xl transition-all duration-300">
            <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Background pulse aura */}
                <div className={`absolute inset-3 rounded-full blur-xl animate-pulse ${bgPulse}`} />
                
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
                    <Icon size={16} className={`${color} mb-1`} />
                    <span className="text-xl font-black tracking-tighter text-[var(--color-text-main)] leading-none tabular-nums">
                        {value}
                    </span>
                    <span className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{unit}</span>
                </div>
            </div>
            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-4">{label}</span>
        </div>
    );
};

// Custom Premium Timeline Sparkline Component
const TelemetryChart = ({ data, keyName, label, color }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d[keyName] || 0), 1);
    
    // Generate precise SVG path points
    const points = data.map((d, index) => {
        const x = (index / (data.length - 1)) * 500;
        const y = 140 - ((d[keyName] || 0) / maxVal) * 110 - 15;
        return `${x},${y}`;
    });
    
    const pathD = `M ${points.join(' L ')}`;

    return (
        <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden bg-[var(--color-bg-card)] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <span className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-[0.2em]">Observability Range: 30 Days</span>
                    <h3 className="text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight mt-0.5">{label}</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-divider)] text-[9px] font-black uppercase text-[var(--color-text-main)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-ping" />
                    <span>Live Tracking</span>
                </div>
            </div>
            
            <div className="relative w-full h-36">
                <svg className="w-full h-full overflow-visible select-none" viewBox="0 0 500 140" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`chart-grad-${keyName}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="20" x2="500" y2="20" className="stroke-zinc-100 dark:stroke-white/5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="500" y2="70" className="stroke-zinc-100 dark:stroke-white/5" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="500" y2="120" className="stroke-zinc-100 dark:stroke-white/5" strokeWidth="1" strokeDasharray="4 4" />
                    
                    {/* Gradient Fill under Path */}
                    <path
                        d={`${pathD} L 500,140 L 0,140 Z`}
                        fill={`url(#chart-grad-${keyName})`}
                    />
                    
                    {/* Main stroke line */}
                    <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-3">
                <span>{data[0]?.date}</span>
                <span>{data[Math.floor(data.length / 2)]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </Card>
    );
};

export default function AdminTelemetry() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('server'); // 'server' or 'ai'

    useEffect(() => {
        fetchTelemetry();
        // Live polling every 5 seconds to keep dashboard dials animated and active
        const interval = setInterval(fetchTelemetry, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchTelemetry = async () => {
        try {
            const res = await api.get('/admin/stats');
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
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                            <Activity size={22} className="animate-pulse" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main)] uppercase tracking-tight">System Telemetry</h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-medium max-w-lg">
                        Real-time dashboard monitoring database latency, server computational loads, and Gemini key health.
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

                        {/* Interactive Growth/Activity Trends */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <TelemetryChart
                                data={stats?.dailyTrends}
                                keyName="users"
                                label="Daily User Registrations (30d)"
                                color="#3b82f6"
                            />
                            <TelemetryChart
                                data={stats?.dailyTrends}
                                keyName="meals"
                                label="Daily Pediatric Meal Logs (30d)"
                                color="#8b5cf6"
                            />
                        </div>
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
