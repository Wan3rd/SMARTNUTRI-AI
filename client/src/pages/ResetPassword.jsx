import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Lock, Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setMessage({ type: 'error', text: 'Invalid or missing reset token.' });
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setMessage({ type: 'error', text: 'Passwords do not match.' });
        }
        if (password.length < 8) {
            return setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/auth/reset-password', { token, password });
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'Failed to reset password. The link may have expired.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] dark:from-[#0f172a] dark:to-[#020617] transition-all duration-500">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-8 flex flex-col items-center">
                    <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-full mb-4 shadow-xl shadow-[var(--color-primary)]/20 bg-white" />
                    <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-primary)] uppercase tracking-tighter mb-1 leading-none">SmartNutri-AI</h1>
                    <p className="text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] opacity-70">Secure Password Reset</p>
                </div>

                <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-[var(--color-primary)]/10">
                    <CardContent className="p-8 sm:p-10">
                        {isSuccess ? (
                            <div className="text-center space-y-6">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                                    <ShieldCheck size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-[var(--color-text-main)] uppercase tracking-tight">Success!</h2>
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Your password has been successfully reset. You will be redirected to the login page in a moment.
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--color-primary)] animate-[progress_3s_linear]" />
                                    </div>
                                </div>
                                <Link to="/login" className="block text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mt-4 hover:underline">
                                    Click here if not redirected
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2 text-center mb-8">
                                    <h2 className="text-2xl font-black text-[var(--color-text-main)] uppercase tracking-tight">New Password</h2>
                                    <p className="text-sm text-[var(--color-text-muted)]">Choose a strong, unique password for your clinical account.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full h-14 pl-12 pr-12 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wide flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading || !token}
                                    className="w-full h-14 rounded-2xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} /> Resetting...
                                        </>
                                    ) : (
                                        'Set New Password'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
