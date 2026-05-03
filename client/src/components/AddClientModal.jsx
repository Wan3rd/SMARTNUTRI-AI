import React, { useState } from 'react';
import { Card, CardContent } from './common/Card';
import { Button } from './common/Button';
import { X, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../lib/api';

export default function AddClientModal({ isOpen, onClose, onClientAdded }) {
    const [mode, setMode] = useState('link'); // 'link' | 'create'
    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState({
        parent_name: '',
        parent_email: '',
        child_name: '',
        date_of_birth: '',
        gender: 'male'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'link') {
                const res = await api.post('/nutritionist/invite', { email });
                setMessage({ type: 'success', text: `Successfully linked ${res.data.client.email}` });
                setEmail('');
            } else {
                const res = await api.post('/nutritionist/create-client', formData);
                setMessage({ type: 'success', text: `Account created for ${formData.parent_name}` });
                setFormData({
                    parent_name: '',
                    parent_email: '',
                    child_name: '',
                    date_of_birth: '',
                    gender: 'male'
                });
            }

            if (onClientAdded) onClientAdded();
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 2000);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md relative shadow-2xl overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex border-b border-[var(--color-divider)]">
                    <button
                        onClick={() => setMode('link')}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${mode === 'link' ? 'bg-white text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
                    >
                        Link Existing Parent
                    </button>
                    <button
                        onClick={() => setMode('create')}
                        className={`flex-1 py-4 text-sm font-bold transition-all ${mode === 'create' ? 'bg-white text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
                    >
                        Create New Account
                    </button>
                </div>

                <CardContent className="p-6">
                    {message && (
                        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'link' ? (
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-text-main)] mb-1">Parent's Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="parent@example.com"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Parent Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.parent_name}
                                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                        className="w-full p-2.5 text-sm rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Parent Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.parent_email}
                                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                                        className="w-full p-2.5 text-sm rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                        placeholder="parent@example.com"
                                    />
                                </div>
                                <div className="pt-2 border-t border-dashed">
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Child Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.child_name}
                                        onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                                        className="w-full p-2.5 text-sm rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                        placeholder="Child's Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Birthday</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date_of_birth}
                                            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                            className="w-full p-2.5 text-sm rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full p-2.5 text-sm rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] italic mt-2">
                                    * Default password will be set to: <strong>smartnutri123</strong>
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : mode === 'link' ? 'Link Client' : 'Create & Link'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
