import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Calendar, Filter, Search, CheckCircle2, AlertCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import MealDetailModal from '../components/MealDetailModal';

export default function MealHistory() {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, reviewed
    const [complianceFilter, setComplianceFilter] = useState('all'); // all, compliant, flagged, pending
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 12;

    useEffect(() => {
        fetchProfiles();
    }, []);

    useEffect(() => {
        if (selectedProfile) {
            fetchLogs();
        }
    }, [selectedProfile]);

    useEffect(() => {
        applyFilters();
    }, [logs, statusFilter, complianceFilter, searchQuery, dateRange]);

    const fetchProfiles = async () => {
        try {
            const res = await api.get('/profiles');
            setProfiles(res.data);
            if (res.data.length > 0) setSelectedProfile(res.data[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            console.log('Fetching logs for profile:', selectedProfile.id);
            const res = await api.get(`/logs/profile/${selectedProfile.id}`);
            console.log('Logs fetched successfully:', res.data.length);
            setLogs(res.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
            console.error('Error response:', err.response);
            console.error('Error config:', err.config);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...logs];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(log => log.status === statusFilter);
        }

        // Compliance filter
        if (complianceFilter !== 'all') {
            filtered = filtered.filter(log => log.compliance_status === complianceFilter);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(log => {
                const items = log.ai_analysis?.items?.map(i => i.name.toLowerCase()).join(' ') || '';
                const review = log.nutritionist_review?.title?.toLowerCase() || '';
                return items.includes(searchQuery.toLowerCase()) || review.includes(searchQuery.toLowerCase());
            });
        }

        // Date range filter
        if (dateRange.start) {
            filtered = filtered.filter(log => new Date(log.logged_at) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            filtered = filtered.filter(log => new Date(log.logged_at) <= new Date(dateRange.end));
        }

        setFilteredLogs(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    };

    const getComplianceBadge = (status) => {
        const badges = {
            compliant: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2, label: 'Compliant' },
            flagged: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertCircle, label: 'Flagged' },
            pending: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', icon: Clock, label: 'Pending' }
        };
        return badges[status] || badges.pending;
    };

    const getStatusBadge = (status) => {
        return status === 'reviewed'
            ? { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Reviewed' }
            : { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Pending Review' };
    };

    // Pagination
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    if (loading) {
        return <div className="p-8 text-center text-[var(--color-text-muted)]">Loading meal history...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-secondary)] flex items-center gap-2">
                    <Calendar className="text-[var(--color-primary)]" /> Meal History
                </h1>
                <p className="text-[var(--color-text-muted)] mt-1">Complete tracking of all logged meals</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar: Controls & Filters */}
                <div className="lg:sticky lg:top-8 lg:self-start space-y-6">
                    {/* Profile Selection */}
                    {profiles.length > 1 && (
                        <Card className="border border-[var(--color-divider)]">
                            <CardContent className="p-4">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest block mb-3">
                                    Child Profile
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {profiles.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedProfile(p)}
                                            className={`px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${selectedProfile?.id === p.id
                                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                                }`}
                                        >
                                            {p.child_name}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters Card */}
                    <Card className="border border-[var(--color-divider)]">
                        <CardContent className="p-4 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider flex items-center gap-2">
                                    <Filter size={14} /> Filter Results
                                </h3>
                                {(statusFilter !== 'all' || complianceFilter !== 'all' || searchQuery || dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('all');
                                            setComplianceFilter('all');
                                            setSearchQuery('');
                                            setDateRange({ start: '', end: '' });
                                        }}
                                        className="text-[10px] font-bold text-[var(--color-primary)] hover:underline uppercase"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>

                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Food or title..."
                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Status Filters */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 block">Review Status</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['all', 'pending', 'reviewed'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setStatusFilter(status)}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${statusFilter === status
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                                    : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                                    }`}
                                            >
                                                {status === 'all' ? 'All' : status === 'reviewed' ? 'Reviewed' : 'Pending'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 block">Compliance</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['all', 'compliant', 'flagged', 'pending'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setComplianceFilter(status)}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${complianceFilter === status
                                                    ? 'bg-[var(--color-secondary)] text-white border-[var(--color-secondary)]'
                                                    : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-secondary)]'
                                                    }`}
                                            >
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">Date Range</label>
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs text-[var(--color-text-main)]"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs text-[var(--color-text-main)]"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Area: Content Grid */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight">
                            Found {filteredLogs.length} results
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {currentLogs.map(log => {
                            const complianceBadge = getComplianceBadge(log.compliance_status);
                            const statusBadge = getStatusBadge(log.status);
                            const ComplianceIcon = complianceBadge.icon;

                            return (
                                <Card
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="border border-[var(--color-divider)] hover:border-[var(--color-primary)]/40 hover:shadow-lg transition-all overflow-hidden cursor-pointer group"
                                >
                                    <CardContent className="p-0">
                                        <div className="relative h-40 bg-gray-100 overflow-hidden">
                                            <img src={log.image_url} alt="Meal" className="w-full h-full object-cover group-hover:scale-105 duration-500" />
                                            <div className="absolute top-2 right-2 flex gap-2">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${complianceBadge.color} flex items-center gap-1 shadow-sm`}>
                                                    <ComplianceIcon size={12} />
                                                    {complianceBadge.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                                    {new Date(log.logged_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${statusBadge.color}`}>
                                                    {statusBadge.label}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-[var(--color-secondary)] line-clamp-2 min-h-[3rem]">
                                                {log.nutritionist_review?.title || log.ai_analysis?.items?.map(i => i.name).join(', ') || 'Analyzing...'}
                                            </h3>

                                            <div className="pt-2 border-t border-[var(--color-divider)]">
                                                {log.status === 'reviewed' && log.nutritionist_review?.comment ? (
                                                    <p className="text-[11px] text-[var(--color-text-muted)] italic line-clamp-2 leading-relaxed">
                                                        "{log.nutritionist_review.comment}"
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-orange-500 font-medium italic">
                                                        Waiting for expert review...
                                                    </p>
                                                )}
                                            </div>

                                            {log.compliance_status === 'flagged' && log.violation_details && (
                                                <div className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-1">
                                                    <AlertCircle size={12} /> {log.violation_details.length} rules violated
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {currentLogs.length === 0 && (
                        <div className="py-20 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-[var(--color-divider)]">
                            <Calendar size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-[var(--color-text-muted)] font-bold uppercase tracking-widest text-sm">No meals found</p>
                            <p className="text-xs mt-2 font-medium">Try adjusting your filters on the left.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-10 pb-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="rounded-xl"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded-xl"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Meal Detail Modal */}
            {selectedLog && (
                <MealDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </div>
    );
}
