import React, { useState } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, UserPlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import Notification from './common/Notification';

export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [isClosing, setIsClosing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setIsClosing(false);
        } else {
            setIsMounted(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const triggerCloseAnimation = React.useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 500);
    }, [onClose]);

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

    if (!isOpen && !isMounted) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await api.post('/nutritionist/invite', { email });
            if (onClientAdded) onClientAdded();
            triggerCloseAnimation();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Action failed. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-out",
                isMounted && !isClosing ? "bg-black/70 backdrop-blur-md" : "bg-black/0 backdrop-blur-none"
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) triggerCloseAnimation();
            }}
        >
            <Card 
                className={cn(
                    "w-full max-w-md relative shadow-2xl overflow-hidden border-2 border-[var(--color-divider)] rounded-[32px] transition-all duration-500 ease-out transform",
                    isMounted && !isClosing ? "translate-y-0 opacity-100" : "translate-y-[100%] opacity-0"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => !loading && triggerCloseAnimation()}
                    disabled={loading}
                    className="absolute right-6 top-6 z-20 text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X size={20} />
                </button>

                <div className="bg-[var(--color-primary)] p-6 sm:p-8 text-white relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent pointer-events-none" />
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <UserPlus size={20} sm:size={24} /> Link Parent
                    </h2>
                    <p className="text-white/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1">Connect Existing Clinical Account</p>
                </div>

                <CardContent className="p-6 sm:p-8 space-y-6 bg-[var(--color-bg-card)]">
                    <Notification
                        show={!!message?.text}
                        type={message?.type}
                        message={message?.text}
                        onClose={() => setMessage(null)}
                    />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <fieldset disabled={loading} className="space-y-6 border-none p-0 m-0">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Parent's Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 px-6 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)]/40"
                                    placeholder="e.g. parent@example.com"
                                />
                                <div className="p-4 bg-[var(--color-info)]/10 rounded-2xl border border-[var(--color-info)]/30">
                                    <p className="text-[10px] text-[var(--color-info)] font-bold leading-relaxed italic">
                                        * The caregiver's profile will be instantly paired. Upon pairing, their children's clinical data will be fully accessible in your dashboard.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-[var(--color-divider)]">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-[var(--color-divider)]"
                                    onClick={triggerCloseAnimation}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-14 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-xs gap-2 shadow-xl shadow-[var(--color-primary)]/20"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Link Account'}
                                </Button>
                            </div>
                        </fieldset>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
