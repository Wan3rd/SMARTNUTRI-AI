import React, { useState, useEffect } from 'react';
import { BrainCircuit } from 'lucide-react';
import api from '../lib/api';
import AIHealthMonitor from '../admin/components/AIHealthMonitor';

export default function AdminAIHealth() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        // Optional: refresh every 10 seconds for real-time vibe
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const statsRes = await api.get('/admin/stats');
            setStats(statsRes.data);
        } catch (err) {
            console.error("Admin fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return <div className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">Initializing AI Telemetry...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <AIHealthMonitor stats={stats?.aiHealth} />
        </div>
    );
}
