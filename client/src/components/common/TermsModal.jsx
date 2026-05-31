import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

export default function TermsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const sections = [
        {
            title: "Medical Disclaimer",
            content: "SmartNutri-AI is a clinical support tool and NOT a replacement for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health providers with any questions regarding a medical condition. Never disregard professional medical advice because of something you have read on this platform."
        },
        {
            title: "Data Privacy & HIPAA",
            content: "We implement industry-standard encryption and security protocols consistent with HIPAA guidelines. Your child's clinical data is private and only accessible to you and your assigned nutritionist. We do not sell or share personal health information with third-party advertisers."
        },
        {
            title: "AI Limitations",
            content: "Our AI-driven nutritional recommendations are based on the clinical data provided. While we strive for maximum accuracy, AI models may occasionally produce generalized or incomplete suggestions. All AI-generated meal plans should be reviewed by your clinical nutritionist before implementation."
        },
        {
            title: "User Responsibility",
            content: "You are responsible for providing accurate and truthful clinical information, including allergies, weight, and medical history. Providing false data can lead to unsafe nutritional recommendations. You must maintain the confidentiality of your account credentials."
        },
        {
            title: "Liability & Termination",
            content: "SmartNutri-AI shall not be liable for any adverse effects resulting from the use of the platform. We reserve the right to terminate accounts that violate our community standards or misuse clinical tools. These terms are subject to change with notice to registered users."
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in duration-300"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-slate-100 shrink-0 relative overflow-hidden bg-slate-50">
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Terms of Service</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">
                                        Last Updated: May 2026
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white text-slate-500 hover:text-slate-900 transition-all border border-slate-100 cursor-pointer shadow-sm"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar bg-white">
                            <div className="prose max-w-none">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    Welcome to <span className="font-black text-emerald-600">SmartNutri-AI</span>. By accessing our platform, you agree to the following terms and conditions designed to ensure clinical safety and data integrity.
                                </p>
                            </div>

                            <div className="grid gap-6">
                                {sections.map((section, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="p-5 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:border-emerald-500/30 shadow-sm"
                                    >
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">{section.title}</h3>
                                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                                            {section.content}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <p className="text-[11px] text-emerald-600 font-bold leading-relaxed text-center italic">
                                    \"Your child's health is our priority. These terms ensure that the SmartNutri-AI environment remains clinical, safe, and accurate.\"
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-200 bg-white"
                            >
                                Close
                            </Button>
                            <Button
                                onClick={onClose}
                                className="px-10 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                            >
                                I Understand
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
