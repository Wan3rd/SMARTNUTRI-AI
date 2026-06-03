import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import api from '../lib/api';
import ReactMarkdown from 'react-markdown';
import { useProfile } from '../context/ProfileContext';
import { AlertCircle, ChefHat, ThumbsDown, Sparkles, Utensils } from 'lucide-react';

function ClinicalRecipeSimulator() {
    const steps = [
        { id: 1, text: "Syncing patient bio-metrics...", color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: 2, text: "Verifying allergen safety shields...", color: "text-rose-500", bg: "bg-rose-500/10" },
        { id: 3, text: "Structuring pediatric macronutrients...", color: "text-amber-500", bg: "bg-amber-500/10" },
        { id: 4, text: "Finalizing clinical recipe cards...", color: "text-emerald-500", bg: "bg-emerald-500/10" }
    ];

    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStepIdx(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 border-4 border-dashed border-[var(--color-primary)]/30 rounded-[3rem] bg-white dark:bg-white/5 shadow-2xl relative overflow-hidden font-outfit animate-in fade-in duration-500">
            {/* Pulsing Chef Hat Ring */}
            <div className="relative mb-8 flex justify-center">
                <div className="absolute h-24 w-24 rounded-full border-4 border-[var(--color-primary)]/20 animate-ping duration-1000" />
                <div className="relative h-20 w-20 rounded-3xl bg-[var(--color-primary)]/10 flex items-center justify-center shadow-lg border border-[var(--color-primary)]/20">
                    <ChefHat size={36} className="text-[var(--color-primary)] animate-pulse" />
                </div>
            </div>

            {/* Simulated Progress Logger */}
            <div className="w-full max-w-sm space-y-4">
                <div className="text-center">
                    <h3 className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-[0.2em] mb-1">AI Chef is Cooking</h3>
                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Clinical Culinary Synthesis</p>
                </div>

                <div className="space-y-2 pt-2">
                    {steps.map((step, idx) => {
                        const isCurrent = idx === currentStepIdx;
                        const isCompleted = idx < currentStepIdx;
                        return (
                            <div 
                                key={step.id} 
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                                    isCurrent 
                                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-102" 
                                        : isCompleted 
                                            ? "border-emerald-500/20 bg-emerald-500/5 opacity-80" 
                                            : "border-transparent opacity-40"
                                }`}
                            >
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    isCurrent 
                                        ? "bg-[var(--color-primary)] text-white animate-pulse" 
                                        : isCompleted 
                                            ? "bg-emerald-500 text-white" 
                                            : "bg-[var(--color-divider)] text-[var(--color-text-muted)]"
                                }`}>
                                    {isCompleted ? "✓" : step.id}
                                </div>
                                <span className={`text-xs font-bold leading-none ${
                                    isCurrent 
                                        ? "text-[var(--color-text-main)]" 
                                        : isCompleted 
                                            ? "text-[var(--color-text-muted)] line-through decoration-emerald-500/20" 
                                            : "text-[var(--color-text-muted)]"
                                }`}>
                                    {step.text}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-[var(--color-primary)]/10 rounded-full overflow-hidden relative mt-4 border border-[var(--color-primary)]/5">
                    <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-primary)] to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500"
                        style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper to convert OKLCH color strings to standard RGB/RGBA strings
function replaceOklchWithRgb(str) {
    if (typeof str !== 'string' || !str.includes('oklch')) {
        return str;
    }
    
    return str.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+(?:deg|rad|grad|turn)?)\s*(?:\/\s*([0-9.]+%?))?\s*\)/g, (match, lStr, cStr, hStr, aStr) => {
        try {
            // Parse L
            let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
            // Parse C
            let c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
            
            // Parse H
            let h = 0;
            if (hStr.endsWith('deg')) {
                h = parseFloat(hStr);
            } else if (hStr.endsWith('rad')) {
                h = parseFloat(hStr) * (180 / Math.PI);
            } else if (hStr.endsWith('grad')) {
                h = parseFloat(hStr) * 0.9;
            } else if (hStr.endsWith('turn')) {
                h = parseFloat(hStr) * 360;
            } else {
                h = parseFloat(hStr); // default to degrees
            }
            
            // Parse A (alpha)
            let a = 1;
            if (aStr !== undefined) {
                a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
            }
            
            // Convert OKLCH to RGB
            const hRad = (h * Math.PI) / 180;
            const oklab_a = c * Math.cos(hRad);
            const oklab_b = c * Math.sin(hRad);
            
            // OKLab to LMS
            const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
            const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
            const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
            
            // LMS to linear
            const l_lin = l_ * l_ * l_;
            const m_lin = m_ * m_ * m_;
            const s_lin = s_ * s_ * s_;
            
            // LMS linear to sRGB linear
            let r_lin = +4.0767416621 * l_lin - 3.3077115913 * m_lin + 0.2309699292 * s_lin;
            let g_lin = -1.2684380046 * l_lin + 2.6097574011 * m_lin - 0.3413193965 * s_lin;
            let b_lin = -0.0041960863 * l_lin - 0.7034186147 * m_lin + 1.7076147010 * s_lin;
            
            // Gamma correction function
            const gamma = (val) => {
                return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
            };
            
            let r = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
            let g = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
            let b = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);
            
            if (a === 1) {
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
        } catch (e) {
            console.warn("Failed to parse oklch color:", match, e);
            return 'rgb(255, 255, 255)'; // Safe white fallback on error
        }
    });
}

export default function AIKitchen() {
    const { selectedProfile } = useProfile();
    const [cravings, setCravings] = useState('');
    const [dislikes, setDislikes] = useState('');
    const [includeSteps, setIncludeSteps] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recipe, setRecipe] = useState('');
    const [exportingPDF, setExportingPDF] = useState(false);

    const downloadPDF = async () => {
        const element = document.getElementById('printable-recipe-card');
        if (!element) {
            alert("Error: Recipe card element not found.");
            return;
        }

        setExportingPDF(true);
        const originalGetComputedStyle = window.getComputedStyle;
        try {
            // Temporarily monkey-patch window.getComputedStyle to translate oklch to rgb/rgba
            window.getComputedStyle = function(elt, pseudoElt) {
                const style = originalGetComputedStyle(elt, pseudoElt);
                return new Proxy(style, {
                    get(target, prop) {
                        // Bypass Proxy 'receiver' to prevent native prototype getter "Illegal invocation" errors
                        const val = target[prop];
                        
                        // Handle style.getPropertyValue(...) method
                        if (prop === 'getPropertyValue') {
                            return function(propertyName) {
                                const originalValue = target.getPropertyValue(propertyName);
                                return replaceOklchWithRgb(originalValue);
                            };
                        }
                        
                        // Handle direct property accesses like style.color, style.backgroundColor, style.borderColor, etc.
                        if (typeof val === 'string') {
                            return replaceOklchWithRgb(val);
                        }
                        
                        // If it's a function (like item, namedItem, etc.), bind it to the target
                        if (typeof val === 'function') {
                            return val.bind(target);
                        }
                        
                        return val;
                    }
                });
            };

            // Dynamically import libraries to optimize initial bundle size
            const [html2canvasModule, jspdfModule] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);

            const html2canvasFn = html2canvasModule.default || html2canvasModule;
            if (typeof html2canvasFn !== 'function') {
                throw new Error("html2canvas library failed to initialize correctly.");
            }

            const canvas = await html2canvasFn(element, {
                scale: 2, // 2x is highly crisp and avoids maximum canvas size limit issues in browsers
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: true,
                onclone: (clonedDoc) => {
                    const clonedHeader = clonedDoc.querySelector('.pdf-only-header');
                    if (clonedHeader) {
                        clonedHeader.style.display = 'block';
                    }
                    const clonedActions = clonedDoc.querySelectorAll('.pdf-no-export');
                    clonedActions.forEach(el => {
                        if (el) el.style.display = 'none';
                    });
                    const clonedCard = clonedDoc.getElementById('printable-recipe-card');
                    if (clonedCard) {
                        clonedCard.style.boxShadow = 'none';
                        clonedCard.style.border = '1px solid #059669';
                        clonedCard.style.borderRadius = '1.5rem';
                        clonedCard.style.background = '#ffffff';
                        clonedCard.style.color = '#0f172a';
                        clonedCard.style.padding = '40px';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Resolve the constructor function for jsPDF dynamically
            const jsPDFClass = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;
            const pdf = new jsPDFClass({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const margin = 15; // 15mm margins
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, '', 'FAST');
            
            const childName = selectedProfile?.child_name ? selectedProfile.child_name.replace(/\s+/g, '_') : 'Patient';
            pdf.save(`SmartNutri_Recipe_${childName}.pdf`);
        } catch (error) {
            console.error("PDF compilation failed:", error);
            alert("Failed to export PDF: " + error.message);
        } finally {
            window.getComputedStyle = originalGetComputedStyle;
            setExportingPDF(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return "7-12";
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };

    const handleGenerate = async () => {
        if (!cravings || !selectedProfile?.id) return;
        setLoading(true);
        setRecipe('');
        try {
            const res = await api.post('/ai/generate', {
                profileId: selectedProfile.id,
                cravings,
                dislikes,
                includeSteps
            });
            setRecipe(res.data.output);
        } catch (err) {
            console.error(err);
            setRecipe(err.response?.data?.error || err.response?.data?.message || "The AI Chef is taking a nap. Try again later!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 relative">
            {/* High-DPI PDF Generation Premium Overlay Spinner */}
            {exportingPDF && (
                <div className="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 border border-[var(--color-primary)]/20 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center gap-4 max-w-xs text-center border-2 border-emerald-500/20">
                        {/* Premium Ring Spinner */}
                        <div className="relative flex items-center justify-center">
                            <div className="absolute h-12 w-12 rounded-full border-4 border-[var(--color-primary)]/10 animate-pulse" />
                            <div className="h-10 w-10 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                            <ChefHat className="absolute text-[var(--color-primary)] animate-pulse" size={16} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-[var(--color-secondary)] uppercase tracking-[0.2em]">Securing Clinical Record</h4>
                            <p className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest mt-1">Compiling High-DPI PDF Document...</p>
                        </div>
                    </div>
                </div>
            )}
            <header className="px-2 no-print">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 bg-[var(--color-primary)] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 animate-bounce-slow">
                        <ChefHat size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-[var(--color-secondary)] uppercase tracking-tight leading-none">AI Kitchen</h1>
                        <p className="text-[10px] sm:text-xs font-black text-[var(--color-primary)] uppercase tracking-[0.2em] mt-1">Smart Pediatric Culinary Assistant</p>
                    </div>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] font-medium max-w-md">Our AI Chef analyzes your child's profile to create safe, nutritious, and creative recipes in seconds.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-6 no-print">
                    <Card className="border-2 border-[var(--color-divider)] rounded-[2rem] overflow-hidden shadow-sm bg-[var(--color-bg-card)] transition-colors">
                        <CardHeader className="bg-[var(--color-bg-page)]/50 dark:bg-black/20 border-b border-[var(--color-divider)] p-6">
                            <CardTitle className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={16} className="text-[var(--color-primary)]" />
                                Recipe Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Cravings / Ingredients</label>
                                <textarea
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-bold focus:border-[var(--color-primary)] outline-none transition-all min-h-[120px] placeholder:opacity-50"
                                    placeholder="e.g. Strawberries, something crunchy, breakfast..."
                                    value={cravings}
                                    onChange={e => setCravings(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <ThumbsDown size={14} /> Things to avoid
                                </label>
                                <input
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-sm font-bold focus:border-[var(--color-primary)] outline-none transition-all placeholder:opacity-50"
                                    placeholder="e.g. Extra spicy food"
                                    value={dislikes}
                                    onChange={e => setDislikes(e.target.value)}
                                />
                            </div>

                            {selectedProfile && (
                                <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/20 flex items-start gap-4 transition-colors">
                                    <div className="h-8 w-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Clinical Safety Shield Active</p>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase">Allergies:</span>
                                                <span className="text-[10px] text-[var(--color-text-main)] font-bold">
                                                    {Array.isArray(selectedProfile.allergies) 
                                                        ? (selectedProfile.allergies.length > 0 ? selectedProfile.allergies.join(', ') : 'None') 
                                                        : (selectedProfile.allergies || 'None')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-black text-emerald-600/70 dark:text-emerald-400/70 uppercase">Dislikes:</span>
                                                <span className="text-[10px] text-[var(--color-text-main)] font-bold">{selectedProfile.dislikes || 'None'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] cursor-pointer group hover:border-[var(--color-primary)]/30 transition-all">
                                <input
                                    type="checkbox"
                                    id="includeSteps"
                                    className="h-5 w-5 rounded-lg border-2 border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                    checked={includeSteps}
                                    onChange={e => setIncludeSteps(e.target.checked)}
                                />
                                <label htmlFor="includeSteps" className="text-[11px] font-black uppercase tracking-widest cursor-pointer select-none">
                                    Include cooking steps
                                </label>
                            </div>

                            <Button
                                className="w-full h-14 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                                onClick={handleGenerate}
                                disabled={loading || !cravings || !selectedProfile?.id}
                            >
                                {loading ? (
                                    <>
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing Profile...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span>Generate Recipe</span>
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-7 print-container">
                    {loading ? (
                        <ClinicalRecipeSimulator />
                    ) : recipe ? (
                        <Card id="printable-recipe-card" className="border-2 border-[var(--color-primary)]/20 rounded-[2rem] overflow-hidden shadow-xl bg-white dark:bg-white/5 animate-in zoom-in-95 fade-in duration-500 recipe-card">
                            {/* Premium Clinical PDF Header (displayed during pdf-export clone only) */}
                            <div className="pdf-only-header" style={{ display: 'none', borderBottom: '2px solid #059669', paddingBottom: '15px', marginBottom: '20px' }}>
                                <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ background: '#059669', color: '#ffffff', borderRadius: '8px', padding: '6px 8px', fontWeight: '900', fontSize: '14px' }}>SN</div>
                                        <div>
                                            <span className="text-lg font-black text-[#064e3b] uppercase tracking-tighter" style={{ color: '#064e3b', fontWeight: '900', fontSize: '18px' }}>SmartNutri-AI</span>
                                            <p style={{ margin: 0, fontSize: '8px', fontWeight: 'bold', color: '#059669', letterSpacing: '1px', textTransform: 'uppercase' }}>Clinical Pediatric Care</p>
                                        </div>
                                    </div>
                                    <div className="text-right" style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Clinical Recipe Record</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{selectedProfile?.child_name || 'Patient'} • {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <CardHeader className="bg-gradient-to-r from-[var(--color-primary)] to-emerald-700 p-6 sm:p-8 pdf-no-export">
                                <CardTitle className="flex items-center gap-3 text-white uppercase tracking-widest text-base font-black">
                                    <Utensils size={20} /> Chef's Suggestion
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-10">
                                <div className="prose dark:prose-invert max-w-none 
                                    prose-headings:text-[var(--color-secondary)] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
                                    prose-p:text-[var(--color-text-main)] prose-p:font-medium prose-p:leading-relaxed
                                    prose-strong:text-[var(--color-primary)] prose-strong:font-black
                                    prose-li:mb-4 prose-li:text-[var(--color-text-main)] prose-li:font-medium
                                ">
                                    <ReactMarkdown>{recipe}</ReactMarkdown>
                                </div>
                                <div className="mt-10 pt-8 border-t-2 border-[var(--color-divider)] flex justify-between items-center pdf-no-export">
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Pediatric Culinary Guidance</p>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-primary)] disabled:opacity-50" 
                                        onClick={downloadPDF}
                                        disabled={exportingPDF}
                                    >
                                        {exportingPDF ? 'Generating...' : 'Save as PDF'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-[var(--color-text-muted)] p-12 border-4 border-dashed border-[var(--color-divider)] rounded-[3rem] bg-gray-50/30 dark:bg-black/10 transition-colors group">
                            <div className="h-24 w-24 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                <ChefHat size={48} className="opacity-20 text-[var(--color-secondary)]" />
                            </div>
                            <h3 className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-widest mb-2 opacity-50">Kitchen is ready</h3>
                            <p className="text-center text-xs font-bold max-w-[240px] opacity-40 leading-relaxed">Input your child's cravings on the left to generate a personalized clinical recipe.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
