import React from 'react';
import { Card } from '../../components/common/Card';
import { BrainCircuit, ServerCrash, CheckCircle2, AlertTriangle, KeySquare } from 'lucide-react';

export default function AIHealthMonitor({ stats }) {
    if (!stats) return null;

    const { totalRequests, successfulRequests, failedRequests, lastUsedKeyIndex, failuresByKey } = stats;
    
    // Calculate success rate safely
    const successRate = totalRequests === 0 ? 100 : Math.round((successfulRequests / totalRequests) * 100);

    return (
        <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)] mt-8">
            <div className="p-6 sm:p-8 bg-zinc-900 text-white relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10">
                    <BrainCircuit size={200} />
                </div>
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                <BrainCircuit size={20} className="text-cyan-400" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">AI Infrastructure Health</h2>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm font-medium">Real-time monitoring of Gemini 2.5 Flash API performance and key rotation logic.</p>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                        <div className="flex flex-col items-end border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Status</span>
                            <div className="flex items-center gap-2">
                                <span className={`relative flex h-3 w-3`}>
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${successRate < 90 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${successRate < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                </span>
                                <span className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                    {successRate < 90 ? 'DEGRADED' : 'OPERATIONAL'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Active Key</span>
                            <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                <KeySquare size={14} className="text-violet-400" />
                                Key {lastUsedKeyIndex + 1}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-divider)]">
                <div className="p-6 sm:p-8 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                        <BrainCircuit size={14} /> Total Invocations
                    </div>
                    <div className="text-4xl font-black text-[var(--color-text-main)] tracking-tighter">
                        {totalRequests.toLocaleString()}
                    </div>
                </div>

                <div className="p-6 sm:p-8 flex flex-col gap-2 bg-emerald-500/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        <CheckCircle2 size={14} /> Successful Analyses
                    </div>
                    <div className="text-4xl font-black text-emerald-600 tracking-tighter">
                        {successfulRequests.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-emerald-600/70">{successRate}% Success Rate</div>
                </div>

                <div className="p-6 sm:p-8 flex flex-col gap-2 bg-rose-500/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600">
                        <ServerCrash size={14} /> Hard Failures
                    </div>
                    <div className="text-4xl font-black text-rose-600 tracking-tighter">
                        {failedRequests.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-rose-600/70">Failed to analyze completely</div>
                </div>
            </div>

            <div className="p-6 bg-[var(--color-bg-page)] border-t border-[var(--color-divider)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4">Key Rotation Burnout Tracking</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {failuresByKey.map((fails, index) => (
                        <div key={index} className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-divider)] flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${lastUsedKeyIndex === index ? 'bg-violet-500 text-white' : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)]'}`}>
                                    #{index + 1}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)]">API Key {index + 1}</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)]">{lastUsedKeyIndex === index ? 'Currently Active' : 'Standby / Exhausted'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 pl-2">
                                <span className={`text-sm font-black ${fails > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{fails}</span>
                                <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Rate Limits / Fails</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
