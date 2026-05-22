import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await login(formData.email, formData.password, rememberMe);

        if (res.success) {
            navigate('/');
        } else {
            setError(res.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden">
            {/* Mesh Background */}
            <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20">
                <div className="absolute inset-0 mesh-emerald opacity-60" />
            </div>

            <Card className="w-full max-w-md glass rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10 relative z-10 overflow-hidden my-6 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="text-center space-y-1 pb-4 pt-6 sm:pt-8">
                    <div className="relative mx-auto h-20 w-20 sm:h-28 sm:w-28 mb-4">
                        <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-full w-full object-contain rounded-full bg-white shadow-sm border border-[var(--color-divider)]" />
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Welcome Back</CardTitle>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">Sign in to SmartNutri-AI</p>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs text-center font-bold">
                            {error}
                        </div>
                    )}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    className="w-full p-4 pr-12 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2 select-none">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                />
                                <label htmlFor="rememberMe" className="cursor-pointer select-none font-black uppercase tracking-widest text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">Remember me</label>
                            </div>
                            <Link to="/forgot-password" title="Recover your account" className="text-[var(--color-primary)] font-black uppercase tracking-widest text-[9px] hover:underline">
                                Forgot Password?
                            </Link>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-14 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform text-sm" 
                            disabled={loading}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="text-center text-xs text-[var(--color-text-muted)] mt-6 font-semibold">
                        Don't have an account? <Link to="/register" className="text-[var(--color-primary)] font-black hover:underline">Sign up</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
