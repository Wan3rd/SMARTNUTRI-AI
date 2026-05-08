import React, { useState, useEffect } from 'react';
import { Megaphone, X, AlertTriangle, Info, Bell, ShieldAlert } from 'lucide-react';
import api from '../lib/api';

export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await api.get('/auth/announcements');
                setAnnouncements(res.data);
            } catch (err) {
                console.error("Failed to fetch announcements", err);
            }
        };
        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 60000 * 5); // Check every 5 mins
        return () => clearInterval(interval);
    }, []);

    if (announcements.length === 0) return null;

    const getPriorityStyles = (priority) => {
        switch (priority) {
            case 'critical':
                return 'bg-rose-500 text-white shadow-rose-500/20';
            case 'high':
                return 'bg-amber-500 text-white shadow-amber-500/20';
            default:
                return 'bg-[var(--color-primary)] text-white shadow-[var(--color-primary)]/20';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'critical': return <ShieldAlert size={18} />;
            case 'high': return <AlertTriangle size={18} />;
            default: return <Bell size={18} />;
        }
    };

    return (
        <div className="space-y-3 mb-8">
            {announcements.map((announcement) => (
                <div 
                    key={announcement.id}
                    className={`relative overflow-hidden rounded-[1.5rem] p-4 flex items-center gap-4 shadow-lg animate-in slide-in-from-top-4 duration-500 ${getPriorityStyles(announcement.priority)}`}
                >
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                    
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        {getPriorityIcon(announcement.priority)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-widest mb-0.5">{announcement.title}</h4>
                        <p className="text-[11px] font-medium opacity-90 leading-relaxed">{announcement.content}</p>
                    </div>

                    <button 
                        onClick={() => setAnnouncements(prev => prev.filter(a => a.id !== announcement.id))}
                        className="h-8 w-8 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
