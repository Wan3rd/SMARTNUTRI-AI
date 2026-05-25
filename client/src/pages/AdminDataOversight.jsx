import React, { useState } from 'react';
import { Search, Database, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { Card } from '../components/common/Card';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Notification from '../components/common/Notification';

export default function AdminContentOversight() {
    const [searchQuery, setSearchQuery] = useState('');
    const [contentType, setContentType] = useState('profiles'); // profiles, meals, notes
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: '', id: null, title: '' });
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            const res = await api.get(`/admin/content/search?query=${encodeURIComponent(searchQuery)}&type=${contentType}`);
            setResults(res.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to search content' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const { type, id } = confirmDelete;
        setConfirmDelete({ isOpen: false, type: '', id: null, title: '' });
        
        try {
            await api.delete(`/admin/content/${type}/${id}`);
            setResults(results.filter(r => r.id !== id));
            setMessage({ type: 'success', text: `Successfully deleted ${type.slice(0, -1)} record` });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to delete record' });
        }
    };

    const renderResultCard = (item) => {
        if (contentType === 'profiles') {
            return (
                <div key={item.id} className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-2xl flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-black text-sm truncate max-w-[200px] sm:max-w-md">{item.child_name}</div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">Parent: {item.users?.email || 'N/A'}</div>
                    </div>
                    <button
                        onClick={() => setConfirmDelete({ isOpen: true, type: 'profiles', id: item.id, title: item.child_name })}
                        className="p-2 text-rose-500 bg-rose-500/10 rounded-xl hover:bg-rose-500 hover:text-white transition-colors shrink-0"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            );
        }
        
        if (contentType === 'meals') {
            const mealName = item.nutritionist_review?.meal_summary || item.ai_analysis?.meal_summary || item.ai_analysis?.items?.map(i => i.name).join(', ') || 'Unnamed Meal';
            return (
                <div key={item.id} className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-2xl flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-black text-sm truncate max-w-[200px] sm:max-w-md">{mealName}</div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">Profile: {item.profiles?.child_name || 'N/A'} ({item.profiles?.users?.email || 'N/A'})</div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">Category: <span className="uppercase text-[var(--color-primary)]">{item.meal_category || 'other'}</span> | Logged: {item.logged_at ? new Date(item.logged_at).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <button
                        onClick={() => setConfirmDelete({ isOpen: true, type: 'meals', id: item.id, title: 'this meal log' })}
                        className="p-2 text-rose-500 bg-rose-500/10 rounded-xl hover:bg-rose-500 hover:text-white transition-colors shrink-0"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            );
        }

        if (contentType === 'notes') {
            return (
                <div key={item.id} className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-divider)] rounded-2xl flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-black text-sm truncate max-w-[200px] sm:max-w-md">Dx: {item.diagnosis || 'No Diagnosis'}</div>
                        <div className="text-xs text-[var(--color-text-muted)] truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">Author: {item.nutritionist?.full_name || 'Nutritionist'} | Patient: {item.profiles?.child_name || 'N/A'}</div>
                    </div>
                    <button
                        onClick={() => setConfirmDelete({ isOpen: true, type: 'notes', id: item.id, title: 'this clinical note' })}
                        className="p-2 text-rose-500 bg-rose-500/10 rounded-xl hover:bg-rose-500 hover:text-white transition-colors shrink-0"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Database size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-[var(--color-text-main)] tracking-tight">Data Oversight</h1>
                </div>
                <p className="text-[var(--color-text-muted)] font-medium max-w-lg">
                    Search and forcefully remove orphaned or rogue content from the database.
                </p>
            </div>

            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)] p-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
                    <select
                        value={contentType}
                        onChange={(e) => { setContentType(e.target.value); setResults([]); }}
                        className="px-4 py-3 bg-[var(--color-bg-page)] rounded-xl font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] border border-[var(--color-divider)]"
                    >
                        <option value="profiles">Patient Profiles</option>
                        <option value="meals">Meal Logs</option>
                        <option value="notes">Clinical Notes</option>
                    </select>

                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, diagnosis, or content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] outline-none font-bold text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]/50 focus:border-[var(--color-primary)] transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-black tracking-widest uppercase text-xs hover:bg-[var(--color-primary-hover)] transition-all"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                <div className="space-y-4">
                    {results.length > 0 ? (
                        results.map(renderResultCard)
                    ) : (
                        <div className="p-12 text-center text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-page)] rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                            <ShieldAlert size={32} className="mx-auto mb-3 opacity-20" />
                            No rogue data found matching your query.
                        </div>
                    )}
                </div>
            </Card>

            <ConfirmDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, type: '', id: null, title: '' })}
                onConfirm={handleDelete}
                title="Force Delete Content"
                message={`Are you absolutely sure you want to permanently delete ${confirmDelete.title}? This action bypasses normal safeguards and cannot be undone.`}
                confirmText="Force Delete"
                isDestructive={true}
            />

            <Notification
                key={message.text}
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ type: '', text: '' })}
            />
        </div>
    );
}
