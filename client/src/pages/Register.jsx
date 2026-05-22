import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, FileUp, ShieldCheck } from 'lucide-react';
import TermsModal from '../components/common/TermsModal';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../lib/api';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'parent',
        professionalId: '',
        phone: '',
        clinic: '',
        licenseFile: null,
        termsAccepted: false
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, licenseFile: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (!formData.termsAccepted) {
            setError("You must accept the Terms & Conditions");
            setLoading(false);
            return;
        }

        // Check if email is already registered before proceeding to onboarding
        try {
            const checkRes = await api.get(`/auth/check-email?email=${encodeURIComponent(formData.email)}`);
            if (!checkRes.data.available) {
                setError("This email is already registered. Please use a different email or log in.");
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error("Email check failed:", err);
            setError("Unable to verify email availability. Please check your connection and try again.");
            setLoading(false);
            return;
        }

        // If parent, delay registration until onboarding is finished to prevent ghost accounts
        if (formData.role === 'parent') {
            navigate('/onboarding', { state: { registrationData: formData } });
            setLoading(false);
            return;
        }

        const res = await register(formData);

        if (res.success) {
            // Redirect based on role
            if (formData.role === 'nutritionist') {
                navigate('/');
            } else {
                navigate('/onboarding');
            }
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

            <Card className="w-full max-w-2xl glass rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10 relative z-10 overflow-hidden my-6 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="text-center space-y-2 pt-8 pb-4 px-6 sm:px-10">
                    <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="mx-auto h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full mb-2 bg-white shadow-sm border border-[var(--color-divider)]" />
                    <CardTitle className="text-2xl sm:text-4xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Join SmartNutri</CardTitle>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">Create your expert account</p>
                </CardHeader>
                <CardContent className="px-6 sm:px-10 pb-8">
                    {error && (
                        <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs text-center font-bold">
                            {error}
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="relative flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border border-[var(--color-divider)]">
                            <motion.div
                                className="absolute top-1 bottom-1 rounded-xl shadow-sm bg-white dark:bg-white/10"
                                layoutId="activeRoleBg"
                                initial={false}
                                animate={{
                                    left: formData.role === 'parent' ? '4px' : '50%',
                                    right: formData.role === 'parent' ? '50%' : '4px',
                                }}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'parent' })}
                                className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${formData.role === 'parent' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
                            >
                                Parent
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'nutritionist' })}
                                className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${formData.role === 'nutritionist' ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--color-text-muted)]'}`}
                            >
                                Nutritionist
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">{formData.role === 'nutritionist' ? 'Full Name' : "Parent's Full Name"}</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    required
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Contact Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="+63 9xx xxx xxxx"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={formData.role === 'nutritionist' ? 'col-span-1' : 'col-span-1 md:col-span-2'}>
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            {formData.role === 'nutritionist' && (
                                <>
                                    <div className="animate-in slide-in-from-right-4 duration-300">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">License / Professional ID</label>
                                        <input
                                            type="text"
                                            name="professionalId"
                                            required
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            placeholder="PRC-1234567"
                                            value={formData.professionalId}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="animate-in slide-in-from-right-4 duration-300 md:col-span-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Clinic / Hospital</label>
                                        <input
                                            type="text"
                                            name="clinic"
                                            required
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            placeholder="St. Luke's Medical Center"
                                            value={formData.clinic}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="animate-in slide-in-from-right-4 duration-300 md:col-span-2">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Upload License / PRC ID Photo (Optional)</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="license-upload"
                                            />
                                            <label 
                                                htmlFor="license-upload"
                                                className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${formData.licenseFile ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-[var(--color-divider)] hover:border-indigo-500 hover:bg-indigo-50/30'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${formData.licenseFile ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                        {formData.licenseFile ? <ShieldCheck size={20} /> : <FileUp size={20} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-[var(--color-text-main)] truncate max-w-[160px] sm:max-w-[200px]">
                                                            {formData.licenseFile ? formData.licenseFile.name : 'Choose ID Photo'}
                                                        </p>
                                                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">JPG, PNG or PDF (Max 5MB)</p>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-200">Browse</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 mb-1 block">Confirm Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    required
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-2 select-none">
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)] cursor-pointer"
                                />
                                <label htmlFor="terms" className="text-xs text-[var(--color-text-muted)] select-none">
                                    I agree to the <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-[var(--color-primary)] font-black hover:underline cursor-pointer">Terms & Conditions</button>
                                </label>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full sm:w-auto px-8 h-14 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform text-sm" 
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </div>
                    </form>

                    <div className="text-center text-xs text-[var(--color-text-muted)] mt-8 font-semibold">
                        Already have an account? <Link to="/login" className="text-[var(--color-primary)] font-black hover:underline">Sign in</Link>
                    </div>
                </CardContent>
            </Card>

            <TermsModal 
                isOpen={isTermsModalOpen} 
                onClose={() => setIsTermsModalOpen(false)} 
            />
        </div>
    );
}
