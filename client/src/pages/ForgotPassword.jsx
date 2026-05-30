import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Mail, ArrowLeft, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [submitted, setSubmitted] = useState(false);
    
    // Resend Logic State
    const [resendTimer, setResendTimer] = useState(0);
    const [resendAttempts, setResendAttempts] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (resendTimer > 0) {
            timerRef.current = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [resendTimer]);

    const startResendTimer = () => {
        setResendTimer(60); // 1 minute
    };

    const handleSubmit = async (e, isResend = false) => {
        if (e) e.preventDefault();
        
        if (isResend && resendAttempts >= 3) {
            setMessage({ type: 'error', text: 'Too many attempts. Please try again later.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage({ type: 'success', text: res.data.message });
            setSubmitted(true);
            startResendTimer();
            if (isResend) {
                setResendAttempts(prev => prev + 1);
            }
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Something went wrong. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center sm:p-4 sm:p-6 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#0f172a] dark:to-[#020617] transition-all duration-500 overflow-y-auto">
            <div className="w-full sm:max-w-md animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-8 flex flex-col items-center hidden sm:flex">
                    <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-full mb-4 shadow-xl shadow-[var(--color-primary)]/20 bg-white" />
                    <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-primary)] uppercase tracking-tighter mb-1 leading-none">SmartNutri-AI</h1>
                    <p className="text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] opacity-70">Clinical Recovery System</p>
                </div>

                <Card className="border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[2.5rem] overflow-y-auto sm:overflow-hidden shadow-2xl shadow-[var(--color-primary)]/10 min-h-[100dvh] sm:min-h-0 flex flex-col justify-center">
                    <div className="text-center mb-6 flex flex-col items-center sm:hidden pt-10">
                        <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-16 w-16 object-contain rounded-full mb-3 shadow-xl shadow-[var(--color-primary)]/20 bg-white" />
                        <h1 className="text-2xl font-black text-[var(--color-primary)] uppercase tracking-tighter mb-0.5 leading-none">SmartNutri-AI</h1>
                        <p className="text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] text-[9px] opacity-70">Clinical Recovery System</p>
                    </div>
                    <CardContent className="p-8 sm:p-10">
                        {submitted ? (
                            <div className="text-center space-y-6">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-2xl font-black text-[var(--color-text-main)] uppercase tracking-tight">Check Your Inbox</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                        We've sent a secure recovery link to <span className="font-bold text-[var(--color-text-main)]">{email}</span>. Please follow the instructions in the email.
                                    </p>
                                    <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest bg-[var(--color-primary)]/5 py-2 px-4 rounded-full inline-block">
                                        Tip: Check your spam or junk folder
                                    </p>
                                </div>

                                <div className="space-y-3 pt-4">
                                    {resendAttempts < 3 ? (
                                        <Button
                                            onClick={(e) => handleSubmit(e, true)}
                                            disabled={loading || resendTimer > 0}
                                            className="w-full h-14 rounded-2xl border-2 border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all font-black uppercase tracking-widest text-[10px] gap-2 flex items-center justify-center bg-white/5 dark:bg-slate-800/50 disabled:opacity-100 disabled:text-[var(--color-text-muted)] disabled:border-[var(--color-divider)]"
                                        >
                                            {loading ? (
                                                <Loader2 className="animate-spin" size={14} />
                                            ) : resendTimer > 0 ? (
                                                <span className="flex items-center gap-2 opacity-70">
                                                    <Loader2 className="animate-spin" size={12} />
                                                    Resend in {resendTimer}s
                                                </span>
                                            ) : (
                                                <><RefreshCw size={14} /> Resend Link ({3 - resendAttempts} left)</>
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
                                            Max attempts reached. Try again later.
                                        </div>
                                    )}

                                    <Link to="/login" className="block w-full">
                                        <Button className="w-full h-14 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-[var(--color-primary)]/20">
                                            Back to Login
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                                <div className="space-y-2 text-center mb-8">
                                    <h2 className="text-2xl font-black text-[var(--color-text-main)] uppercase tracking-tight">Forgot Password?</h2>
                                    <p className="text-sm text-[var(--color-text-muted)]">No worries, it happens. Enter your clinical email and we'll send you a recovery link.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Clinical Email</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-gray-400/50"
                                            placeholder="doctor@smartnutri.com"
                                        />
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 rounded-2xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} /> Sending...
                                        </>
                                    ) : (
                                        'Send Recovery Link'
                                    )}
                                </Button>

                                <div className="text-center pt-4">
                                    <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] uppercase tracking-widest transition-colors">
                                        <ArrowLeft size={14} /> Back to Login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
