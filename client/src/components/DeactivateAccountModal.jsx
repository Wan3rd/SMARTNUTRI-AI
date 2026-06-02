import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import { X, ShieldAlert, Lock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function DeactivateAccountModal({ isOpen, onClose }) {
    const { logout } = useAuth();
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: Info, 2: Password Confirmation
    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setIsClosing(false);
        } else {
            setIsMounted(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const triggerCloseAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    }, [onClose]);

    const deactivationReasons = [
        "Met child's health goals",
        "App is too complex",
        "Switching to another app",
        "Technical issues",
        "Not using it enough",
        "Other"
    ];

    React.useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setReason('');
            setError(null);
            setStep(1);
        }
    }, [isOpen]);

    if (!isOpen && !isMounted) return null;

    const handleDeactivate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await api.post('/auth/deactivate', { password, reason });
            if (res.data.success) {
                logout(); // Logout will redirect to login page
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to deactivate account. Please check your password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500 ease-out",
                isMounted && !isClosing ? "bg-black/60 backdrop-blur-md" : "bg-black/0 backdrop-blur-none"
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) triggerCloseAnimation();
            }}
        >
            <Card 
                className={cn(
                    "w-full max-w-md shadow-2xl border border-[var(--color-divider)] overflow-hidden rounded-3xl relative transition-all duration-500 ease-out transform",
                    isMounted && !isClosing ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Absolute Close Button */}
                <button
                    onClick={() => !loading && triggerCloseAnimation()}
                    disabled={loading}
                    className="absolute top-4 right-4 z-20 p-2 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 rounded-full transition-all duration-300 text-[var(--color-danger)] backdrop-blur-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <CardHeader className="bg-[var(--color-danger)]/10 border-b border-[var(--color-danger)]/20 p-6 pt-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--color-danger)]/10 rounded-xl text-[var(--color-danger)]">
                            <ShieldAlert size={20} />
                        </div>
                        <CardTitle className="text-[var(--color-danger)] font-black uppercase tracking-tight text-lg">Deactivate Account</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-8 bg-[var(--color-bg-card)]">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-[var(--color-warning)]/10 rounded-2xl border border-[var(--color-warning)]/30 flex gap-4">
                                    <AlertTriangle className="text-[var(--color-warning)] flex-shrink-0" size={24} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-[var(--color-warning)] uppercase tracking-widest">Clinical Data Notice</p>
                                        <p className="text-xs text-[var(--color-text-main)] font-medium leading-relaxed opacity-90">
                                            Deactivating your account will immediately stop all data tracking. Your clinical history will be archived for medical compliance.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Help us improve. Why are you leaving?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {deactivationReasons.map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => !loading && setReason(r)}
                                                disabled={loading}
                                                className={`p-3 text-[10px] font-bold text-left rounded-xl border transition-all disabled:opacity-50 ${reason === r
                                                    ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                                                    : 'bg-transparent border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)]/30'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    disabled={!reason || loading}
                                    className="w-full py-4 border-2 border-[var(--color-danger)]/30 text-[var(--color-danger)] bg-transparent hover:bg-[var(--color-danger)]/10 font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-none hover:shadow-md disabled:opacity-30 disabled:hover:bg-transparent"
                                    onClick={() => setStep(2)}
                                >
                                    Proceed to Confirmation
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]"
                                    onClick={triggerCloseAnimation}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleDeactivate} className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="text-center space-y-2">
                                <p className="text-sm font-bold text-[var(--color-text-main)]">Security Check</p>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium">Please enter your password to confirm deactivation.</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-2xl text-[10px] font-black text-center uppercase tracking-widest border border-[var(--color-danger)]/30">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        disabled={loading}
                                        className="w-full p-4 pl-12 rounded-2xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] dark:bg-black/20 text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] transition-all shadow-inner disabled:opacity-50"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white shadow-lg shadow-[var(--color-danger)]/20 rounded-2xl font-black uppercase tracking-widest text-[10px] flex justify-center items-center gap-2"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" size={16} /> Deactivating...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Confirm Deactivation <ArrowRight size={16} />
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={loading}
                                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] disabled:opacity-50"
                                    onClick={() => !loading && setStep(1)}
                                >
                                    Back
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
