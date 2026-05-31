import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from './common/Button';
import { Card, CardContent } from './common/Card';
import api from '../lib/api';

export default function ChangePasswordModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (loading || message.type === 'success') return;

        if (formData.newPassword !== formData.confirmPassword) {
            return setMessage({ type: 'error', text: 'New passwords do not match' });
        }

        // Strong password policy validation
        const password = formData.newPassword;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        if (password.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
            return setMessage({
                type: 'error',
                text: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
            });
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully' });

            setTimeout(() => {
                onClose();
                setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setMessage({ type: '', text: '' });
                setLoading(false);
            }, 2500);
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to update password'
            });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md animate-in zoom-in duration-300">
                <Card className="border-2 border-[var(--color-divider)] rounded-[32px] overflow-hidden shadow-2xl">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-[var(--color-success)]/10 text-[var(--color-success)]">
                                    <ShieldCheck size={20} />
                                </div>
                                <h2 className="text-xl font-black text-[var(--color-text-main)] uppercase tracking-tight">Security Update</h2>
                            </div>
                            <button
                                onClick={() => !(loading || message.type === 'success') && onClose()}
                                disabled={loading || message.type === 'success'}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <fieldset disabled={loading || message.type === 'success'} className="space-y-5 border-none p-0 m-0">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Current Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            required
                                            value={formData.currentPassword}
                                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                            className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            required
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                            className="w-full h-12 pl-11 pr-11 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            disabled={loading || message.type === 'success'}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                                        >
                                            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                                        <input
                                            type={showPasswords ? "text" : "password"}
                                            required
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onClose}
                                        className="flex-1 h-12 rounded-xl"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading || message.type === 'success'}
                                        className="flex-[2] h-12 rounded-xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-80"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : message.type === 'success' ? (
                                            'Updated!'
                                        ) : (
                                            'Update Password'
                                        )}
                                    </Button>
                                </div>
                            </fieldset>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
