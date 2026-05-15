import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldAlert, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

export default function ForceChangePassword() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            return setError("Passwords do not match");
        }
        if (formData.newPassword.length < 8) {
            return setError("Password must be at least 8 characters");
        }

        setLoading(true);
        setError(null);

        try {
            const res = await api.post('/auth/change-password-force', {
                newPassword: formData.newPassword
            });

            if (res.data.success) {
                setSuccess(true);
                // Update local user state
                const updatedUser = { ...user, force_password_reset: false };
                updateUser(updatedUser);
                
                // Wait 2 seconds then redirect
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 transition-colors duration-300">
                <Card className="w-full max-w-md shadow-2xl border-0 dark:border dark:border-[var(--color-divider)] animate-in zoom-in duration-300">
                    <CardContent className="pt-12 pb-12 text-center space-y-6">
                        <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Security Updated!</h2>
                            <p className="text-[var(--color-text-muted)] text-sm font-medium">Your new secure password has been set. Redirecting you to your dashboard...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 transition-colors duration-300">
            <Card className="w-full max-w-md shadow-2xl border-0 dark:border dark:border-[var(--color-divider)]">
                <CardHeader className="text-center space-y-3 pb-6 pt-8">
                    <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-2">
                        <ShieldAlert size={32} />
                    </div>
                    <CardTitle className="text-2xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Security Action Required</CardTitle>
                    <p className="text-[var(--color-text-muted)] text-sm font-medium leading-relaxed px-4">
                        To protect your clinical data, please choose a new secure password for your account.
                    </p>
                </CardHeader>
                <CardContent className="pb-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold text-center border border-red-200 dark:border-red-900/50">
                            {error}
                        </div>
                    )}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1 mb-2 block">New Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="newPassword"
                                    required
                                    className="w-full p-3.5 pl-12 pr-12 rounded-2xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                    placeholder="Min. 8 characters"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1 mb-2 block">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    required
                                    className="w-full p-3.5 pl-12 pr-12 rounded-2xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                    placeholder="Repeat your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button type="submit" className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20" disabled={loading}>
                                {loading ? 'Updating Security...' : (
                                    <span className="flex items-center justify-center gap-2">
                                        Update Password <ArrowRight size={18} />
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Pro Tip Section */}
                    <div className="mt-8 p-4 bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 rounded-2xl border border-[var(--color-primary)]/20 border-dashed">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-[var(--color-primary)]">
                                <Activity size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wider mb-1">Personalization Tip</p>
                                <p className="text-xs text-[var(--color-text-main)] font-medium leading-tight">
                                    Did you know? You can switch between <span className="font-bold">Light and Dark mode</span> anytime in your account settings!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-8 pt-6 border-t border-[var(--color-divider)] border-dashed">
                        <button 
                            onClick={logout}
                            className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest hover:text-red-500 transition-colors"
                        >
                            Sign out and try later
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
