import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Brain, ShieldAlert, Sparkles, ShieldCheck, Heart, ArrowRight, Activity, Users, FileCheck, Sun, Moon } from 'lucide-react';
import { Card } from '../components/common/Card';

export default function LandingPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [demoAllergy, setDemoAllergy] = useState('milk/dairy');
    const [demoFood, setDemoFood] = useState('Star Margarine');
    const [demoResult, setDemoResult] = useState({
        status: 'flagged',
        message: 'Allergy Warning: DAIRY (MARGARINE)',
        bypass: false
    });

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const handleAllergyChange = (newAllergy) => {
        setDemoAllergy(newAllergy);
        if (newAllergy === 'milk/dairy') {
            setDemoFood('Star Margarine');
        } else if (newAllergy === 'egg') {
            setDemoFood('Eggplant Omelet');
        } else if (newAllergy === 'peanut') {
            setDemoFood('Peanut Butter');
        }
    };

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    // Simple interactive demo logic inside landing page sandbox
    useEffect(() => {
        const allergy = demoAllergy.toLowerCase();
        const food = demoFood.toLowerCase();

        if (allergy === 'milk/dairy') {
            if (food.includes('margarine') || food.includes('parmesan') || food.includes('milk') || food.includes('butter') || food.includes('cheese')) {
                // Check plant milk bypass
                if (food.includes('coconut milk') || food.includes('soy milk') || food.includes('almond milk') || food.includes('oat milk')) {
                    setDemoResult({
                        status: 'compliant',
                        message: 'Safe (Coconut/Soy/Almond milk bypassed)',
                        bypass: true
                    });
                } else {
                    setDemoResult({
                        status: 'flagged',
                        message: 'Allergy Warning: DAIRY (DERIVATIVE DETECTED)',
                        bypass: false
                    });
                }
            } else {
                setDemoResult({
                    status: 'compliant',
                    message: 'Nutritional Intake Compliant',
                    bypass: false
                });
            }
        } else if (allergy === 'egg') {
            if (food.includes('eggplant')) {
                setDemoResult({
                    status: 'compliant',
                    message: 'Safe (Eggplant bypassed for Egg allergy)',
                    bypass: true
                });
            } else if (food.includes('egg') || food.includes('mayonnaise') || food.includes('custard')) {
                setDemoResult({
                    status: 'flagged',
                    message: 'Allergy Warning: EGG (DERIVATIVE DETECTED)',
                    bypass: false
                });
            } else {
                setDemoResult({
                    status: 'compliant',
                    message: 'Nutritional Intake Compliant',
                    bypass: false
                });
            }
        } else if (allergy === 'peanut') {
            if (food.includes('peanut butter')) {
                setDemoResult({
                    status: 'flagged',
                    message: 'Allergy Warning: PEANUT (PEANUT BUTTER)',
                    bypass: false
                });
            } else {
                setDemoResult({
                    status: 'compliant',
                    message: 'Nutritional Intake Compliant',
                    bypass: false
                });
            }
        }
    }, [demoAllergy, demoFood]);

    return (
        <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)] overflow-x-hidden font-outfit mesh-emerald">
            {/* Header / Navbar */}
            <header className="w-full border-b border-[var(--color-divider)] bg-[var(--color-bg-card)]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-9 w-9 object-contain rounded-full shadow-sm" />
                        <span className="text-lg font-black text-[var(--color-secondary)] uppercase tracking-tighter">SmartNutri-AI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="p-2.5 rounded-xl hover:bg-[var(--color-bg-page)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border border-[var(--color-divider)] flex items-center justify-center shrink-0"
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <Link 
                            to="/login" 
                            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-[var(--color-primary)]/10"
                        >
                            Log In
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Sparkles size={12} /> Clinical AI Nutrition Station
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black text-[var(--color-text-main)] tracking-tight leading-[1.05] !font-outfit">
                        Pediatric Care <br />
                        <span className="text-[var(--color-primary)]">Enhanced by Clinical AI</span>
                    </h1>
                    <p className="text-sm sm:text-base text-[var(--color-text-muted)] font-medium leading-relaxed max-w-xl">
                        SMARTNUTRI-AI bridges the gap between Registered Nutritionist-Dietitians (RNDs) and Caregivers. It integrates advanced semantic allergen derivative mapping, clinical portion tracking, and strict HIPAA and DPA data privacy compliance auditing.
                    </p>
                    <div className="flex pt-2">
                        <Link 
                            to="/login"
                            className="h-14 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] transition-all w-full sm:w-auto"
                        >
                            Access Care Portal <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>

                {/* Hero Illustration: Semantic Allergen Matcher Sandbox */}
                <div className="lg:col-span-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/20 to-amber-500/20 rounded-[3rem] blur-3xl opacity-30 -z-10" />
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] p-6 shadow-2xl bg-[var(--color-bg-card)] max-w-md mx-auto space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                                    <Brain size={16} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">Clinical Engine Demo</span>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Child's Allergy</label>
                                <select 
                                    value={demoAllergy}
                                    onChange={(e) => handleAllergyChange(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-xl outline-none font-bold text-xs"
                                >
                                    <option value="milk/dairy">Milk / Dairy</option>
                                    <option value="egg">Eggs</option>
                                    <option value="peanut">Peanuts</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Analyzed Food Intake</label>
                                <select 
                                    value={demoFood}
                                    onChange={(e) => setDemoFood(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-xl outline-none font-bold text-xs"
                                >
                                    {demoAllergy === 'milk/dairy' && (
                                        <>
                                            <option value="Star Margarine">Star Margarine (Derivative Check)</option>
                                            <option value="Parmesan Cheese">Parmesan Cheese (Derivative Check)</option>
                                            <option value="Coconut Milk">Coconut Milk (Plant Bypass Check)</option>
                                            <option value="Steamed Rice">Steamed Rice (Safe)</option>
                                        </>
                                    )}
                                    {demoAllergy === 'egg' && (
                                        <>
                                            <option value="Eggplant Omelet">Eggplant Omelet (Egg check)</option>
                                            <option value="Eggplant Parmigiana">Eggplant Parmigiana (Eggplant Bypass)</option>
                                            <option value="French Fries">French Fries (Safe)</option>
                                        </>
                                    )}
                                    {demoAllergy === 'peanut' && (
                                        <>
                                            <option value="Peanut Butter">Peanut Butter (Peanut check)</option>
                                            <option value="Banana">Banana (Safe)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Interactive Status Indicator Box */}
                        <div className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                            demoResult.status === 'flagged' 
                                ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400' 
                                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                            <div className="mt-0.5 shrink-0">
                                {demoResult.status === 'flagged' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest">
                                    {demoResult.status === 'flagged' ? 'Clinical Warning Triggered' : 'Safety Check Verified'}
                                </h4>
                                <p className="text-xs font-black mt-1 leading-snug">{demoResult.message}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Platform Feature Pillars */}
            <section className="bg-[var(--color-bg-card)] border-y border-[var(--color-divider)] py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
                        <div className="h-10 w-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center rounded-2xl mx-auto">
                            <Activity size={20} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-[var(--color-text-main)] uppercase">Clinical Capabilities</h2>
                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                            Designed to meet dietitian requirements and secure pediatric clinical data.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Pillar 1: Semantic Allergen Engine */}
                        <div className="p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[2rem] space-y-4 hover:border-[var(--color-primary)]/30 hover:scale-[1.01] transition-all">
                            <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                                <Brain size={22} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Semantic Allergen Check</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                Beyond simple word matches, SMARTNUTRI-AI utilizes semantic maps to detect hidden biological derivatives (e.g. *margarine* triggering *milk/dairy* alerts) while employing clinical bypasses for plant-based milks and eggplants.
                            </p>
                        </div>

                        {/* Pillar 2: Regulatory Auditing & Immutability */}
                        <div className="p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[2rem] space-y-4 hover:border-[var(--color-primary)]/30 hover:scale-[1.01] transition-all">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <ShieldCheck size={22} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">HIPAA & DPA Security</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                Extended database compiler rules enforce absolute ORM-level immutability on audit trails. Every PHI read or update action is strictly monitored and locked down to ensure absolute legal compliance.
                            </p>
                        </div>

                        {/* Pillar 3: Clinical Exchange Fulfillments */}
                        <div className="p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[2rem] space-y-4 hover:border-[var(--color-primary)]/30 hover:scale-[1.01] transition-all">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <FileCheck size={22} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Portion & Exchange Match</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                Connects dietary guidelines dynamically to parent-logged meals. Automatically maps nutrient composition estimates into structured Food Exchanges to track daily adherence logs instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stakeholder Roles Section */}
            <section className="max-w-7xl mx-auto px-6 py-20 space-y-16">
                <div className="text-center max-w-xl mx-auto space-y-2">
                    <h2 className="text-2xl font-black uppercase text-[var(--color-text-main)] tracking-tight">Tailored Portal Workflows</h2>
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">A dedicated experience for each clinical stakeholder.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Role 1: Registered Nutritionist Dietitian */}
                    <div className="p-8 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[2.5rem] flex flex-col sm:flex-row gap-6 items-start hover:shadow-xl transition-all">
                        <div className="p-4 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl shrink-0">
                            <Users size={28} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Clinical Dietitian Station</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                                Curate meal plans, configure customized pediatric nutrient targets, build portion matrices, and write ADIME diagnostic charts. Track real-time patient meal photos and verified Plate Waste logs.
                            </p>
                        </div>
                    </div>

                    {/* Role 2: Parent Caregiver */}
                    <div className="p-8 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[2.5rem] flex flex-col sm:flex-row gap-6 items-start hover:shadow-xl transition-all">
                        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                            <Heart size={28} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Caregiver Portal</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                                Upload meal photos for instant AI-based macronutrient estimation. Check meal compliance targets, receive clinical allergen warning banners, and record daily water and step logs.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full border-t border-[var(--color-divider)] bg-[var(--color-bg-card)] py-12 text-center text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-widest">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p>© {new Date().getFullYear()} SmartNutri-AI. All rights reserved.</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] rounded-full text-[9px]">HIPAA Compliant</span>
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] rounded-full text-[9px]">RA 10173 Compliant</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
