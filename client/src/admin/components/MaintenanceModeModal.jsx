import React, { useEffect } from 'react';
import { Wrench, ShieldAlert, X, Users, BrainCircuit, AlertTriangle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function MaintenanceModeModal({ isOpen, onClose, onConfirm, currentlyEnabled, isLoading }) {
    const enabling = !currentlyEnabled;

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const enableEffects = [
        {
            icon: Users,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10 border-rose-500/20',
            label: 'All Non-Admin Users Blocked',
            desc: 'Parents and Nutritionists will instantly receive a 503 error on their next API call and be redirected to the Maintenance page. Active sessions will be interrupted.'
        },
        {
            icon: BrainCircuit,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10 border-amber-500/20',
            label: 'AI Services Suspended',
            desc: 'Meal analysis, AI Kitchen, and nutritional AI recommendations will be unreachable for all regular users until maintenance is disabled.'
        },
        {
            icon: ShieldCheck,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            label: 'Admin Access Preserved',
            desc: 'You and all other Administrators can continue to access the Admin Console, manage users, and disable maintenance mode at any time from Settings.'
        },
        {
            icon: Zap,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10 border-blue-500/20',
            label: 'Instant — No Restart Required',
            desc: 'The switch is in-memory and takes effect immediately on the running server. No deployment or restart is needed to enable or disable it.'
        }
    ];

    const disableEffects = [
        {
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            label: 'All Users Regain Access',
            desc: 'Parents and Nutritionists can immediately log in and resume using SmartNutri-AI. Their sessions and data are fully intact.'
        },
        {
            icon: BrainCircuit,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10 border-blue-500/20',
            label: 'AI Services Restored',
            desc: 'Meal analysis, AI Kitchen, and all Gemini-powered features will be available again for all users as soon as this is confirmed.'
        },
        {
            icon: Zap,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10 border-violet-500/20',
            label: 'Instant — No Restart Required',
            desc: 'The change takes effect immediately. No deployment needed.'
        }
    ];

    const effects = enabling ? enableEffects : disableEffects;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:bg-black/70 sm:backdrop-blur-md sm:p-4 animate-in sm:fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300">
            <div className="w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-y-auto bg-[var(--color-bg-card)] sm:rounded-[2.5rem] border-0 sm:border-2 sm:border-[var(--color-divider)] shadow-none sm:shadow-2xl flex flex-col">

                {/* Header */}
                <div className={`p-6 sm:p-8 shrink-0 ${enabling ? 'bg-rose-600' : 'bg-emerald-600'} relative overflow-hidden`}>
                    {/* Decorative background icon */}
                    <div className="absolute -right-6 -bottom-6 opacity-10">
                        <Wrench size={120} />
                    </div>

                    <div className="relative flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                    {enabling ? <ShieldAlert size={22} className="text-white" /> : <CheckCircle2 size={22} className="text-white" />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                                    {enabling ? 'Emergency Control' : 'System Restoration'}
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                {enabling ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
                            </h2>
                            <p className="text-white/70 text-sm font-medium mt-2 max-w-sm">
                                {enabling
                                    ? 'This will immediately block all regular users from accessing the platform. Read the consequences below carefully.'
                                    : 'This will restore full access to all users. The platform will resume normal operations immediately.'
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-9 w-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors shrink-0 mt-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Warning Banner (enable only) */}
                {enabling && (
                    <div className="mx-6 sm:mx-8 mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 shrink-0">
                        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-600 leading-relaxed">
                            <span className="font-black">Warning:</span> This is a live production action. All currently active user sessions will be disrupted on their next request. Make sure your maintenance work is ready before proceeding.
                        </p>
                    </div>
                )}

                {/* Effects List */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                        What will happen:
                    </p>

                    <div className="space-y-3">
                        {effects.map((effect, i) => (
                            <div key={i} className={`p-4 rounded-2xl border ${effect.bg} flex gap-4`}>
                                <div className={`h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 ${effect.color}`}>
                                    <effect.icon size={18} />
                                </div>
                                <div>
                                    <div className={`text-xs font-black uppercase tracking-wide ${effect.color} mb-1`}>
                                        {effect.label}
                                    </div>
                                    <div className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed">
                                        {effect.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 sm:p-8 pt-0 flex flex-col sm:flex-row gap-3 shrink-0 pb-10 sm:pb-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-[var(--color-divider)] text-[var(--color-text-muted)] font-black uppercase tracking-widest text-xs hover:bg-[var(--color-bg-page)] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3.5 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2
                            ${enabling
                                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {enabling ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
                                {enabling ? 'Yes, Enable Maintenance' : 'Yes, Restore Access'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
