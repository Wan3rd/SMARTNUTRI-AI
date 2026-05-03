import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

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
        termsAccepted: false
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 transition-colors duration-300">
            <Card className="w-full max-w-md shadow-lg border-0 dark:border dark:border-[var(--color-divider)]">
                <CardHeader className="text-center space-y-2 pb-6">
                    <div className="mx-auto h-12 w-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-white font-bold text-xl mb-2">S</div>
                    <CardTitle className="text-2xl text-[var(--color-secondary)]">Join SmartNutri</CardTitle>
                    <p className="text-[var(--color-text-muted)]">Sign up as a parent or nutritionist.</p>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-[var(--color-divider)]">
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

                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-main)]">{formData.role === 'nutritionist' ? 'Full Name' : "Parent's Full Name"}</label>
                            <input
                                type="text"
                                name="fullName"
                                required
                                className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                placeholder={formData.role === 'nutritionist' ? "Dr. Maria Santos" : "John Doe"}
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>
                        {formData.role === 'nutritionist' && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="text-sm font-medium text-[var(--color-text-main)]">Nutritionist License / ID</label>
                                <input
                                    type="text"
                                    name="professionalId"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="PRC-1234567"
                                    value={formData.professionalId}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-main)]">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <label className="text-sm font-medium text-[var(--color-text-main)]">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="text-sm font-medium text-[var(--color-text-main)]">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

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

                        <Button type="submit" className="w-full size-lg text-base mt-2" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Continue to Setup'}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-[var(--color-text-muted)] mt-4">
                        Already have an account? <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">Sign in</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
