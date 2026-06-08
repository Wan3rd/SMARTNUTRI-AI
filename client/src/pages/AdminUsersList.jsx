import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Notification from '../components/common/Notification';
import { Users, Search, Shield, User, Clock, Trash2, ShieldAlert, CheckCircle2, XCircle, ChevronDown, UserCog, AlertCircle, Filter, ShieldCheck, Lock, RefreshCw, Download, ChevronLeft, ChevronRight, Eye, UserPlus, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

import UserDetailsModal from '../admin/components/UserDetailsModal';
import CreateUserModal from '../admin/components/CreateUserModal';

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'parent', label: 'Parents' },
    { value: 'nutritionist', label: 'Nutritionists' },
    { value: 'admin', label: 'Administrators' }
];

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' }
];

function FilterDropdown({ value, onChange, options, label }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="relative flex-1" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-9 sm:h-11 px-2.5 sm:px-4 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none font-black uppercase tracking-widest text-[7.5px] xs:text-[8px] sm:text-[10px] text-[var(--color-text-main)] hover:text-[var(--color-primary)] transition-all border lg:border-0 border-[var(--color-divider)] lg:border-r flex items-center justify-between gap-1 sm:gap-2 cursor-pointer min-w-0"
            >
                <div className="flex flex-col items-start text-left min-w-0 flex-1 mr-1">
                    <span className="text-[6px] xs:text-[6.5px] sm:text-[7.5px] text-[var(--color-text-muted)] tracking-wider uppercase font-black truncate w-full">{label}</span>
                    <span className="truncate w-full">{selectedOption.label}</span>
                </div>
                <ChevronDown className={cn("text-[var(--color-text-muted)] w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 lg:left-0 lg:right-auto lg:w-56 mt-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-[100] p-1.5 sm:p-2 flex flex-col gap-1 overflow-hidden"
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-between",
                                    value === opt.value
                                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                        : "text-[var(--color-text-main)] hover:bg-[var(--color-bg-page)]"
                                )}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--color-primary)]" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AdminUsersList() {
    const { user: currentUser } = useAuth();
    const dropdownRef = useRef(null);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, userId: null });
    const [confirmStatus, setConfirmStatus] = useState({ isOpen: false, userId: null, status: '' });
    const [confirmSuspend, setConfirmSuspend] = useState({ isOpen: false, userId: null, currentStatus: false });
    const [confirmReset, setConfirmReset] = useState({ isOpen: false, userId: null, currentState: false });
    const [confirmBulkSuspend, setConfirmBulkSuspend] = useState({ isOpen: false, isSuspend: false });
    const [confirmBulkStatus, setConfirmBulkStatus] = useState({ isOpen: false, status: '' });
    const [message, setMessage] = useState({ type: 'success', text: '' });
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionPreset, setRejectionPreset] = useState('');

    useEffect(() => {
        if (confirmStatus.isOpen && confirmStatus.status === 'rejected') {
            setRejectionReason('');
            setRejectionPreset('');
        }
    }, [confirmStatus.isOpen, confirmStatus.status]);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [mobileActionsUser, setMobileActionsUser] = useState(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            controller.abort();
        };
    }, [page, roleFilter, statusFilter, debouncedSearch]);

    const fetchUsers = async (signal) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 50,
                search: debouncedSearch,
                role: roleFilter,
                status: statusFilter
            });
            const res = await api.get(`/admin/users?${params.toString()}`, { signal });
            setUsers(res.data?.data || []);
            setTotalPages(res.data?.meta?.totalPages || 1);
        } catch (err) {
            if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                return;
            }
            console.error("Failed to fetch users", err);
            setMessage({ type: 'error', text: 'Failed to retrieve directory data. Please reload.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectUser = (id) => {
        if (id === currentUser?.id) return;
        setSelectedUsers(p => p.includes(id) ? p.filter(uid => uid !== id) : [...p, id]);
    };
    const selectAllUsers = () => {
        const selectableUsers = users.filter(u => u.id !== currentUser?.id);
        const allSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedUsers.includes(u.id));
        setSelectedUsers(allSelected ? [] : selectableUsers.map(u => u.id));
    };

    const handleBulkSuspendAction = async () => {
        const { isSuspend } = confirmBulkSuspend;
        setProcessingId('bulk');
        try {
            await api.patch('/admin/users/bulk-suspend', { userIds: selectedUsers, is_suspended: isSuspend });
            setMessage({ type: 'success', text: `Bulk ${isSuspend ? 'suspension' : 'reactivation'} successful` });
            setSelectedUsers([]);
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Bulk action failed' });
        } finally {
            setProcessingId(null);
            setConfirmBulkSuspend({ isOpen: false, isSuspend: false });
        }
    };

    const handleBulkStatusAction = async () => {
        const { status } = confirmBulkStatus;
        setProcessingId('bulk');
        try {
            await api.patch('/admin/users/bulk-status', { userIds: selectedUsers, status });
            setMessage({ type: 'success', text: `Bulk practitioner status updated to ${status}` });
            setSelectedUsers([]);
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Bulk status update failed' });
        } finally {
            setProcessingId(null);
            setConfirmBulkStatus({ isOpen: false, status: '' });
        }
    };

    const exportCSV = () => {
        const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined Date', 'Suspended', 'Forced Reset'];
        const escapeCSVValue = (val) => {
            if (val === undefined || val === null) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
        };
        const rows = users.map(u => [
            escapeCSVValue(u.id),
            escapeCSVValue(u.full_name),
            escapeCSVValue(u.email),
            escapeCSVValue(u.role),
            escapeCSVValue(u.status || 'verified'),
            escapeCSVValue(new Date(u.created_at).toLocaleDateString()),
            escapeCSVValue(u.is_suspended),
            escapeCSVValue(u.force_password_reset)
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `smartnutri_users_page_${page}.csv`;
        link.click();
    };

    const fetchDeepDetails = async (id) => {
        setDetailsLoading(true);
        try {
            const res = await api.get(`/admin/users/${id}/details`);
            setSelectedUserDetails(res.data);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to retrieve deep user data' });
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            setMessage({ type: 'success', text: 'User authorization level updated' });
            fetchUsers();
            setActiveDropdown(null);
        } catch (err) {
            setMessage({ type: 'error', text: 'Role update failed' });
        }
    };

    const handleStatusChange = async () => {
        const { userId, status } = confirmStatus;
        if (!userId) return;
        setProcessingId(userId);
        try {
            await api.patch(`/admin/users/${userId}/status`, { 
                status,
                reason: status === 'rejected' ? rejectionReason : null
            });
            setMessage({ type: 'success', text: `Nutritionist access ${status}` });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Access update failed' });
        } finally {
            setProcessingId(null);
            setConfirmStatus({ isOpen: false, userId: null, status: '' });
        }
    };

    const handleSuspendToggle = async () => {
        const { userId, currentStatus } = confirmSuspend;
        if (!userId) return;
        const isSuspending = !currentStatus;
        setProcessingId(userId);
        try {
            await api.patch(`/admin/users/${userId}/suspend`, { is_suspended: isSuspending });
            setMessage({ type: 'success', text: `Account successfully ${isSuspending ? 'suspended' : 'reactivated'}` });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Suspension toggle failed' });
        } finally {
            setProcessingId(null);
            setConfirmSuspend({ isOpen: false, userId: null, currentStatus: false });
        }
    };

    const handleForceReset = async () => {
        const { userId, currentState } = confirmReset;
        if (!userId) return;
        setProcessingId(userId);
        try {
            await api.patch(`/admin/users/${userId}/force-reset`, { force_password_reset: !currentState });
            setMessage({ type: 'success', text: `Forced password reset policy ${!currentState ? 'initiated' : 'cleared'}` });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Action failed' });
        } finally {
            setProcessingId(null);
            setConfirmReset({ isOpen: false, userId: null, currentState: false });
        }
    };

    const handleDelete = async () => {
        const userId = confirmDelete.userId;
        if (!userId) return;
        setProcessingId(userId);
        try {
            await api.delete(`/admin/users/${userId}`);
            setMessage({ type: 'success', text: 'Account permanently eradicated' });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Account deletion failed' });
        } finally {
            setProcessingId(null);
            setConfirmDelete({ isOpen: false, userId: null });
        }
    };

    const filteredUsers = users; // filtered on backend

    const Tooltip = ({ text, children, align = 'center' }) => (
        <div className="group/tip relative inline-block">
            {children}
            <div className={`absolute bottom-full mb-2 ${align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'} hidden group-hover/tip:block z-50`}>
                <div className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg whitespace-nowrap">
                    {text}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div>
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-2">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tight">User Directory</h1>
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-[var(--color-text-muted)] font-medium leading-relaxed">Complete administrative oversight of all platform accounts.</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button 
                        onClick={exportCSV} 
                        className="flex-1 sm:flex-none justify-center h-9 sm:h-12 px-3 sm:px-5 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] text-[var(--color-text-main)] hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all rounded-xl sm:rounded-2xl text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-2 shadow-sm cursor-pointer min-w-0"
                    >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Export CSV</span>
                    </button>
                    <Button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="flex-1 sm:flex-none justify-center h-9 sm:h-12 px-3 sm:px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-wider xs:tracking-[0.15em] text-[8px] xs:text-[9px] sm:text-[10px] gap-1 sm:gap-2 shadow-lg shadow-[var(--color-primary)]/20 min-w-0"
                    >
                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Provision<span className="hidden xs:inline"> Account</span></span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border-b lg:border-b-0 lg:border-r border-[var(--color-divider)]">
                    <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-text-muted)]" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Filters</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 px-2 lg:px-0 flex-1">
                    <FilterDropdown 
                        value={roleFilter}
                        onChange={(val) => {
                            setRoleFilter(val);
                            setPage(1);
                        }}
                        options={ROLE_OPTIONS}
                        label="Authority Role"
                    />

                    <FilterDropdown 
                        value={statusFilter}
                        onChange={(val) => {
                            setStatusFilter(val);
                            setPage(1);
                        }}
                        options={STATUS_OPTIONS}
                        label="Account Status"
                    />
                </div>

                <div className="flex-1 lg:min-w-[200px] relative px-2 lg:px-0 pb-1.5 lg:pb-0">
                    <Search className="absolute left-5 sm:left-6 lg:left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <input
                        type="text"
                        placeholder="Search directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 sm:h-11 pl-9 sm:pl-10 pr-8 sm:pr-9 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none border lg:border-0 border-[var(--color-divider)] lg:border-l outline-none font-bold text-xs sm:text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]/50"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-5 sm:right-6 lg:right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                        >
                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-60 hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedUsers.length > 0 && (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="fixed bottom-6 left-0 right-0 mx-auto z-[80] max-w-2xl w-[90%] md:w-full bg-[var(--color-bg-card)]/90 backdrop-blur-md border-2 border-[var(--color-primary)]/30 rounded-[1.8rem] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-black">
                                {selectedUsers.length}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)]">Bulk Selection Active</span>
                        </div>
                        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => setConfirmBulkStatus({ isOpen: true, status: 'approved' })} 
                                className="flex-1 md:flex-none h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-emerald-500/10 cursor-pointer animate-scale-up"
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => setConfirmBulkSuspend({ isOpen: true, isSuspend: true })} 
                                className="flex-1 md:flex-none h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-amber-500/10 cursor-pointer animate-scale-up"
                            >
                                Suspend
                            </button>
                            <button 
                                onClick={() => setConfirmBulkSuspend({ isOpen: true, isSuspend: false })} 
                                className="flex-1 md:flex-none h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-blue-500/10 cursor-pointer animate-scale-up"
                            >
                                Reactivate
                            </button>
                            <button 
                                onClick={() => setSelectedUsers([])} 
                                className="w-full md:w-auto h-9 px-4 bg-transparent border border-[var(--color-divider)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-page)] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                            >
                                Clear
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <CardContent className="p-0 overflow-visible">
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-page)] text-left border-b border-[var(--color-divider)]">
                                    <th className="px-6 py-5 w-12">
                                        <input type="checkbox" onChange={selectAllUsers} checked={users.length > 0 && users.filter(u => u.id !== currentUser?.id).length > 0 && users.filter(u => u.id !== currentUser?.id).every(u => selectedUsers.includes(u.id))} className="w-4 h-4 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer" />
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">User Identity</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Role</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Auth Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Platform Entry</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-divider)]">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-white/10 rounded"></div></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0"></div>
                                                    <div className="space-y-2 w-32">
                                                        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                                                        <div className="h-2 bg-gray-200 dark:bg-white/5 rounded w-2/3"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-200 dark:bg-white/10 rounded-lg w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-5 bg-gray-200 dark:bg-white/10 rounded-full w-16"></div></td>
                                            <td className="px-6 py-4"><div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-24"></div></td>
                                            <td className="px-6 py-4 w-24"><div className="h-8 bg-gray-200 dark:bg-white/10 rounded-lg w-10 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-[var(--color-bg-page)]/50 transition-colors group cursor-pointer"
                                        onClick={() => fetchDeepDetails(user.id)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(user.id)} 
                                                onChange={() => toggleSelectUser(user.id)} 
                                                disabled={user.id === currentUser?.id}
                                                className="w-4 h-4 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" 
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] flex items-center justify-center font-black text-[var(--color-text-muted)] overflow-hidden shrink-0">
                                                    {user.profile_image_url ? (
                                                        <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={cn("text-sm font-black text-[var(--color-text-main)]", currentUser?.privacy_mode && "privacy-blur", user.is_suspended && "opacity-40")}>{user.full_name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] text-[var(--color-text-muted)] font-medium">{user.email}</div>
                                                        {user.is_suspended && (
                                                            <span className="flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest border border-amber-500/20">
                                                                <Lock size={8} /> Suspended
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-bg-page)] rounded-lg border border-[var(--color-divider)] w-fit">
                                                    {user.role === 'admin' ? (
                                                        <Shield size={12} className="text-violet-500" />
                                                    ) : user.role === 'nutritionist' ? (
                                                        <UserCog size={12} className="text-blue-500" />
                                                    ) : (
                                                        <Users size={12} className="text-emerald-500" />
                                                    )}
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-main)]">{user.role}</span>
                                                </div>
                                                {user.role === 'nutritionist' && (
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-tight ml-1">
                                                        <span className="font-mono text-blue-500/70">ID: {user.professional_id || user.license_no || '---'}</span>
                                                        {user.license_image_url && (
                                                            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                                                <Eye size={10} />
                                                                <span>Doc</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'nutritionist' ? (
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                        user.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                                    }`}>
                                                    {user.status || 'pending'}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Verified</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-[var(--color-text-muted)]">
                                            {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-right relative w-24" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end relative" ref={activeDropdown === user.id ? dropdownRef : null}>
                                                <button
                                                    onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                                                    className={cn(
                                                        "p-2 hover:bg-[var(--color-bg-page)] rounded-xl transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer border border-transparent",
                                                        activeDropdown === user.id && "bg-[var(--color-bg-page)] border-[var(--color-divider)] text-[var(--color-text-main)]"
                                                    )}
                                                    title="Administrative Actions"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                <AnimatePresence>
                                                    {activeDropdown === user.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                            transition={{ duration: 0.15, type: 'spring', damping: 20, stiffness: 300 }}
                                                            className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-[150] p-2 flex flex-col gap-1 text-left"
                                                        >
                                                            {/* User context header */}
                                                            <div className="px-3 py-1.5 border-b border-[var(--color-divider)] mb-1">
                                                                <div className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider truncate">{user.full_name}</div>
                                                                <div className="text-[7.5px] text-[var(--color-text-muted)]/70 font-mono truncate">{user.email}</div>
                                                            </div>

                                                            {/* General Section */}
                                                            <button
                                                                onClick={() => {
                                                                    fetchDeepDetails(user.id);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Eye size={12} className="text-blue-500" />
                                                                <span>View Profile</span>
                                                            </button>

                                                            {/* Practitioner Status Section (only for nutritionist) */}
                                                            {user.role === 'nutritionist' && (
                                                                <>
                                                                    <div className="h-px bg-[var(--color-divider)] my-1" />
                                                                    <div className="px-3 py-1 text-[7.5px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Verification</div>
                                                                    
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmStatus({
                                                                                isOpen: true,
                                                                                userId: user.id,
                                                                                status: user.status === 'approved' ? 'pending' : 'approved'
                                                                            });
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex items-center gap-2 cursor-pointer"
                                                                    >
                                                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                                                        <span>{user.status === 'approved' ? 'Revoke Approval' : 'Approve Practitioner'}</span>
                                                                    </button>

                                                                    {user.status !== 'rejected' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setConfirmStatus({
                                                                                    isOpen: true,
                                                                                    userId: user.id,
                                                                                    status: 'rejected'
                                                                                });
                                                                                setActiveDropdown(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex items-center gap-2 cursor-pointer"
                                                                        >
                                                                            <XCircle size={12} className="text-rose-500" />
                                                                            <span>Reject Credentials</span>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* Authority Level Section (cannot edit self) */}
                                                            {currentUser?.id !== user.id && (
                                                                <>
                                                                    <div className="h-px bg-[var(--color-divider)] my-1" />
                                                                    <div className="px-3 py-1 text-[7.5px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Authority Level</div>
                                                                    {[
                                                                        { id: 'parent', label: 'Parent / Caregiver', color: 'text-emerald-500', icon: Users },
                                                                        { id: 'nutritionist', label: 'Clinical Nutritionist', color: 'text-blue-500', icon: UserCog }
                                                                    ].map(r => {
                                                                        const IconComponent = r.icon;
                                                                        return (
                                                                            <button
                                                                                key={r.id}
                                                                                onClick={() => {
                                                                                    handleRoleChange(user.id, r.id);
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] flex items-center justify-between cursor-pointer",
                                                                                    user.role === r.id ? "bg-[var(--color-bg-page)]" : "text-[var(--color-text-muted)]"
                                                                                )}
                                                                            >
                                                                                <span className="flex items-center gap-2">
                                                                                    <IconComponent size={12} className={user.role === r.id ? r.color : ''} />
                                                                                    <span className={user.role === r.id ? r.color : ''}>{r.label}</span>
                                                                                </span>
                                                                                {user.role === r.id && <CheckCircle2 size={10} className={r.color} />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}

                                                            {/* Security & Access Section (cannot edit self) */}
                                                            {currentUser?.id !== user.id && (
                                                                <>
                                                                    <div className="h-px bg-[var(--color-divider)] my-1" />
                                                                    <div className="px-3 py-1 text-[7.5px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Security & Access</div>
                                                                    
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmReset({
                                                                                isOpen: true,
                                                                                userId: user.id,
                                                                                currentState: user.force_password_reset
                                                                            });
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex items-center gap-2 cursor-pointer"
                                                                    >
                                                                        <RefreshCw size={12} className={cn("text-violet-500", user.force_password_reset && "animate-spin-slow")} />
                                                                        <span>{user.force_password_reset ? 'Clear Forced Reset' : 'Force Password Reset'}</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmSuspend({
                                                                                isOpen: true,
                                                                                userId: user.id,
                                                                                currentStatus: user.is_suspended
                                                                            });
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex items-center gap-2 cursor-pointer"
                                                                    >
                                                                        {user.is_suspended ? (
                                                                            <>
                                                                                <ShieldCheck size={12} className="text-emerald-500" />
                                                                                <span>Reactivate Account</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Lock size={12} className="text-amber-500" />
                                                                                <span>Suspend Account</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* Danger Area (cannot delete self) */}
                                                            {currentUser?.id !== user.id && (
                                                                <>
                                                                    <div className="h-px bg-[var(--color-divider)] my-1" />
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmDelete({
                                                                                isOpen: true,
                                                                                userId: user.id
                                                                            });
                                                                            setActiveDropdown(null);
                                                                        }}
                                                                        disabled={processingId === user.id}
                                                                        className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-500/10 text-rose-600 flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    >
                                                                        <Trash2 size={12} className="text-rose-500" />
                                                                        <span>Delete Account</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!loading && filteredUsers.length === 0 && (
                        <div className="p-20 text-center text-[var(--color-text-muted)] italic font-medium">No accounts found matching your criteria.</div>
                    )}

                    {/* Mobile Grid View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 lg:hidden bg-[var(--color-bg-page)]/20">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="p-3 xs:p-3.5 sm:p-5 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-[1.5rem] animate-pulse flex flex-col gap-2.5 sm:gap-4">
                                    <div className="flex items-center justify-between gap-2 sm:gap-3.5">
                                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded bg-gray-200 dark:bg-white/10 animate-scale-up shrink-0" />
                                            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0" />
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="h-2.5 sm:h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
                                                <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-white/5 rounded w-1/2" />
                                            </div>
                                        </div>
                                        <div className="w-12 h-3 sm:w-16 sm:h-4 bg-gray-200 dark:bg-white/10 rounded animate-scale-up shrink-0" />
                                    </div>
                                    <div className="flex justify-between items-center pt-2.5 sm:pt-3 border-t border-[var(--color-divider)]">
                                        <div className="h-2 sm:h-2.5 bg-gray-200 dark:bg-white/5 rounded w-16 sm:w-24" />
                                        <div className="h-2 sm:h-2.5 bg-gray-200 dark:bg-white/10 rounded w-8 sm:w-12" />
                                    </div>
                                </div>
                            ))
                        ) : filteredUsers.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => setMobileActionsUser(user)}
                                className="relative p-3 xs:p-3.5 sm:p-5 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl sm:rounded-[1.5rem] shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-200 cursor-pointer flex flex-col justify-between gap-2.5 sm:gap-4 overflow-hidden group border-l-4 sm:border-l-[5px]"
                                style={{
                                    borderLeftColor: user.role === 'admin' ? '#8b5cf6' : user.role === 'nutritionist' ? '#3b82f6' : '#10b981'
                                }}
                            >
                                {/* Card Body: Checkbox, PFP, Name & Badges */}
                                <div className="flex items-center justify-between gap-2 sm:gap-3.5 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                                disabled={user.id === currentUser?.id}
                                                className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                            />
                                        </div>
                                        <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] overflow-hidden shrink-0 shadow-inner">
                                            {user.profile_image_url ? (
                                                <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[var(--color-text-muted)]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={cn("text-[11px] xs:text-xs sm:text-sm font-black text-[var(--color-text-main)] truncate", currentUser?.privacy_mode && "privacy-blur", user.is_suspended && "opacity-40")}>{user.full_name}</div>
                                            <div className="text-[8.5px] xs:text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-medium truncate">{user.email}</div>
                                            {user.is_suspended && (
                                                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[6.5px] xs:text-[7px] sm:text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest border border-amber-500/20 mt-0.5">
                                                    <Lock size={7} className="sm:size-2" /> Suspended
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="text-[6.5px] xs:text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 sm:px-2 rounded-md border border-[var(--color-primary)]/20">
                                            {user.role}
                                        </span>
                                        {user.role === 'nutritionist' ? (
                                            <span className={`px-1.5 py-0.5 sm:px-2 rounded text-[6.5px] xs:text-[7px] sm:text-[8px] font-black uppercase tracking-widest border ${
                                                user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                user.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                            }`}>
                                                {user.status || 'pending'}
                                            </span>
                                        ) : (
                                            <span className="text-[6.5px] xs:text-[7px] sm:text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 sm:px-2 rounded border border-[var(--color-divider)]">Verified</span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer: Metadata & Call to Action */}
                                <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-[var(--color-divider)] text-[8.5px] xs:text-[9px] sm:text-[10px] min-w-0">
                                    <div className="font-bold text-[var(--color-text-muted)] truncate max-w-[65%] sm:max-w-none mr-2">
                                        Joined: {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <span className="text-[7.5px] xs:text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-0.5 sm:gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                                        Manage <ChevronRight size={8} className="sm:size-[10px]" />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>

                <div className="p-3 sm:p-4 border-t border-[var(--color-divider)] flex items-center justify-between bg-zinc-50 dark:bg-white/5">
                    <span className="text-[10px] sm:text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Page {page} of {totalPages}</span>
                    <div className="flex gap-1.5 sm:gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 sm:h-9 px-3 sm:px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg sm:rounded-xl hover:bg-[var(--color-primary)]/10 text-[10px] sm:text-xs font-bold disabled:opacity-50 transition-all cursor-pointer">Prev</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-8 sm:h-9 px-3 sm:px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg sm:rounded-xl hover:bg-[var(--color-primary)]/10 text-[10px] sm:text-xs font-bold disabled:opacity-50 transition-all cursor-pointer">Next</button>
                    </div>
                </div>
            </Card>

            {/* Mobile Actions Bottom Drawer */}
            <AnimatePresence>
                {mobileActionsUser && (
                    <div className="fixed inset-0 z-[120] lg:hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileActionsUser(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 280 }}
                            className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-divider)] rounded-t-[2rem] shadow-2xl p-6 flex flex-col gap-6 max-h-[85vh] overflow-y-auto"
                        >
                            {/* Drag handle */}
                            <div className="w-12 h-1.5 bg-[var(--color-divider)] rounded-full mx-auto cursor-pointer" onClick={() => setMobileActionsUser(null)} />
                            
                            {/* Header */}
                            <div className="flex items-center gap-4 border-b border-[var(--color-divider)] pb-4">
                                <div className="h-12 w-12 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0 overflow-hidden">
                                    {mobileActionsUser.profile_image_url ? (
                                        <img src={mobileActionsUser.profile_image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-black text-[var(--color-text-main)] truncate">{mobileActionsUser.full_name}</h4>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">{mobileActionsUser.email}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-md border border-[var(--color-primary)]/20 shrink-0">
                                    {mobileActionsUser.role}
                                </span>
                            </div>

                            {/* Actions List */}
                            <div className="space-y-4">
                                {/* View Details */}
                                <button
                                    onClick={() => {
                                        fetchDeepDetails(mobileActionsUser.id);
                                        setMobileActionsUser(null);
                                    }}
                                    className="w-full flex items-center gap-3 p-3.5 bg-[var(--color-bg-page)] hover:bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-main)] transition-colors text-left cursor-pointer"
                                >
                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                        <Eye size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-black uppercase tracking-wider">View Detailed Profile</div>
                                        <div className="text-[10px] text-[var(--color-text-muted)]">Check clinical status, license documents, and linked patients.</div>
                                    </div>
                                </button>

                                {/* Practitioner Approval & Rejection */}
                                {mobileActionsUser.role === 'nutritionist' && (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => {
                                                setConfirmStatus({
                                                    isOpen: true,
                                                    userId: mobileActionsUser.id,
                                                    status: mobileActionsUser.status === 'approved' ? 'pending' : 'approved'
                                                });
                                                setMobileActionsUser(null);
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 bg-[var(--color-bg-page)] hover:bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-main)] transition-colors text-left cursor-pointer"
                                        >
                                            <div className={`p-2 rounded-lg ${mobileActionsUser.status === 'approved' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[11px] font-black uppercase tracking-wider">
                                                    {mobileActionsUser.status === 'approved' ? 'Revoke Approval' : 'Approve Practitioner'}
                                                </div>
                                                <div className="text-[10px] text-[var(--color-text-muted)]">
                                                    {mobileActionsUser.status === 'approved' ? 'Change status to pending review' : 'Grant active clinical access'}
                                                </div>
                                            </div>
                                        </button>
                                        
                                        {mobileActionsUser.status !== 'rejected' && (
                                            <button
                                                onClick={() => {
                                                    setConfirmStatus({
                                                        isOpen: true,
                                                        userId: mobileActionsUser.id,
                                                        status: 'rejected'
                                                    });
                                                    setMobileActionsUser(null);
                                                }}
                                                className="w-full flex items-center gap-3 p-3.5 bg-[var(--color-bg-page)] hover:bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-main)] transition-colors text-left cursor-pointer"
                                            >
                                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                                    <XCircle size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[11px] font-black uppercase tracking-wider text-rose-500">
                                                        Reject Practitioner
                                                    </div>
                                                    <div className="text-[10px] text-[var(--color-text-muted)]">
                                                        Deny clinical credentials and block patient access
                                                    </div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Security options (Suspend, Reset Password) */}
                                {currentUser?.id !== mobileActionsUser.id && (
                                    <>
                                        {/* Role Changer */}
                                        <div className="p-3.5 bg-[var(--color-bg-page)] rounded-xl border border-[var(--color-divider)] space-y-3">
                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Modify User Authorization</div>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'parent', label: 'Parent' },
                                                    { id: 'nutritionist', label: 'Nutritionist' }
                                                ].map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => {
                                                            handleRoleChange(mobileActionsUser.id, r.id);
                                                            setMobileActionsUser(null);
                                                        }}
                                                        className={`flex-1 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                            mobileActionsUser.role === r.id 
                                                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm animate-scale-up' 
                                                                : 'border-[var(--color-divider)] text-[var(--color-text-muted)] bg-[var(--color-bg-card)]'
                                                        }`}
                                                    >
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Suspend / Reactivate */}
                                        <button
                                            onClick={() => {
                                                setConfirmSuspend({
                                                    isOpen: true,
                                                    userId: mobileActionsUser.id,
                                                    currentStatus: mobileActionsUser.is_suspended
                                                });
                                                setMobileActionsUser(null);
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 bg-[var(--color-bg-page)] hover:bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-main)] transition-colors text-left cursor-pointer"
                                        >
                                            <div className={`p-2 rounded-lg ${mobileActionsUser.is_suspended ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {mobileActionsUser.is_suspended ? <ShieldCheck size={16} /> : <Lock size={16} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[11px] font-black uppercase tracking-wider">
                                                    {mobileActionsUser.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                                                </div>
                                                <div className="text-[10px] text-[var(--color-text-muted)]">
                                                    {mobileActionsUser.is_suspended ? 'Allow user to log in again' : 'Instantly revoke all access tokens'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Force Password Reset */}
                                        <button
                                            onClick={() => {
                                                setConfirmReset({
                                                    isOpen: true,
                                                    userId: mobileActionsUser.id,
                                                    currentState: mobileActionsUser.force_password_reset
                                                });
                                                setMobileActionsUser(null);
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 bg-[var(--color-bg-page)] hover:bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-main)] transition-colors text-left cursor-pointer"
                                        >
                                            <div className={`p-2 rounded-lg ${mobileActionsUser.force_password_reset ? 'bg-violet-500/10 text-violet-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                                <RefreshCw size={16} className={mobileActionsUser.force_password_reset ? 'animate-spin-slow' : ''} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[11px] font-black uppercase tracking-wider">
                                                    {mobileActionsUser.force_password_reset ? 'Clear Password Force' : 'Force Password Reset'}
                                                </div>
                                                <div className="text-[10px] text-[var(--color-text-muted)]">
                                                    {mobileActionsUser.force_password_reset ? 'Cancel the reset policy requirement' : 'Force reset on next login attempt'}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Permanent Deletion */}
                                        <button
                                            onClick={() => {
                                                setConfirmDelete({
                                                    isOpen: true,
                                                    userId: mobileActionsUser.id
                                                });
                                                setMobileActionsUser(null);
                                            }}
                                            className="w-full flex items-center gap-3 p-3.5 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-600 transition-colors text-left cursor-pointer"
                                        >
                                            <div className="p-2 bg-rose-500/15 text-rose-600 rounded-lg">
                                                <Trash2 size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[11px] font-black uppercase tracking-wider text-rose-600">Delete Account</div>
                                                <div className="text-[10px] text-rose-500/70">Permanently purge all data from the database.</div>
                                            </div>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={() => setMobileActionsUser(null)}
                                className="w-full h-11 bg-[var(--color-bg-page)] border border-[var(--color-divider)] hover:bg-[var(--color-primary)]/5 text-[var(--color-text-main)] rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, userId: null })}
                onConfirm={handleDelete}
                title="Critical Account Deletion"
                message="Are you sure you want to permanently delete this account? This action is irreversible and all clinical history, logs, and patient links will be purged from the system."
                confirmText="Delete Permanently"
                isDestructive={true}
                loading={processingId !== null}
            />

            <ConfirmDialog
                isOpen={confirmStatus.isOpen}
                onClose={() => setConfirmStatus({ isOpen: false, userId: null, status: '' })}
                onConfirm={handleStatusChange}
                title={
                    confirmStatus.status === 'approved' ? 'Confirm Practitioner Approval' : 
                    confirmStatus.status === 'rejected' ? 'Reject Practitioner Credentials' : 
                    'Revoke Practitioner Access'
                }
                message={
                    confirmStatus.status === 'approved'
                        ? "Are you sure you want to approve this practitioner? This will grant them full clinical access to manage patient profiles and meal plans."
                        : confirmStatus.status === 'rejected'
                        ? "Are you sure you want to reject this practitioner? Their credential status will be marked as rejected and they will be barred from platform actions."
                        : "Are you sure you want to revoke this practitioner's approval? They will lose clinical access and move back to the verification queue."
                }
                confirmText={
                    confirmStatus.status === 'approved' ? "Approve Account" : 
                    confirmStatus.status === 'rejected' ? "Reject Account" : 
                    "Revoke Access"
                }
                isDestructive={confirmStatus.status !== 'approved'}
                loading={processingId !== null}
                confirmDisabled={confirmStatus.status === 'rejected' && !rejectionReason.trim()}
            >
                {confirmStatus.status === 'rejected' && (
                    <div className="space-y-3 mt-3 text-left">
                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-1">Rejection Reason Preset</label>
                        <select
                            value={rejectionPreset}
                            onChange={(e) => {
                                const val = e.target.value;
                                setRejectionPreset(val);
                                if (val && val !== 'Other') {
                                    setRejectionReason(val);
                                } else if (val === 'Other') {
                                    setRejectionReason('');
                                }
                            }}
                            className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] text-xs font-semibold outline-none focus:border-rose-500 cursor-pointer"
                        >
                            <option value="">Select a preset reason...</option>
                            <option value="Blurry ID / PRC Document photo provided. Please upload a clearer photo.">Blurry ID / PRC Document</option>
                            <option value="Invalid or expired professional registration license number.">Invalid / Expired License Number</option>
                            <option value="Incorrect Clinic / Hospital affiliation details.">Incorrect Clinic Details</option>
                            <option value="The practitioner name does not match the uploaded credential ID name.">Verification Name Discrepancy</option>
                            <option value="Other">Other (Write Custom Reason Below)</option>
                        </select>

                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-1">Detailed Reason (Mandatory)</label>
                        <textarea
                            placeholder="Enter detailed reason here so the practitioner knows what to correct..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-3 text-xs rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] outline-none focus:border-rose-500 min-h-[90px] font-medium resize-none"
                            required
                        />
                    </div>
                )}
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={confirmSuspend.isOpen}
                onClose={() => setConfirmSuspend({ isOpen: false, userId: null, currentStatus: false })}
                onConfirm={handleSuspendToggle}
                title={confirmSuspend.currentStatus ? "Reactivate User Account" : "Suspend User Account"}
                message={confirmSuspend.currentStatus 
                    ? "Are you sure you want to reactivate this account? The user will immediately regain platform access."
                    : "Are you sure you want to suspend this account? The user will be immediately locked out and their session will be terminated."}
                confirmText={confirmSuspend.currentStatus ? "Reactivate Account" : "Suspend Account"}
                isDestructive={!confirmSuspend.currentStatus}
                loading={processingId !== null}
            />

            <ConfirmDialog
                isOpen={confirmReset.isOpen}
                onClose={() => setConfirmReset({ isOpen: false, userId: null, currentState: false })}
                onConfirm={handleForceReset}
                title={confirmReset.currentState ? "Clear Force Password Reset" : "Force Password Reset"}
                message={confirmReset.currentState
                    ? "Are you sure you want to clear the forced password reset requirement for this user?"
                    : "Are you sure you want to force this user to reset their password on their next login?"}
                confirmText={confirmReset.currentState ? "Clear Requirement" : "Force Reset"}
                isDestructive={!confirmReset.currentState}
                loading={processingId !== null}
            />

            <ConfirmDialog
                isOpen={confirmBulkSuspend.isOpen}
                onClose={() => setConfirmBulkSuspend({ isOpen: false, isSuspend: false })}
                onConfirm={handleBulkSuspendAction}
                title={confirmBulkSuspend.isSuspend ? "Bulk Suspend Accounts" : "Bulk Reactivate Accounts"}
                message={confirmBulkSuspend.isSuspend
                    ? `Are you sure you want to suspend the ${selectedUsers.length} selected accounts? They will immediately lose platform access.`
                    : `Are you sure you want to reactivate the ${selectedUsers.length} selected accounts? They will regain platform access.`}
                confirmText={confirmBulkSuspend.isSuspend ? "Suspend All" : "Reactivate All"}
                isDestructive={confirmBulkSuspend.isSuspend}
                loading={processingId !== null}
            />

            <ConfirmDialog
                isOpen={confirmBulkStatus.isOpen}
                onClose={() => setConfirmBulkStatus({ isOpen: false, status: '' })}
                onConfirm={handleBulkStatusAction}
                title="Bulk Approve Status"
                message={`Are you sure you want to approve the ${selectedUsers.length} selected accounts? This will grant them active status.`}
                confirmText="Approve All"
                isDestructive={false}
                loading={processingId !== null}
            />

            {/* Extracted Modals */}
            <UserDetailsModal 
                selectedUserDetails={selectedUserDetails} 
                currentUser={currentUser} 
                onClose={() => setSelectedUserDetails(null)} 
                loading={detailsLoading}
            />

            <CreateUserModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSuccess={(msg) => {
                    setMessage({ type: 'success', text: msg });
                    fetchUsers();
                }} 
            />

            <Notification
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ ...message, text: '' })}
            />
        </div>
    );
}
