import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, FileUp, ShieldCheck } from 'lucide-react';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 sm:p-6 transition-colors duration-300 py-10 sm:py-20">
            <Card className="w-full max-w-2xl shadow-2xl border-0 dark:border dark:border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden">
                <CardHeader className="text-center space-y-2 pt-10 pb-4 px-6 sm:px-10">
                    <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="mx-auto h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full mb-2 bg-white shadow-sm border border-[var(--color-divider)]" />
                    <CardTitle className="text-2xl sm:text-4xl font-black text-[var(--color-secondary)] uppercase tracking-tight">Join SmartNutri</CardTitle>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] opacity-70">Create your expert account</p>
                </CardHeader>
                <CardContent className="px-6 sm:px-10 pb-10">
                    {error && (
                        <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-[var(--color-input-border)]">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'parent' })}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${formData.role === 'parent' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                            >
                                Parent
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'nutritionist' })}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${formData.role === 'nutritionist' ? 'bg-white dark:bg-white/10 text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                            >
                                Nutritionist
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">{formData.role === 'nutritionist' ? 'Full Name' : "Parent's Full Name"}</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Contact Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="+63 9xx xxx xxxx"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className={formData.role === 'nutritionist' ? 'col-span-1' : 'col-span-1 md:col-span-2'}>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            {formData.role === 'nutritionist' && (
                                <>
                                    <div className="animate-in slide-in-from-right-4 duration-300">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">License / Professional ID</label>
                                        <input
                                            type="text"
                                            name="professionalId"
                                            required
                                            className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            placeholder="PRC-1234567"
                                            value={formData.professionalId}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="animate-in slide-in-from-right-4 duration-300 md:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Clinic / Hospital</label>
                                        <input
                                            type="text"
                                            name="clinic"
                                            required
                                            className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                            placeholder="St. Luke's Medical Center"
                                            value={formData.clinic}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="animate-in slide-in-from-right-4 duration-300 md:col-span-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Upload License / PRC ID Photo</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="license-upload"
                                                required
                                            />
                                            <label 
                                                htmlFor="license-upload"
                                                className={`flex items-center justify-between w-full p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${formData.licenseFile ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-[var(--color-input-border)] hover:border-indigo-500 hover:bg-indigo-50/30'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${formData.licenseFile ? 'bg-emerald-500 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                                        {formData.licenseFile ? <ShieldCheck size={20} /> : <FileUp size={20} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-[var(--color-text-main)] truncate max-w-[200px]">
                                                            {formData.licenseFile ? formData.licenseFile.name : 'Choose ID Photo'}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">JPG, PNG or PDF (Max 5MB)</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 px-3 py-1 bg-indigo-100 rounded-lg group-hover:bg-indigo-200">Browse</span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block px-1">Confirm Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)]"
                                />
                                <label htmlFor="terms" className="text-sm text-[var(--color-text-muted)]">
                                    I agree to the <span className="text-[var(--color-primary)] hover:underline cursor-pointer">Terms & Conditions</span>
                                </label>
                            </div>

                            <Button type="submit" className="px-8 h-12 text-sm font-bold shadow-lg" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </div>
                    </form>

                    <div className="text-center text-sm text-[var(--color-text-muted)] mt-8">
                        Already have an account? <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">Sign in</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
