import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Brain, ShieldAlert, Sparkles, ShieldCheck, Heart, ArrowRight, Activity, Users, FileCheck, Sun, Moon, Mail, Copy, Send, CheckCircle2, MessageSquare, Clock, GlobeLock, X, Menu, ChevronRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { motion, AnimatePresence } from 'framer-motion';
import config from '@config';

const faqData = [
    {
        question: "Is my child's medical and nutritional data secure?",
        answer: "Absolutely. SmartNutri-AI complies fully with HIPAA and the Data Privacy Act of 2012 (RA 10173). All Protected Health Information (PHI) is encrypted in transit and at rest. Furthermore, database-level rules enforce absolute immutability on audit logs, meaning all user access tracking cannot be altered or deleted."
    },
    {
        question: "How accurate is the AI portion estimation?",
        answer: "The AI portion estimation leverages advanced computer vision models to parse meal photos and estimate macronutrient profiles (protein, fats, carbs). These estimations serve as clinical guides and are automatically mapped into structured Food Exchanges. RNDs verify and adjust these logs during follow-ups to maintain clinical accuracy."
    },
    {
        question: "How do Registered Nutritionist-Dietitians (RNDs) configure rules?",
        answer: "Registered Nutritionist-Dietitians have access to a dedicated Clinical Dietitian Station. From there, they configure specific nutrient targets, meal templates, and custom portion matrices for each child. RNDs can set warning thresholds for pediatric allergens and verify plate waste metrics directly from the patient details view."
    },
    {
        question: "How do caregivers get assigned to a clinical dietitian?",
        answer: "Caregivers register a Parent account and complete the onboarding checklist for their child. From their dashboard, they can request connection or automatically be assigned to an approved clinical dietitian practicing on the platform. The dietitian then reviews the child's profile to formulate custom portion targets."
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { type: "spring", stiffness: 100 } 
    }
};

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
    
    const [activeFaq, setActiveFaq] = useState(null);
    const [activeSection, setActiveSection] = useState('hero');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [clickedSection, setClickedSection] = useState(null);

    const handleSectionRedirect = (sectionId) => {
        setClickedSection(sectionId);
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            setClickedSection(null);
        }, 1000);
    };

    useEffect(() => {
        const sections = ['hero', 'how-it-works', 'capabilities', 'workflows', 'faq', 'contact'];
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => {
            sections.forEach((id) => {
                const el = document.getElementById(id);
                if (el) observer.unobserve(el);
            });
        };
    }, []);

    const [contactForm, setContactForm] = useState({ name: '', email: '', role: 'caregiver', subject: '', message: '' });
    const [submittedForm, setSubmittedForm] = useState({ name: '', email: '', role: 'caregiver', subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const apiUrl = config?.server?.apiUrl || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/support/ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactForm)
            });

            const data = await response.json();

            if (response.ok) {
                // Keep record of submitted data for copy options
                setSubmittedForm({ ...contactForm });
                setShowSuccessModal(true);
                // Clear active fields
                setContactForm({ name: '', email: '', role: 'caregiver', subject: '', message: '' });
            } else {
                alert(data.error || 'Failed to submit ticket. Please check your inputs.');
            }
        } catch (err) {
            console.error('Error submitting support ticket:', err);
            alert('A network error occurred. Please try again or email us directly at snutri244@gmail.com.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getClipboardText = () => {
        const border = "==================================================";
        const subBorder = "--------------------------------------------------";
        const dateStr = new Date().toLocaleString();
        
        return `${border}
SMARTNUTRI-AI SUPPORT TICKET RECEIPT
${border}
Ticket Status:  SUBMITTED (AUTO-DISPATCHED)
Date Submitted: ${dateStr}
Support Inbox:  snutri244@gmail.com
${subBorder}
SENDER DETAILS:
  Name:  ${submittedForm.name}
  Email: ${submittedForm.email || 'N/A'}
  Role:  ${submittedForm.role.toUpperCase()}

TICKET DETAILS:
  Subject: ${submittedForm.subject}
  
MESSAGE BODY:
${submittedForm.message}
${subBorder}
Thank you for reaching out to SmartNutri-AI. 
Your inquiry is safely queued in our clinical queue.
${border}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getClipboardText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleCopyEmail = () => {
        navigator.clipboard.writeText('snutri244@gmail.com');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        <div className="min-h-screen lg:h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)] overflow-x-hidden lg:overflow-y-auto lg:snap-y lg:snap-mandatory lg:scroll-smooth lg:scroll-pt-16 font-outfit mesh-emerald">
            {/* Header / Navbar */}
            <header className="w-full border-b border-[var(--color-divider)] bg-[var(--color-bg-card)]/80 backdrop-blur-md fixed top-0 left-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/SmartNutri-logo.png" alt="SmartNutri Logo" className="h-9 w-9 object-contain rounded-full shadow-sm" />
                        <span className="text-sm xs:text-base sm:text-lg font-black text-[var(--color-secondary)] uppercase tracking-tighter">SmartNutri-AI</span>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-4">
                        {[
                            { id: 'hero', label: 'Home' },
                            { id: 'how-it-works', label: 'Ecosystem' },
                            { id: 'capabilities', label: 'Capabilities' },
                            { id: 'workflows', label: 'Workflows' },
                            { id: 'faq', label: 'FAQ' },
                            { id: 'contact', label: 'Contact' }
                        ].map((item) => (
                            <a 
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSectionRedirect(item.id);
                                }}
                                className="relative py-1.5 px-3 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center"
                            >
                                <span className={`relative z-10 transition-colors duration-300 ${
                                    activeSection === item.id 
                                        ? 'text-[var(--color-primary)]' 
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                                }`}>
                                    {item.label}
                                </span>
                                {activeSection === item.id && (
                                    <motion.span 
                                        layoutId="activeHeaderTab"
                                        className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full z-0"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="p-2 sm:p-2.5 rounded-xl hover:bg-[var(--color-bg-page)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border border-[var(--color-divider)] flex items-center justify-center shrink-0"
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        </button>
                        <Link 
                            to="/login" 
                            className="hidden sm:inline-flex px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-[var(--color-primary)]/10"
                        >
                            Log In
                        </Link>
                        {/* Hamburger Button (Mobile Only) */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="flex md:hidden p-2 rounded-xl hover:bg-[var(--color-bg-page)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border border-[var(--color-divider)] items-center justify-center shrink-0"
                            aria-label="Toggle Menu"
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer Navigation */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className="fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                            />
                            {/* Slide-out Panel */}
                            <motion.div 
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'tween', duration: 0.3 }}
                                className="fixed top-16 right-0 bottom-0 w-64 z-50 bg-[var(--color-bg-card)] border-l border-[var(--color-divider)] shadow-2xl flex flex-col p-6 space-y-6 md:hidden"
                            >
                                <div className="flex flex-col gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-divider)] pb-2">Navigate</span>
                                    {[
                                        { id: 'hero', label: 'Home' },
                                        { id: 'how-it-works', label: 'Ecosystem' },
                                        { id: 'capabilities', label: 'Capabilities' },
                                        { id: 'workflows', label: 'Workflows' },
                                        { id: 'faq', label: 'FAQ' },
                                        { id: 'contact', label: 'Contact' }
                                    ].map((item) => (
                                        <a 
                                            key={item.id}
                                            href={`#${item.id}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleSectionRedirect(item.id);
                                                setMobileMenuOpen(false);
                                            }}
                                            className={`text-sm font-black uppercase tracking-wider py-1.5 transition-colors flex items-center justify-between ${
                                                activeSection === item.id 
                                                    ? 'text-[var(--color-primary)]' 
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                            }`}
                                        >
                                            {item.label}
                                            <ChevronRight size={14} className="opacity-50" />
                                        </a>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 pt-4 border-t border-[var(--color-divider)]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Session</span>
                                    <Link 
                                        to="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-center rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-[var(--color-primary)]/10"
                                    >
                                        Log In
                                    </Link>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </header>

            {/* Hero Section Container with Ambient Glows */}
            <div className="relative overflow-hidden w-full lg:min-h-screen lg:snap-start lg:flex lg:items-center">
                {/* Radial Glow Top-Left */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[var(--color-primary)]/10 blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                {/* Radial Glow Center-Right */}
                <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] translate-x-1/3 pointer-events-none" />

                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'hero' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <motion.section 
                    id="hero"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12 sm:pb-20 lg:pt-32 lg:pb-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full"
                >
                    <div className="lg:col-span-7 space-y-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Sparkles size={12} /> Clinical AI Nutrition Station
                        </div>
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] sm:leading-[1.05] !font-outfit">
                            <span className="text-[var(--color-text-muted)]">Pediatric Care</span> <br />
                            <span className="text-[var(--color-primary)]">Enhanced by Clinical AI</span>
                        </h1>
                        <p className="text-xs sm:text-sm md:text-base text-[var(--color-text-muted)] font-medium leading-relaxed max-w-xl">
                            SMARTNUTRI-AI bridges the gap between Registered Nutritionist-Dietitians (RNDs) and Caregivers. It integrates advanced semantic allergen derivative mapping, clinical portion tracking, and strict HIPAA and DPA data privacy compliance auditing.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                            <Link 
                                to="/login"
                                className="h-12 sm:h-14 px-6 sm:px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.02] transition-all w-full sm:w-auto shrink-0 animate-fade-in"
                            >
                                Access Care Portal <ArrowRight size={14} />
                            </Link>
                            <a 
                                href="#how-it-works"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSectionRedirect('how-it-works');
                                }}
                                className="h-12 sm:h-14 px-6 sm:px-8 border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-2 hover:bg-[var(--color-primary)]/5 hover:scale-[1.02] transition-all w-full sm:w-auto shrink-0"
                            >
                                Watch How It Works ↓
                            </a>
                        </div>
                    </div>

                    {/* Hero Illustration: Semantic Allergen Matcher Sandbox */}
                    <div className="lg:col-span-5 relative w-full">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/20 to-amber-500/20 rounded-[3rem] blur-3xl opacity-30 -z-10" />
                        <Card className="border-2 border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-2xl bg-[var(--color-bg-card)] w-full max-w-md mx-auto space-y-6">
                            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                                        <Brain size={16} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">Clinical Engine Demo</span>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            </div>

                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                className="space-y-4"
                            >
                                <motion.div variants={itemVariants} className="space-y-1 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Child's Allergy</label>
                                    <select 
                                        value={demoAllergy}
                                        onChange={(e) => handleAllergyChange(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-xl outline-none font-bold text-xs"
                                    >
                                        <option value="milk/dairy">Milk / Dairy</option>
                                        <option value="egg">Eggs</option>
                                        <option value="peanut">Peanuts</option>
                                    </select>
                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-1 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Analyzed Food Intake</label>
                                    <select 
                                        value={demoFood}
                                        onChange={(e) => setDemoFood(e.target.value)}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-xl outline-none font-bold text-xs"
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
                                </motion.div>

                                {/* Interactive Status Indicator Box */}
                                <motion.div 
                                    variants={itemVariants}
                                    className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex items-start gap-3 text-left ${
                                        demoResult.status === 'flagged' 
                                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400' 
                                            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {demoResult.status === 'flagged' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">
                                            {demoResult.status === 'flagged' ? 'Clinical Warning Triggered' : 'Safety Check Verified'}
                                        </h4>
                                        <p className="text-xs font-black mt-1 leading-snug">{demoResult.message}</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </Card>
                    </div>
                </motion.section>
            </div>



            {/* What Our System Does Section */}
            <motion.section 
                id="how-it-works"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-t border-[var(--color-divider)] lg:min-h-screen lg:snap-start"
            >
                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'how-it-works' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none rounded-[2rem]"
                        />
                    )}
                </AnimatePresence>

                {/* Left side: Explanation */}
                <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-[10px] font-black uppercase tracking-widest">
                        <Activity size={12} /> System Ecosystem Flow
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-[var(--color-text-main)] uppercase tracking-tight leading-none">
                        How SmartNutri-AI Works
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] font-medium leading-relaxed max-w-2xl">
                        SmartNutri-AI simplifies the clinical feedback loop between Registered Nutritionist-Dietitians (RNDs) and Caregivers. Our system automates portion exchange calculation, performs semantic allergen checking, and tracks progress securely.
                    </p>

                    <div className="space-y-4 sm:space-y-6">
                        {/* Step 1 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="h-8 sm:h-10 w-8 sm:w-10 shrink-0 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-xs sm:text-sm">
                                1
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight">Dietitian Formulates Portion Targets</h4>
                                <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    The Registered Nutritionist-Dietitian (RND) inputs the child's age, allergies, growth milestones, and configures a daily food exchange prescription.
                                </p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="h-8 sm:h-10 w-8 sm:w-10 shrink-0 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs sm:text-sm">
                                2
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight">Caregiver Logs Meals & Water Intake</h4>
                                <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    The parent logs their child's meals by uploading a photo. The AI instantly estimates calories, protein, carbs, fats, and maps ingredients to food exchange values.
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="h-8 sm:h-10 w-8 sm:w-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-xs sm:text-sm">
                                3
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight">Semantic Allergen Scan & Warning</h4>
                                <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    Our clinical mapping database analyzes ingredients for hidden derivatives. It detects warning triggers (like milk proteins in margarine) and issues instant caregiver alerts.
                                </p>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-3 sm:gap-4">
                            <div className="h-8 sm:h-10 w-8 sm:w-10 shrink-0 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-xs sm:text-sm">
                                4
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text-main)] uppercase tracking-tight">Plate Waste Evaluation & Monitoring</h4>
                                <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    The parent records the consumption percentage (e.g. 80% eaten). The RND reviews these adherence logs, tracks visual meal history, and makes clinical adjustments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Smartphone Bezel */}
                <div className="lg:col-span-5 flex justify-center relative w-full z-10">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/10 to-blue-500/10 rounded-[3rem] blur-3xl opacity-40 -z-10 animate-pulse" />
                    
                    {/* CSS Phone Frame */}
                    <div className="relative mx-auto border-[10px] sm:border-[12px] border-slate-900 dark:border-slate-800 rounded-[2.5rem] sm:rounded-[3rem] h-[380px] sm:h-[600px] w-[260px] sm:w-[290px] shadow-2xl overflow-hidden bg-slate-900 flex flex-col scale-[0.9] sm:scale-100 origin-center transition-transform">
                        {/* Status Bar / Notch */}
                        <div className="absolute top-0 inset-x-0 h-6 bg-black z-30 flex items-center justify-between px-5 text-[8px] sm:text-[9px] font-bold text-white">
                            <span>9:41</span>
                            <div className="w-16 sm:w-20 h-4 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0 flex items-center justify-center">
                                <div className="w-10 sm:w-12 h-1 bg-zinc-800 rounded-full" />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                                <span className="h-1.5 w-2.5 border border-white/80 rounded-sm relative flex items-center justify-start p-[1px]"><span className="h-full w-1.5 bg-white rounded-2xs" /></span>
                            </div>
                        </div>

                        {/* Phone Screen Container */}
                        <div className="flex-1 bg-[var(--color-bg-page)] pt-6 relative overflow-hidden select-none">
                            <img 
                                src="/Dashboard-Screenshot.jpg" 
                                alt="SmartNutri Caregiver Mobile Dashboard" 
                                className="absolute top-6 left-0 w-full h-auto select-none pointer-events-none" 
                            />
                        </div>

                        {/* Home Bar indicator */}
                        <div className="absolute bottom-1 inset-x-0 h-3 bg-transparent flex items-center justify-center">
                            <div className="w-16 sm:w-20 h-1 bg-zinc-700 dark:bg-zinc-600 rounded-full" />
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Platform Feature Pillars */}
            <motion.section 
                id="capabilities"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative bg-[var(--color-bg-card)] border-y border-[var(--color-divider)] py-12 lg:py-0 lg:min-h-screen lg:snap-start lg:flex lg:flex-col lg:justify-center"
            >
                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'capabilities' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="text-center max-w-xl mx-auto space-y-4 mb-10 sm:mb-16">
                        <div className="h-10 w-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center rounded-2xl mx-auto">
                            <Activity size={20} />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-text-main)] uppercase leading-none">Clinical Capabilities</h2>
                        <p className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                            Designed to meet dietitian requirements and secure pediatric clinical data.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {/* Pillar 1: Semantic Allergen Engine */}
                        <div className="group relative p-6 sm:p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2rem] space-y-4 hover:border-[var(--color-primary)]/30 hover:shadow-xl hover:shadow-[var(--color-primary)]/5 hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/0 to-[var(--color-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="relative z-10 space-y-4">
                                <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center animate-fade-in">
                                    <Brain size={22} />
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Semantic Allergen Check</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                    Beyond simple word matches, SMARTNUTRI-AI utilizes semantic maps to detect hidden biological derivatives (e.g. *margarine* triggering *milk/dairy* alerts) while employing clinical bypasses for plant-based milks and eggplants.
                                </p>
                            </div>
                        </div>

                        {/* Pillar 2: Regulatory Auditing & Immutability */}
                        <div className="group relative p-6 sm:p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2rem] space-y-4 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="relative z-10 space-y-4">
                                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <ShieldCheck size={22} />
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">HIPAA & DPA Security</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                    Extended database compiler rules enforce absolute ORM-level immutability on audit trails. Every PHI read or update action is strictly monitored and locked down to ensure absolute legal compliance.
                                </p>
                            </div>
                        </div>

                        {/* Pillar 3: Clinical Exchange Fulfillments */}
                        <div className="group relative p-6 sm:p-8 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2rem] space-y-4 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="relative z-10 space-y-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <FileCheck size={22} />
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Portion & Exchange Match</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                                    Connects dietary guidelines dynamically to parent-logged meals. Automatically maps nutrient composition estimates into structured Food Exchanges to track daily adherence logs instantly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Stakeholder Roles Section */}
            <motion.section 
                id="workflows"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-0 space-y-10 sm:space-y-16 lg:min-h-screen lg:snap-start lg:flex lg:flex-col lg:justify-center"
            >
                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'workflows' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none rounded-[2rem]"
                        />
                    )}
                </AnimatePresence>

                <div className="text-center max-w-xl mx-auto space-y-2 relative z-10">
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-[var(--color-text-main)] tracking-tight leading-none">Tailored Portal Workflows</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">A dedicated experience for each clinical stakeholder.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 relative z-10">
                    {/* Role 1: Registered Nutritionist Dietitian */}
                    <div className="p-6 sm:p-8 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row gap-4 sm:gap-6 items-start hover:shadow-xl transition-all text-left">
                        <div className="p-4 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl shrink-0">
                            <Users size={28} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-base sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Clinical Dietitian Station</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                                Curate meal plans, configure customized pediatric nutrient targets, build portion matrices, and write ADIME diagnostic charts. Track real-time patient meal photos and verified Plate Waste logs.
                            </p>
                        </div>
                    </div>

                    {/* Role 2: Parent Caregiver */}
                    <div className="p-6 sm:p-8 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row gap-4 sm:gap-6 items-start hover:shadow-xl transition-all text-left">
                        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                            <Heart size={28} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-base sm:text-lg font-black text-[var(--color-text-main)] uppercase tracking-tight">Caregiver Portal</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                                Upload meal photos for instant AI-based macronutrient estimation. Check meal compliance targets, receive clinical allergen warning banners, and record daily water and step logs.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* FAQ Section */}
            <motion.section 
                id="faq"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-0 border-t border-[var(--color-divider)] lg:min-h-screen lg:snap-start lg:flex lg:flex-col lg:justify-center"
            >
                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'faq' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none rounded-[2rem]"
                        />
                    )}
                </AnimatePresence>

                <div className="text-center max-w-xl mx-auto space-y-2 mb-10 sm:mb-16 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase text-[var(--color-text-main)] tracking-tight leading-none">Frequently Asked Questions</h2>
                    <p className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Everything you need to know about SmartNutri-AI security, AI logging, and workflows.</p>
                </div>

                <div className="max-w-3xl mx-auto space-y-4 relative z-10">
                    {faqData.map((faq, index) => {
                        const isOpen = activeFaq === index;
                        return (
                            <div 
                                key={index} 
                                className="border border-[var(--color-divider)] bg-[var(--color-bg-card)] rounded-2xl overflow-hidden hover:border-[var(--color-primary)]/30 transition-all duration-300"
                            >
                                <button
                                    type="button"
                                    onClick={() => setActiveFaq(isOpen ? null : index)}
                                    className="w-full py-4 px-6 flex items-center justify-between text-left font-bold text-sm sm:text-base text-[var(--color-text-main)] transition-colors hover:text-[var(--color-primary)]"
                                >
                                    <span className="font-black uppercase tracking-tight">{faq.question}</span>
                                    <span className={`text-[var(--color-primary)] font-black text-xl transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                                        +
                                    </span>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="overflow-hidden border-t border-[var(--color-divider)]"
                                        >
                                            <div className="p-6 text-xs sm:text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </motion.section>

            {/* Contact Us Section */}
            <motion.section 
                id="contact"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-[var(--color-bg-page)] border-t border-[var(--color-divider)] py-12 lg:py-0 relative lg:min-h-screen lg:snap-start lg:flex lg:flex-col lg:justify-center"
            >
                {/* Highlight Pulse Overlay */}
                <AnimatePresence>
                    {clickedSection === 'contact' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.25, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="absolute inset-0 bg-[var(--color-primary)]/10 z-20 pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-primary)]/5 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                        {/* Left Column: Support Info */}
                        <div className="lg:col-span-5 space-y-8">
                            <div className="space-y-4">
                                <div className="h-10 w-10 bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center rounded-2xl">
                                    <MessageSquare size={20} />
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-text-main)] uppercase">
                                    Get in <span className="text-[var(--color-primary)]">Touch</span>
                                </h2>
                                <p className="text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    Have a question about pediatric clinical deployments, platform integrations, or need caregiver support? Our team is here to assist you.
                                </p>
                            </div>

                            <div className="space-y-6 pt-4">
                                {/* Official Email Card */}
                                <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] flex items-center justify-between group hover:border-[var(--color-primary)]/50 transition-all shadow-lg shadow-[var(--color-primary)]/5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-0.5">Official Support</p>
                                            <p className="text-sm font-bold text-[var(--color-text-main)]">snutri244@gmail.com</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCopyEmail}
                                        className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-muted)] flex items-center justify-center hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all active:scale-95"
                                        title="Copy Email Address"
                                    >
                                        {copied ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-divider)] space-y-3">
                                        <Clock size={18} className="text-amber-500" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Response Time</p>
                                            <p className="text-xs font-bold text-[var(--color-text-main)] mt-1">Within 24 Hours</p>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-divider)] space-y-3">
                                        <GlobeLock size={18} className="text-blue-500" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Data Privacy</p>
                                            <p className="text-xs font-bold text-[var(--color-text-main)] mt-1">Fully Secured</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Contact Form */}
                        <div className="lg:col-span-7">
                            <Card className="p-6 sm:p-8 rounded-[2.5rem] bg-[var(--color-bg-card)]/80 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-2xl shadow-[var(--color-primary)]/10">
                                <form onSubmit={handleContactSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest ml-1">Full Name</label>
                                            <input 
                                                required
                                                type="text" 
                                                placeholder="Dr. Jane Doe"
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest ml-1">Email Address</label>
                                            <input 
                                                required
                                                type="email" 
                                                placeholder="jane@hospital.org"
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest ml-1">Role / Identity</label>
                                            <select 
                                                value={contactForm.role}
                                                onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-medium"
                                            >
                                                <option value="caregiver">Caregiver / Parent</option>
                                                <option value="nutritionist">Clinical Nutritionist</option>
                                                <option value="institution">Healthcare Institution</option>
                                                <option value="general">General Inquiry</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest ml-1">Subject</label>
                                            <input 
                                                required
                                                type="text" 
                                                placeholder="How can we help?"
                                                value={contactForm.subject}
                                                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                                className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest ml-1">Message</label>
                                        <textarea 
                                            required
                                            rows={4}
                                            placeholder="Write your message here..."
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            className="w-full p-4 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm font-medium resize-none custom-scrollbar"
                                        />
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-14 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 hover:scale-[1.01] transition-all disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <Activity size={18} className="animate-pulse" />
                                        ) : (
                                            <>Submit Ticket <Send size={16} /></>
                                        )}
                                    </button>
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Footer */}
            <footer className="w-full border-t border-[var(--color-divider)] bg-[var(--color-bg-card)] py-12 text-center text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-widest relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <p>© {new Date().getFullYear()} SmartNutri-AI. All rights reserved.</p>
                    <div className="flex flex-wrap gap-4 justify-center items-center">
                        <a 
                            href={config?.server?.apiUrl ? config.server.apiUrl.replace('/api', '/system-updates') : 'http://localhost:5000/system-updates'}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] hover:text-white rounded-full text-[9px] transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <Sparkles size={10} /> See System Updates
                        </a>
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] rounded-full text-[9px]">HIPAA Compliant</span>
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-white/5 border border-[var(--color-divider)] rounded-full text-[9px]">RA 10173 Compliant</span>
                    </div>
                </div>
            </footer>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setShowSuccessModal(false)}
                                className="absolute top-6 right-6 h-8 w-8 rounded-full bg-[var(--color-bg-page)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            
                            <div className="text-center space-y-2 mb-8">
                                <h3 className="text-xl font-black text-[var(--color-text-main)] uppercase tracking-tight">Ticket Submitted</h3>
                                <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                    Thank you! Your support ticket has been automatically sent to our official support channel. We will get back to you shortly.
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all hover:-translate-y-0.5"
                                >
                                    Done
                                </button>
                                <button 
                                    onClick={handleCopy}
                                    className="w-full h-12 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)] text-[var(--color-text-main)] rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                                >
                                    {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />} 
                                    {copied ? 'Receipt Copied!' : 'Copy Ticket Receipt'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Dots Navigation */}
            <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-4 z-50 items-end">
                {[
                    { id: 'hero', label: 'Home' },
                    { id: 'how-it-works', label: 'Ecosystem' },
                    { id: 'capabilities', label: 'Capabilities' },
                    { id: 'workflows', label: 'Workflows' },
                    { id: 'faq', label: 'FAQ' },
                    { id: 'contact', label: 'Contact' }
                ].map((sec) => (
                    <a
                        key={sec.id}
                        href={`#${sec.id}`}
                        onClick={(e) => {
                            e.preventDefault();
                            handleSectionRedirect(sec.id);
                        }}
                        className="group flex items-center gap-3 relative cursor-pointer"
                    >
                        {/* Sliding label */}
                        <span className="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-bg-card)]/90 border border-[var(--color-divider)] px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm pointer-events-none select-none">
                            {sec.label}
                        </span>
                        
                        {/* Dot */}
                        <div
                            className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
                                activeSection === sec.id 
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] scale-125 shadow-lg shadow-[var(--color-primary)]/30' 
                                    : 'bg-transparent border-[var(--color-text-muted)]/40 group-hover:border-[var(--color-primary)] group-hover:scale-110'
                            }`}
                        />
                    </a>
                ))}
            </div>
        </div>
    );
}
