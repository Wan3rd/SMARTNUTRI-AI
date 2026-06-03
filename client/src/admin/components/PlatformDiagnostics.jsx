import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Activity, Database, BrainCircuit, Cloud, Play, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export default function PlatformDiagnostics() {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const runSelfTest = async () => {
        setRunning(true);
        setError(null);
        try {
            const res = await api.get('/admin/diagnostics');
            setResults(res.data);
        } catch (err) {
            console.error("Self-test diagnostics run failed:", err);
            setError(err.response?.data?.message || "Failed to execute global diagnostics test suite.");
        } finally {
            setRunning(false);
        }
    };

    const getStatusStyles = (status) => {
        if (status === 'healthy') {
            return {
                bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                indicator: 'bg-emerald-500',
                icon: CheckCircle2
            };
        } else if (status === 'failed') {
            return {
                bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
                indicator: 'bg-rose-500',
                icon: XCircle
            };
        }
        return {
            bg: 'bg-zinc-100 dark:bg-white/5 border-[var(--color-divider)] text-[var(--color-text-muted)]',
            indicator: 'bg-zinc-400',
            icon: RefreshCw
        };
    };

    return (
        <Card className="border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)] p-4 sm:p-8">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 select-none font-outfit">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl">
                            <Activity size={24} className={running ? "animate-pulse text-indigo-500" : ""} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight">Observability Health Self-Test</h3>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1">Platform Core Diagnostics Console</p>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={runSelfTest}
                    disabled={running}
                    className="w-full md:w-auto h-11 px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] gap-2 hover:opacity-90 shadow-lg shadow-zinc-950/20 flex items-center justify-center transition-all shrink-0"
                >
                    {running ? (
                        <>
                            <RefreshCw size={14} className="animate-spin" />
                            Pinging Boundaries...
                        </>
                    ) : (
                        <>
                            <Play size={14} className="fill-current" />
                            Run Diagnostic Check
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-6 text-xs font-bold text-rose-500 select-none">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. DATABASE COMPONENT */}
                <div className="p-4 sm:p-6 bg-zinc-50/50 dark:bg-white/5 border border-[var(--color-divider)] rounded-2xl sm:rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300 select-none">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                            <Database size={20} />
                        </div>
                        {results?.database ? (
                            (() => {
                                const styles = getStatusStyles(results.database.status);
                                const Icon = styles.icon;
                                return (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${styles.bg}`}>
                                        <Icon size={12} />
                                        <span>{results.database.status}</span>
                                    </div>
                                );
                            })()
                        ) : (
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] px-3 py-1 rounded-full">untested</span>
                        )}
                    </div>
                    <h4 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-wider">Prisma SQL Engine</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest mt-1">PostgreSQL Connectivity & Latency</p>
                    
                    <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Query Latency</span>
                        <span className="text-sm font-black text-[var(--color-text-main)] tabular-nums">
                            {results?.database?.status === 'healthy' ? `${results.database.latency} ms` : '--'}
                        </span>
                    </div>
                    {results?.database?.error && (
                        <p className="text-[9px] font-bold text-rose-500 mt-2 truncate">{results.database.error}</p>
                    )}
                </div>

                {/* 2. GEMINI AI COMPONENT */}
                <div className="p-4 sm:p-6 bg-zinc-50/50 dark:bg-white/5 border border-[var(--color-divider)] rounded-2xl sm:rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300 select-none">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl">
                            <BrainCircuit size={20} />
                        </div>
                        {results?.gemini ? (
                            (() => {
                                const styles = getStatusStyles(results.gemini.status);
                                const Icon = styles.icon;
                                return (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${styles.bg}`}>
                                        <Icon size={12} />
                                        <span>{results.gemini.status}</span>
                                    </div>
                                );
                            })()
                        ) : (
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] px-3 py-1 rounded-full">untested</span>
                        )}
                    </div>
                    <h4 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-wider">Google Gemini API</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest mt-1">AI Scan Key Verification</p>

                    <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Handshake Latency</span>
                        <span className="text-sm font-black text-[var(--color-text-main)] tabular-nums">
                            {results?.gemini?.status === 'healthy' ? `${results.gemini.latency} ms` : '--'}
                        </span>
                    </div>
                    {results?.gemini?.error && (
                        <p className="text-[9px] font-bold text-rose-500 mt-2 truncate">{results.gemini.error}</p>
                    )}
                </div>

                {/* 3. CLOUDINARY COMPONENT */}
                <div className="p-4 sm:p-6 bg-zinc-50/50 dark:bg-white/5 border border-[var(--color-divider)] rounded-2xl sm:rounded-3xl relative overflow-hidden group hover:shadow-md transition-all duration-300 select-none">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <Cloud size={20} />
                        </div>
                        {results?.cloudinary ? (
                            (() => {
                                const styles = getStatusStyles(results.cloudinary.status);
                                const Icon = styles.icon;
                                return (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${styles.bg}`}>
                                        <Icon size={12} />
                                        <span>{results.cloudinary.status}</span>
                                    </div>
                                );
                            })()
                        ) : (
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] px-3 py-1 rounded-full">untested</span>
                        )}
                    </div>
                    <h4 className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-wider">Cloudinary CDN</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest mt-1">Image Storage Handshake</p>

                    <div className="mt-6 pt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Token Integrity</span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            {results?.cloudinary?.status === 'healthy' ? 'Verified' : '--'}
                        </span>
                    </div>
                    {results?.cloudinary?.error && (
                        <p className="text-[9px] font-bold text-rose-500 mt-2 truncate">{results.cloudinary.error}</p>
                    )}
                </div>
            </div>
        </Card>
    );
}
