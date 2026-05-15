import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Button } from './common/Button';
import { X, ShieldAlert, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function DeactivateAccountModal({ isOpen, onClose }) {
    const { logout } = useAuth();
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: Info, 2: Password Confirmation

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

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-md shadow-2xl border-0 dark:border dark:border-red-900/30 overflow-hidden rounded-3xl animate-in zoom-in duration-300 relative">
                {/* Absolute Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-20 p-2 bg-red-100/50 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-800/40 rounded-full transition-all duration-300 text-red-600 dark:text-red-400 backdrop-blur-sm group"
                >
                    <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <CardHeader className="bg-red-50/80 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/20 p-6 pt-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                            <ShieldAlert size={20} />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400 font-black uppercase tracking-tight text-lg">Deactivate Account</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-8 bg-[var(--color-bg-card)]">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-4">
                                    <AlertTriangle className="text-amber-600 dark:text-amber-500 flex-shrink-0" size={24} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Clinical Data Notice</p>
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
                                                onClick={() => setReason(r)}
                                                className={`p-3 text-[10px] font-bold text-left rounded-xl border transition-all ${reason === r 
                                                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400' 
                                                    : 'bg-transparent border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-red-200 dark:hover:border-red-500/20'}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button 
                                    disabled={!reason}
                                    className="w-full py-4 border-2 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-none hover:shadow-md disabled:opacity-30 disabled:hover:bg-transparent"
                                    onClick={() => setStep(2)}
                                >
                                    Proceed to Confirmation
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]"
                                    onClick={onClose}
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
                                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest border border-red-200 dark:border-red-900/50">
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
                                        className="w-full p-4 pl-12 rounded-2xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] dark:bg-black/20 text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-inner"
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
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                                >
                                    {loading ? 'Deactivating...' : (
                                        <span className="flex items-center justify-center gap-2">
                                            Confirm Deactivation <ArrowRight size={16} />
                                        </span>
                                    )}
                                </Button>
                                <Button 
                                    type="button"
                                    variant="ghost" 
                                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]"
                                    onClick={() => setStep(1)}
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
