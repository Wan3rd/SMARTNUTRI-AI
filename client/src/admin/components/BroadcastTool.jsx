import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Megaphone, Send, Info, Settings, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import Notification from '../../components/common/Notification';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function BroadcastTool() {
    const [broadcast, setBroadcast] = useState({ title: '', content: '', target_role: 'all', priority: 'normal' });
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [confirmDeleteAnn, setConfirmDeleteAnn] = useState({ isOpen: false, id: null });
    const [message, setMessage] = useState({ type: 'success', text: '' });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/admin/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            console.error("Failed to fetch announcements", err);
        }
    };

    const handleSendBroadcast = async () => {
        const titleTrimmed = broadcast.title.trim();
        const contentTrimmed = broadcast.content.trim();

        if (titleTrimmed.length < 5) {
            setMessage({ type: 'error', text: 'Broadcast title must be at least 5 characters.' });
            return;
        }
        if (contentTrimmed.length < 15) {
            setMessage({ type: 'error', text: 'Broadcast message must be at least 15 characters to ensure clarity.' });
            return;
        }
        setIsBroadcasting(true);
        try {
            if (editingAnnouncement) {
                await api.patch(`/admin/announcements/${editingAnnouncement.id}`, broadcast);
                setMessage({ type: 'success', text: 'Broadcast updated' });
            } else {
                await api.post('/admin/broadcast', broadcast);
                setMessage({ type: 'success', text: 'Broadcast transmitted system-wide' });
            }
            setBroadcast({ title: '', content: '', target_role: 'all', priority: 'normal' });
            setEditingAnnouncement(null);
            fetchAnnouncements();
        } catch (err) {
            console.error("Broadcast failed", err);
            setMessage({ type: 'error', text: 'Action failed' });
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleDeleteAnnouncement = async () => {
        const id = confirmDeleteAnn.id;
        if (!id) return;

        try {
            await api.delete(`/admin/announcements/${id}`);
            setMessage({ type: 'success', text: 'Platform broadcast successfully terminated and removed.' });
            setConfirmDeleteAnn({ isOpen: false, id: null });
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'System failed to remove the broadcast. Please try again.' });
        }
    };

    const startEditAnnouncement = (ann) => {
        setEditingAnnouncement(ann);
        setBroadcast({
            title: ann.title,
            content: ann.content,
            target_role: ann.target_role,
            priority: ann.priority
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    return (
        <>
            <Notification
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ ...message, text: '' })}
            />
            
            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--color-divider)]">
                    <div className="md:w-1/3 p-8 bg-zinc-50 dark:bg-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl">
                                <Megaphone size={24} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text-main)] tracking-tight">System Broadcast</h3>
                        </div>
                        <p className="text-[11px] font-medium text-[var(--color-text-muted)] leading-relaxed mb-6">
                            Transmit high-priority notifications to specific clinical roles or the entire user base. Announcements appear in real-time on target dashboards.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                <Info size={16} className="text-blue-500 mt-1" />
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight">Use broadcasts for maintenance updates, clinical alerts, or platform news.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Announcement Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. System Maintenance Update"
                                    value={broadcast.title}
                                    onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm text-[var(--color-text-main)]"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Target Audience</label>
                                    <select
                                        value={broadcast.target_role}
                                        onChange={(e) => setBroadcast({ ...broadcast, target_role: e.target.value })}
                                        className="w-full pl-4 pr-10 py-2.5 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl outline-none font-bold text-sm text-[var(--color-text-main)] cursor-pointer"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="nutritionist">Nutritionists Only</option>
                                        <option value="parent">Parents Only</option>
                                    </select>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Priority Level</label>
                                    <select
                                        value={broadcast.priority}
                                        onChange={(e) => setBroadcast({ ...broadcast, priority: e.target.value })}
                                        className="w-full pl-4 pr-10 py-2.5 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl outline-none font-bold text-sm text-[var(--color-text-main)] cursor-pointer"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="high">High Alert</option>
                                        <option value="critical">Critical (Immediate)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Broadcast Content</label>
                            <textarea
                                placeholder="Describe the update or alert in detail..."
                                value={broadcast.content}
                                onChange={(e) => setBroadcast({ ...broadcast, content: e.target.value })}
                                className="w-full px-4 py-3 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all font-bold text-sm text-[var(--color-text-main)] min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                            {editingAnnouncement && (
                                <Button
                                    onClick={() => {
                                        setEditingAnnouncement(null);
                                        setBroadcast({ title: '', content: '', target_role: 'all', priority: 'normal' });
                                    }}
                                    className="w-full sm:w-auto h-11 px-8 bg-zinc-100 dark:bg-white/5 text-[var(--color-text-main)] rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] border border-[var(--color-divider)]"
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button
                                onClick={handleSendBroadcast}
                                disabled={isBroadcasting}
                                className="w-full sm:w-auto h-11 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                            >
                                <Send size={14} className={isBroadcasting ? 'animate-pulse' : ''} />
                                {isBroadcasting ? 'Transmitting...' : editingAnnouncement ? 'Update Broadcast' : 'Initiate Broadcast'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Announcement History / Management List */}
                {announcements.length > 0 && (
                    <div className="border-t border-[var(--color-divider)] p-8">
                        <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-6">Active & Past Broadcasts</h4>
                        <div className="space-y-3">
                            {announcements.map(ann => (
                                <div key={ann.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] group hover:border-[var(--color-primary)]/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${ann.priority === 'critical' ? 'bg-rose-500/10 text-rose-500' :
                                                ann.priority === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                            }`}>
                                            <Megaphone size={14} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-[var(--color-text-main)]">{ann.title}</span>
                                                <span className="text-[8px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded-full text-[var(--color-text-muted)] uppercase tracking-tighter">To: {ann.target_role}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{new Date(ann.created_at).toLocaleDateString()} • {ann.admin?.full_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEditAnnouncement(ann)}
                                            className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-blue-500"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteAnn({ isOpen: true, id: ann.id })}
                                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all text-[var(--color-text-muted)] hover:text-rose-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={confirmDeleteAnn.isOpen}
                onClose={() => setConfirmDeleteAnn({ isOpen: false, id: null })}
                onConfirm={handleDeleteAnnouncement}
                title="Terminate Platform Broadcast?"
                message="Are you sure you want to kill this broadcast? It will be immediately removed from all active nutritionist and parent dashboards. This action cannot be undone."
                confirmText="Terminate Broadcast"
                isDestructive={true}
            />
        </>
    );
}
