import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { XCircle } from 'lucide-react';
import api from '../../lib/api';

export default function CreateUserModal({ isOpen, onClose, onSuccess }) {
    const [createForm, setCreateForm] = useState({ 
        full_name: '', 
        email: '', 
        password: '', 
        role: 'parent', 
        professional_id: '', 
        clinic: '' 
    });
    const [processingId, setProcessingId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setProcessingId('creating');
        setErrorMsg('');
        try {
            await api.post('/admin/users', createForm);
            onSuccess('Administrative account provisioned successfully.');
            setCreateForm({ full_name: '', email: '', password: '', role: 'parent', professional_id: '', clinic: '' });
            onClose();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Provisioning failed');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center sm:bg-black/60 sm:backdrop-blur-md sm:p-4 animate-in sm:fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300">
            <Card className="max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[2.5rem] overflow-y-auto scrollbar-hide shadow-none sm:shadow-2xl bg-[var(--color-bg-card)]">
                <form onSubmit={handleCreateUser} className="p-8 pb-10 sm:pb-8 space-y-6">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight">New Platform Account</h2>
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Administrative Provisioning</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                            <XCircle size={20} />
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest">
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Account Role</label>
                            <div className="flex gap-2 p-1 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                {['parent', 'nutritionist', 'admin'].map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setCreateForm(prev => ({ ...prev, role: r }))}
                                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${createForm.role === r ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm border border-[var(--color-divider)]' : 'text-[var(--color-text-muted)]'}`}
                                    >
                                        {r === 'parent' ? 'Parent' : r === 'nutritionist' ? 'Nutritionist' : 'Admin'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Full Identity</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter legal name..."
                                value={createForm.full_name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Email Address</label>
                            <input
                                required
                                type="email"
                                placeholder="user@smartnutri.ai"
                                value={createForm.email}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Temporary Password</label>
                            <input
                                required
                                type="password"
                                placeholder="Min 6 characters..."
                                value={createForm.password}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                            />
                        </div>

                        {createForm.role === 'nutritionist' && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">License ID</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="PH-..."
                                        value={createForm.professional_id}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, professional_id: e.target.value }))}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Clinic</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Hospital..."
                                        value={createForm.clinic}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, clinic: e.target.value }))}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={processingId === 'creating'}
                        className="w-full h-14 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[var(--color-primary)]/20"
                    >
                        {processingId === 'creating' ? 'Provisioning Account...' : 'Generate Account'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
