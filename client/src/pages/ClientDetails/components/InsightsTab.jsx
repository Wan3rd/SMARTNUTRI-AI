import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Line
} from 'recharts';
import api from '../../../lib/api';

export default function InsightsTab({ selectedProfile, logs = [] }) {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedProfile?.id) return;

        const fetchReportData = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/reports/compliance/${selectedProfile.id}`);
                setReportData(res.data);
            } catch (err) {
                console.error("Error fetching report data", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, [selectedProfile?.id]);

    if (isLoading || !reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] w-full space-y-4">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] animate-pulse">Loading compliance data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 sm:p-6 rounded-2xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 shadow-lg shadow-black/5 text-center transition-all hover:shadow-xl group">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">Compliance Rate (30 Days)</p>
                    <p className="text-3xl sm:text-4xl font-black text-[var(--color-primary)] mt-2 tracking-tighter">{reportData.summary?.complianceRate || 0}%</p>
                </div>
                <div className="p-4 sm:p-6 rounded-2xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 shadow-lg shadow-black/5 text-center transition-all hover:shadow-xl group">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-secondary)] transition-colors">Total Meals Logged</p>
                    <p className="text-3xl sm:text-4xl font-black text-[var(--color-secondary)] mt-2 tracking-tighter">{reportData.summary?.totalLogs || 0}</p>
                </div>
                <div className="p-4 sm:p-6 rounded-2xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 shadow-lg shadow-black/5 text-center transition-all hover:shadow-xl group">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">Flagged Interactions</p>
                    <p className="text-3xl sm:text-4xl font-black text-red-500 mt-2 tracking-tighter">{reportData.summary?.flaggedCount || 0}</p>
                </div>
            </div>

            <div className="p-4 sm:p-8 rounded-2xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 shadow-lg shadow-black/5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <h3 className="font-black text-sm sm:text-base uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                        <Activity size={18} className="text-[var(--color-primary)]" />
                        Health Score & Compliance Trend
                    </h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Compliance
                        </span>
                    </div>
                </div>
                <div className="h-[250px] sm:h-[350px] w-full min-h-[250px] flex flex-col" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <LineChart
                            data={(logs || []).slice().reverse()}
                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" opacity={0.5} />
                            <XAxis
                                dataKey="logged_at"
                                stroke="var(--color-text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                interval={window.innerWidth < 640 ? 5 : 2}
                                tickFormatter={(val) => {
                                    try {
                                        return new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                    } catch (e) {
                                        return val;
                                    }
                                }}
                            />
                            <YAxis
                                stroke="var(--color-text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                labelFormatter={(label) => {
                                    try {
                                        return new Date(label).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                                    } catch (e) {
                                        return label;
                                    }
                                }}
                                contentStyle={{
                                    backgroundColor: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-divider)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="compliance_score"
                                name="Compliance"
                                stroke="var(--color-primary)"
                                strokeWidth={4}
                                dot={{ r: 0 }}
                                activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
