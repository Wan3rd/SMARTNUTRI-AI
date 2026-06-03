import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { History, Shield, User, Clock, Search, Filter, ArrowRight, AlertCircle, CheckCircle2, XCircle, Info, Database, Download } from 'lucide-react';
import api from '../lib/api';
import Notification from '../components/common/Notification';

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: 'success', text: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction, debouncedSearch, startDate, endDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 50,
                search: debouncedSearch,
                action: filterAction,
            });
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await api.get(`/admin/audit-logs?${params.toString()}`);
            setLogs(res.data.data);
            setTotalPages(res.data.meta.totalPages);
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
            setMessage({ type: 'error', text: 'Failed to retrieve compliance ledger' });
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Target Name', 'Target Email', 'Entity Type', 'Entity ID', 'Details'];
        const rows = logs.map(log => [
            new Date(log.created_at).toISOString(),
            log.admin?.full_name || '',
            log.admin?.email || '',
            log.action,
            log.target_user?.full_name || '',
            log.target_user?.email || '',
            log.entity_type || '',
            log.entity_id || '',
            JSON.stringify(log.details || {})
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell?.replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_logs_page_${page}.csv`;
        link.click();
    };

    const getActionIcon = (action) => {
        if (action.includes('APPROVE')) return <CheckCircle2 size={16} className="text-emerald-500" />;
        if (action.includes('REJECT') || action.includes('DELETE')) return <XCircle size={16} className="text-rose-500" />;
        if (action.includes('SUSPEND')) return <AlertCircle size={16} className="text-amber-500" />;
        if (action.includes('ROLE')) return <User size={16} className="text-blue-500" />;
        return <Info size={16} className="text-[var(--color-text-muted)]" />;
    };

    const getActionBadgeStyle = (action) => {
        if (action.includes('APPROVE')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        if (action.includes('REJECT') || action.includes('DELETE')) return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
        if (action.includes('SUSPEND')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        return 'bg-zinc-100 dark:bg-white/5 text-[var(--color-text-muted)] border-[var(--color-divider)]';
    };

    const filteredLogs = logs; // Filtered server-side

    const uniqueActions = ['all', ...new Set(logs.map(l => l.action))];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {message.text && (
                <Notification 
                    type={message.type} 
                    message={message.text} 
                    onClose={() => setMessage({ ...message, text: '' })} 
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                            <History size={24} />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tight">Compliance Ledger</h1>
                    </div>
                    <p className="text-[var(--color-text-muted)] font-medium max-w-lg">Immutable administrative audit trail. Monitor platform authority actions and practitioner verification history.</p>
                </div>
                
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={exportCSV} className="flex-1 md:flex-none justify-center h-12 px-5 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] text-[var(--color-text-main)] hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                        <Download size={14} /> Export CSV
                    </button>
                    <button 
                        onClick={fetchLogs}
                        disabled={loading}
                        className="flex-1 md:flex-none justify-center h-12 px-6 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] text-[var(--color-text-main)] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[var(--color-bg-page)] transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <Clock size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Logs
                    </button>
                </div>
            </div>
 
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2 border-b lg:border-b-0 lg:border-r border-[var(--color-divider)]">
                    <Filter size={14} className="text-[var(--color-text-muted)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Filters</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 px-2 lg:px-0 flex-1">
                    <select 
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="flex-1 w-full px-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] cursor-pointer hover:text-[var(--color-primary)] transition-colors border lg:border-0 border-[var(--color-divider)] lg:border-r"
                    >
                        <option value="all" className="dark:bg-[#0f172a]">All Actions</option>
                        {uniqueActions.filter(a => a !== 'all').map(action => (
                            <option key={action} value={action} className="dark:bg-[#0f172a]">{action.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
 
                    <div className="flex flex-row items-center gap-2 flex-1 px-2 sm:px-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none border lg:border-0 border-[var(--color-divider)] w-full justify-between sm:justify-start">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[45%] sm:w-auto bg-transparent text-[10px] font-black uppercase outline-none text-[var(--color-text-main)]" />
                        <span className="text-[10px] text-[var(--color-text-muted)] font-black shrink-0">TO</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[45%] sm:w-auto bg-transparent text-[10px] font-black uppercase outline-none text-[var(--color-text-main)]" />
                    </div>
                </div>

                <div className="flex-1 lg:min-w-[250px] relative px-2 lg:px-0 pb-2 lg:pb-0">
                    <Search className="absolute left-6 lg:left-4 top-1/2 -translate-y-1/2 lg:-mt-0 -mt-1 text-[var(--color-text-muted)] opacity-30" size={16} />
                    <input
                        type="text"
                        placeholder="Search logs by admin, target, or action type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none border lg:border-0 border-[var(--color-divider)] lg:border-l outline-none font-bold text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]/50"
                    />
                </div>
            </div>



            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Timestamp</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Administrative Agent</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Action Type</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Subject / Entity</th>
                                <th className="px-6 py-5 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">Trace Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-divider)]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(5).fill(0).map((_, j) => (
                                            <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--color-bg-page)]/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-[var(--color-text-main)]">{new Date(log.created_at).toLocaleDateString()}</span>
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter">{new Date(log.created_at).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-[var(--color-text-main)]">
                                                    <Shield size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-[var(--color-text-main)]">{log.admin?.full_name}</span>
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] lowercase tracking-tight">{log.admin?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionBadgeStyle(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action.replace(/_/g, ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.target_user ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-[var(--color-text-main)]">{log.target_user.full_name}</span>
                                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter italic">{log.entity_type}: {log.entity_id?.slice(0, 8)}...</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase italic">N/A (System Entity)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text-muted)]">
                                                {log.details?.before && (
                                                    <>
                                                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded border border-[var(--color-divider)] text-rose-500 line-through">{log.details.before}</span>
                                                        <ArrowRight size={12} className="opacity-30" />
                                                    </>
                                                )}
                                                {log.details?.after && (
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20">{log.details.after}</span>
                                                )}
                                                {!log.details?.before && !log.details?.after && log.details?.deleted_user && (
                                                    <span className="text-rose-500">Deleted: {log.details.deleted_user.email}</span>
                                                )}
                                                {!log.details?.before && !log.details?.after && !log.details?.deleted_user && (
                                                    <div className="flex items-center gap-1">
                                                        <Database size={12} className="opacity-30" />
                                                        <span>System state modification log recorded</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <History size={48} />
                                            <div className="space-y-1">
                                                <p className="text-sm font-black uppercase tracking-widest">No matching logs found</p>
                                                <p className="text-xs font-medium italic">Adjust your search or filter to view results</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Card List */}
                <div className="lg:hidden divide-y divide-[var(--color-divider)]">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="p-4 animate-pulse space-y-3">
                                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-full"></div>
                                <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4"></div>
                            </div>
                        ))
                    ) : filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                            <div key={log.id} className="p-5 flex flex-col gap-3 active:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-[var(--color-text-muted)]" />
                                            <span className="text-xs font-black text-[var(--color-text-main)]">{log.admin?.full_name}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] lowercase tracking-tight ml-5">{log.admin?.email}</span>
                                    </div>
                                    <div className={`inline-flex flex-col items-end gap-1.5 px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${getActionBadgeStyle(log.action)}`}>
                                        <div className="flex items-center gap-1">
                                            {getActionIcon(log.action)}
                                            {log.action.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)]">
                                    {log.target_user ? (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Target Subject</span>
                                            <span className="text-xs font-black text-[var(--color-text-main)]">{log.target_user.full_name}</span>
                                            <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter italic">{log.entity_type}: {log.entity_id?.slice(0, 8)}...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">System Entity</span>
                                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase italic">N/A (System Action)</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--color-text-muted)]">
                                    {log.details?.before && (
                                        <>
                                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 rounded border border-[var(--color-divider)] text-rose-500 line-through truncate max-w-[100px]">{log.details.before}</span>
                                            <ArrowRight size={10} className="opacity-30 shrink-0" />
                                        </>
                                    )}
                                    {log.details?.after && (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20 truncate max-w-[120px]">{log.details.after}</span>
                                    )}
                                    {!log.details?.before && !log.details?.after && log.details?.deleted_user && (
                                        <span className="text-rose-500 truncate">Deleted: {log.details.deleted_user.email}</span>
                                    )}
                                    {!log.details?.before && !log.details?.after && !log.details?.deleted_user && (
                                        <div className="flex items-center gap-1">
                                            <Database size={12} className="opacity-30" />
                                            <span>State modification</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter mt-1 flex justify-between">
                                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                                <History size={48} />
                                <div className="space-y-1">
                                    <p className="text-sm font-black uppercase tracking-widest">No matching logs</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Pagination Controls */}
                <div className="p-4 border-t border-[var(--color-divider)] flex items-center justify-between bg-zinc-50 dark:bg-white/5">
                    <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-9 px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-primary)]/10 text-xs font-bold disabled:opacity-50">Prev</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-9 px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-primary)]/10 text-xs font-bold disabled:opacity-50">Next</button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
