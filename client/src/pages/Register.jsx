import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, FileUp, ShieldCheck, Lock, Timer, Check, Copy, Sparkles, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import TermsModal from '../components/common/TermsModal';
import { motion, AnimatePresence } from 'framer-motion';

import api from '../lib/api';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    // Clinical OTP Verification Flow States
    const [otpMode, setOtpMode] = useState(false);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(120); // 2 minutes
    const [otpError, setOtpError] = useState(null);
    const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);

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

    // 1. OTP Countdown Timer Effect
    React.useEffect(() => {
        let timer;
        if (otpMode && otpTimer > 0) {
            timer = setInterval(() => {
                setOtpTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [otpMode, otpTimer]);

    // 2. Autofocus first field when OTP Modal opens
    React.useEffect(() => {
        if (otpMode) {
            setTimeout(() => {
                const firstInput = document.getElementById('otp-input-0');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }, [otpMode]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, licenseFile: e.target.files[0] });
    };

    // Helper: Send OTP via Server-Side SendGrid Mailer
    const sendOtpEmailService = async () => {
        setLoading(true);
        setError(null);
        setOtpError(null);
        setOtpDigits(['', '', '', '', '', '']);
        
        try {
            const response = await api.post('/auth/send-otp', {
                email: formData.email,
                fullName: formData.fullName
            });
            
            if (response.data.success) {
                setOtpTimer(120); // Reset timer to 2 minutes
                setOtpMode(true);
            } else {
                setError(response.data.message || "Failed to dispatch verification email.");
            }
        } catch (err) {
            console.error("OTP send failed:", err);
            setError(err.response?.data?.message || "Failed to send verification email. Please check your connection or email details.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return;
        
        const newDigits = [...otpDigits];
        newDigits[index] = value.substring(value.length - 1);
        setOtpDigits(newDigits);
        setOtpError(null);
        
        // Auto focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            const newDigits = [...otpDigits];
            
            if (!otpDigits[index] && index > 0) {
                newDigits[index - 1] = '';
                setOtpDigits(newDigits);
                const prevInput = document.getElementById(`otp-input-${index - 1}`);
                if (prevInput) prevInput.focus();
            } else {
                newDigits[index] = '';
                setOtpDigits(newDigits);
            }
            setOtpError(null);
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(pastedData)) {
            const newDigits = pastedData.split('');
            setOtpDigits(newDigits);
            const lastInput = document.getElementById('otp-input-5');
            if (lastInput) lastInput.focus();
        }
    };

    const handleResendOtp = async () => {
        setOtpError(null);
        setOtpDigits(['', '', '', '', '', '']);
        try {
            const response = await api.post('/auth/send-otp', {
                email: formData.email,
                fullName: formData.fullName
            });
            if (response.data.success) {
                setOtpTimer(120);
                setOtpError("A new verification code has been sent!");
            }
        } catch (err) {
            setOtpError(err.response?.data?.message || "Failed to resend code. Please try again.");
        }
    };

    const formatTimer = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleOtpSubmit = async (e) => {
        if (e) e.preventDefault();
        const enteredOtp = otpDigits.join('');
        
        if (enteredOtp.length !== 6) {
            setOtpError("Please enter all 6 digits of the verification code.");
            return;
        }
        
        if (otpTimer === 0) {
            setOtpError("Verification code has expired. Please click 'Resend Code'.");
            return;
        }
        
        setIsOtpSubmitting(true);
        setOtpError(null);
        
        try {
            const verifyRes = await api.post('/auth/verify-otp', {
                email: formData.email,
                otpCode: enteredOtp
            });

            if (verifyRes.data.success) {
                if (formData.role === 'parent') {
                    setIsOtpSubmitting(false);
                    setOtpMode(false);
                    navigate('/onboarding', { state: { registrationData: formData } });
                } else {
                    const res = await register(formData);
                    setIsOtpSubmitting(false);
                    if (res.success) {
                        setOtpMode(false);
                        navigate('/');
                    } else {
                        setOtpError(res.message || "Failed to create practitioner account. Please try again.");
                    }
                }
            }
        } catch (err) {
            console.error("OTP verification error:", err);
            setOtpError(err.response?.data?.message || "Invalid verification code. Please try again.");
            setIsOtpSubmitting(false);
        }
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

        // Strong password policy validation
        const password = formData.password;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        if (password.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
            setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
            setLoading(false);
            return;
        }

        if (!formData.termsAccepted) {
            setError("You must accept the Terms & Conditions");
            setLoading(false);
            return;
        }

        // Check if email is already registered before proceeding
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

        // Email is available, trigger SendGrid OTP verification
        sendOtpEmailService();
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
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 rounded-2xl text-xs font-bold text-center">
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
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        required
                                        className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
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

            {/* OTP Verification Modal */}
            <AnimatePresence>
                {otpMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="w-full max-w-md bg-white dark:bg-[var(--color-bg-card)] rounded-[2.5rem] p-8 shadow-2xl border border-white/40 dark:border-white/10 relative overflow-hidden flex flex-col justify-center animate-in fade-in zoom-in-95 duration-300"
                        >
                            {/* Visual Accent */}
                            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10">
                                <div className="absolute inset-0 mesh-emerald opacity-60" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="text-center space-y-3">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[var(--color-primary)] flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/5">
                                        <Lock className="h-8 w-8 text-[var(--color-primary)] animate-pulse" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Security Check</h2>
                                    <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em] opacity-75">
                                        We've sent a 6-digit verification code to
                                    </p>
                                    <p className="text-xs font-black text-[var(--color-text-main)] truncate max-w-full px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--color-divider)] inline-block">
                                        {formData.email}
                                    </p>
                                </div>

                                {otpError && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2"
                                    >
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {otpError}
                                    </motion.div>
                                )}

                                <form onSubmit={handleOtpSubmit} className="space-y-6">
                                    {/* 6-Digit Entry Fields */}
                                    <div className="flex justify-between gap-2 max-w-xs mx-auto">
                                        {otpDigits.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-input-${idx}`}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength="1"
                                                required
                                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-black rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all shadow-sm"
                                                value={digit}
                                                onChange={(e) => handleOtpChange(e, idx)}
                                                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                                onPaste={handleOtpPaste}
                                            />
                                        ))}
                                    </div>

                                    {/* Timer & Cooldown */}
                                    <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                        <Timer className={`h-4 w-4 ${otpTimer <= 15 ? 'text-red-500 animate-bounce' : 'text-[var(--color-primary)]'}`} />
                                        <span className={otpTimer <= 15 ? 'text-red-500 font-extrabold' : 'text-[var(--color-text-muted)]'}>
                                            {otpTimer > 0 ? (
                                                <>Code expires in: <span className="font-mono">{formatTimer(otpTimer)}</span></>
                                            ) : (
                                                "Code has expired"
                                            )}
                                        </span>
                                    </div>

                                    {/* Spam Check Notice */}
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
                                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-normal text-center flex items-center justify-center gap-1.5">
                                            <AlertCircle size={12} className="text-amber-500 shrink-0" />
                                            Don't see the email? Please check your <strong className="font-black underline">Spam / Junk</strong> folder.
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-3">
                                        <Button
                                            type="submit"
                                            className="w-full h-14 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform text-sm flex items-center justify-center gap-2"
                                            disabled={isOtpSubmitting}
                                        >
                                            {isOtpSubmitting ? (
                                                <>Verifying...</>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="h-5 w-5" />
                                                    Verify & Complete
                                                </>
                                            )}
                                        </Button>

                                        <div className="flex items-center justify-between gap-4 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setOtpMode(false)}
                                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors py-2 cursor-pointer"
                                            >
                                                <ArrowLeft className="h-3 w-3" />
                                                Edit Details
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] disabled:text-[var(--color-text-muted)] hover:underline transition-colors py-2 flex items-center gap-1 cursor-pointer"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Resend Code
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
