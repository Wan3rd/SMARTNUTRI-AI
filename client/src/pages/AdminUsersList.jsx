import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Notification from '../components/common/Notification';
import { Users, Search, Shield, User, Clock, Trash2, ShieldAlert, CheckCircle2, XCircle, ChevronDown, UserCog, AlertCircle, Filter, ShieldCheck, Lock, RefreshCw, Download, ChevronLeft, ChevronRight, Eye, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import api from '../lib/api';

import UserDetailsModal from '../admin/components/UserDetailsModal';
import CreateUserModal from '../admin/components/CreateUserModal';

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

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        fetchUsers();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [page, roleFilter, statusFilter, debouncedSearch]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 50,
                search: debouncedSearch,
                role: roleFilter,
                status: statusFilter
            });
            const res = await api.get(`/admin/users?${params.toString()}`);
            setUsers(res.data.data);
            setTotalPages(res.data.meta.totalPages);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectUser = (id) => setSelectedUsers(p => p.includes(id) ? p.filter(uid => uid !== id) : [...p, id]);
    const selectAllUsers = () => setSelectedUsers(selectedUsers.length === users.length && users.length > 0 ? [] : users.map(u => u.id));

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
        const rows = users.map(u => [u.id, u.full_name, u.email, u.role, u.status || 'verified', new Date(u.created_at).toLocaleDateString(), u.is_suspended, u.force_password_reset]);
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
            await api.patch(`/admin/users/${userId}/status`, { status });
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
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-[var(--color-text-main)] tracking-tight">User Directory</h1>
                    </div>
                    <p className="text-[var(--color-text-muted)] font-medium">Complete administrative oversight of all platform accounts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportCSV} className="h-12 px-5 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] text-[var(--color-text-main)] hover:bg-[var(--color-primary)]/10 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm shrink-0">
                        <Download size={14} /> Export CSV
                    </button>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] gap-2 shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
                        <UserPlus size={16} /> Provision Account
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2 border-b lg:border-b-0 lg:border-r border-[var(--color-divider)]">
                    <Filter size={14} className="text-[var(--color-text-muted)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Filters</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 px-2 lg:px-0 flex-1">
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="flex-1 w-full px-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] cursor-pointer hover:text-[var(--color-primary)] transition-colors border lg:border-0 border-[var(--color-divider)] lg:border-r"
                    >
                        <option value="all">All Roles</option>
                        <option value="parent">Parents</option>
                        <option value="nutritionist">Nutritionists</option>
                        <option value="admin">Administrators</option>
                    </select>

                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 w-full px-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] cursor-pointer hover:text-[var(--color-primary)] transition-colors border lg:border-0 border-[var(--color-divider)] lg:border-r"
                    >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>

                <div className="flex-1 lg:min-w-[200px] relative px-2 lg:px-0 pb-2 lg:pb-0">
                    <Search className="absolute left-6 lg:left-4 top-1/2 -translate-y-1/2 lg:-mt-0 -mt-1 text-[var(--color-text-muted)] opacity-30" size={16} />
                    <input
                        type="text"
                        placeholder="Search directory by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 lg:py-2 bg-[var(--color-bg-page)] lg:bg-transparent rounded-xl lg:rounded-none border lg:border-0 border-[var(--color-divider)] lg:border-l outline-none font-bold text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]/50"
                    />
                </div>
            </div>

            {selectedUsers.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]/30 rounded-2xl animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)]">{selectedUsers.length} Users Selected</span>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button onClick={() => setConfirmBulkStatus({ isOpen: true, status: 'approved' })} className="flex-1 md:flex-none h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Approve</Button>
                        <Button onClick={() => setConfirmBulkSuspend({ isOpen: true, isSuspend: true })} className="flex-1 md:flex-none h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Suspend</Button>
                        <Button onClick={() => setConfirmBulkSuspend({ isOpen: true, isSuspend: false })} className="flex-1 md:flex-none h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Reactivate</Button>
                        <Button onClick={() => setSelectedUsers([])} className="w-full md:w-auto h-9 px-4 bg-transparent border border-[var(--color-primary)] text-[var(--color-primary)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--color-primary)]/10">Cancel</Button>
                    </div>
                </div>
            )}



            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <CardContent className="p-0 overflow-visible">
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-page)] text-left border-b border-[var(--color-divider)]">
                                    <th className="px-6 py-5 w-12">
                                        <input type="checkbox" onChange={selectAllUsers} checked={users.length > 0 && selectedUsers.length === users.length} className="w-4 h-4 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">User Identity</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Role</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Auth Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Platform Entry</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-right">Administrative Actions</th>
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
                                            <td className="px-6 py-4"><div className="h-8 bg-gray-200 dark:bg-white/10 rounded-lg w-28 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-[var(--color-bg-page)]/50 transition-colors group cursor-pointer"
                                        onClick={() => fetchDeepDetails(user.id)}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} className="w-4 h-4 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
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
                                        <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                {user.role === 'nutritionist' && (
                                                    <Tooltip text={user.status === 'approved' ? 'Revoke Approval' : 'Approve Practitioner'}>
                                                        <button
                                                            onClick={() => setConfirmStatus({
                                                                isOpen: true,
                                                                userId: user.id,
                                                                status: user.status === 'approved' ? 'pending' : 'approved'
                                                            })}
                                                            className={`p-2 rounded-lg transition-all ${user.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10' : 'text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                                                        >
                                                            <CheckCircle2 size={16} />
                                                        </button>
                                                    </Tooltip>
                                                )}

                                                {/* Role Switcher */}
                                                {currentUser?.id !== user.id && (
                                                    <div className="relative" ref={activeDropdown === user.id ? dropdownRef : null}>
                                                        <Tooltip text="Change User Role">
                                                            <button
                                                                onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                                                                className="p-2 hover:bg-[var(--color-bg-page)] rounded-lg transition-all text-[var(--color-text-muted)] hover:text-blue-500"
                                                            >
                                                                <UserCog size={16} />
                                                            </button>
                                                        </Tooltip>

                                                        {activeDropdown === user.id && (
                                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-[150] p-2 animate-in fade-in slide-in-from-top-2">
                                                                <div className="px-3 py-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest border-b border-[var(--color-divider)] mb-1">Select Authority Level</div>
                                                                {[
                                                                    { id: 'parent', label: 'Parent / Caregiver', color: 'text-emerald-500' },
                                                                    { id: 'nutritionist', label: 'Clinical Nutritionist', color: 'text-blue-500' }
                                                                ].map(r => (
                                                                    <button
                                                                        key={r.id}
                                                                        onClick={() => handleRoleChange(user.id, r.id)}
                                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] flex items-center justify-between group/opt ${user.role === r.id ? 'bg-[var(--color-bg-page)]' : 'text-[var(--color-text-muted)]'}`}
                                                                    >
                                                                        <span className={user.role === r.id ? r.color : ''}>{r.label}</span>
                                                                        {user.role === r.id && <CheckCircle2 size={12} className={r.color} />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Force Password Reset Toggle */}
                                                {currentUser?.id !== user.id && (
                                                    <Tooltip text={user.force_password_reset ? 'Clear Forced Reset' : 'Force Password Reset'}>
                                                        <button
                                                            onClick={() => setConfirmReset({ isOpen: true, userId: user.id, currentState: user.force_password_reset })}
                                                            className={`p-2 rounded-lg transition-all ${user.force_password_reset ? 'text-violet-500 bg-violet-500/10' : 'text-[var(--color-text-muted)] hover:text-violet-500 hover:bg-violet-500/10'}`}
                                                        >
                                                            <RefreshCw size={16} className={user.force_password_reset ? 'animate-spin-slow' : ''} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {currentUser?.id !== user.id && (
                                                    <Tooltip text={user.is_suspended ? 'Reactivate Account' : 'Suspend Account'}>
                                                        <button
                                                            onClick={() => setConfirmSuspend({ isOpen: true, userId: user.id, currentStatus: user.is_suspended })}
                                                            className={`p-2 rounded-lg transition-all ${user.is_suspended ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10'}`}
                                                        >
                                                            {user.is_suspended ? <ShieldCheck size={16} /> : <Lock size={16} />}
                                                        </button>
                                                    </Tooltip>
                                                )}

                                                {/* Delete Action */}
                                                {currentUser?.id !== user.id && (
                                                    <Tooltip text="Delete Account" align="right">
                                                        <button
                                                            onClick={() => setConfirmDelete({ isOpen: true, userId: user.id })}
                                                            disabled={processingId === user.id}
                                                            className="p-2 hover:bg-rose-500/10 rounded-lg transition-all text-[var(--color-text-muted)] hover:text-rose-500"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </Tooltip>
                                                )}
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

                    <div className="lg:hidden divide-y divide-[var(--color-divider)]">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="p-5 animate-pulse flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-white/10"></div>
                                            <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0"></div>
                                            <div className="space-y-2 w-28">
                                                <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                                                <div className="h-2.5 bg-gray-200 dark:bg-white/5 rounded w-2/3"></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex flex-col items-end">
                                            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-12"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-16"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-divider)]">
                                        <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-20"></div>
                                        <div className="h-8 bg-gray-200 dark:bg-white/10 rounded-lg w-32"></div>
                                    </div>
                                </div>
                            ))
                        ) : filteredUsers.map(user => (
                            <div key={user.id} className="p-4 bg-[var(--color-bg-card)] flex flex-col gap-4 active:bg-gray-50 transition-colors" onClick={() => fetchDeepDetails(user.id)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleSelectUser(user.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-5 h-5 rounded border-[var(--color-divider)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] animate-scale-up"
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] overflow-hidden shrink-0">
                                                {user.profile_image_url ? (
                                                    <img src={user.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-[var(--color-text-main)] truncate max-w-[150px]">{user.full_name}</div>
                                                <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate max-w-[150px]">{user.email}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)]">{user.role}</span>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : user.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{user.status || 'verified'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-divider)]" onClick={(e) => e.stopPropagation()}>
                                    <div className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                        Joined: {new Date(user.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex gap-2">
                                        {user.role === 'nutritionist' && (
                                            <button
                                                onClick={() => setConfirmStatus({
                                                    isOpen: true,
                                                    userId: user.id,
                                                    status: user.status === 'approved' ? 'pending' : 'approved'
                                                })}
                                                className={`p-2 rounded-lg transition-all ${user.status === 'approved' ? 'text-emerald-500 bg-emerald-500/10' : 'text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10'}`}
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                        {currentUser?.id !== user.id && (
                                            <div className="relative" ref={activeDropdown === user.id ? dropdownRef : null}>
                                                <button
                                                    onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                                                    className="p-2 hover:bg-[var(--color-bg-page)] rounded-lg transition-all text-[var(--color-text-muted)] hover:text-blue-500"
                                                >
                                                    <UserCog size={16} />
                                                </button>

                                                {activeDropdown === user.id && (
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-[150] p-2 animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="px-3 py-2 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest border-b border-[var(--color-divider)] mb-1">Select Authority Level</div>
                                                        {[
                                                            { id: 'parent', label: 'Parent / Caregiver', color: 'text-emerald-500' },
                                                            { id: 'nutritionist', label: 'Clinical Nutritionist', color: 'text-blue-500' }
                                                        ].map(r => (
                                                            <button
                                                                key={r.id}
                                                                onClick={() => handleRoleChange(user.id, r.id)}
                                                                className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[var(--color-bg-page)] flex items-center justify-between group/opt ${user.role === r.id ? 'bg-[var(--color-bg-page)]' : 'text-[var(--color-text-muted)]'}`}
                                                            >
                                                                <span className={user.role === r.id ? r.color : ''}>{r.label}</span>
                                                                {user.role === r.id && <CheckCircle2 size={12} className={r.color} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {currentUser?.id !== user.id && (
                                            <button
                                                onClick={() => setConfirmSuspend({ isOpen: true, userId: user.id, currentStatus: user.is_suspended })}
                                                className={`p-2 rounded-lg transition-all ${user.is_suspended ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10'}`}
                                            >
                                                {user.is_suspended ? <ShieldCheck size={16} /> : <Lock size={16} />}
                                            </button>
                                        )}
                                        {currentUser?.id !== user.id && (
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, userId: user.id })}
                                                className="p-2 bg-rose-500/10 rounded-lg text-rose-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>

                <div className="p-4 border-t border-[var(--color-divider)] flex items-center justify-between bg-zinc-50 dark:bg-white/5">
                    <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-9 px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-primary)]/10 text-xs font-bold disabled:opacity-50">Prev</button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-9 px-4 bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-primary)]/10 text-xs font-bold disabled:opacity-50">Next</button>
                    </div>
                </div>
            </Card>

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
                title={confirmStatus.status === 'approved' ? 'Confirm Practitioner Approval' : 'Revoke Practitioner Access'}
                message={confirmStatus.status === 'approved'
                    ? "Are you sure you want to approve this practitioner? This will grant them full clinical access to manage patient profiles and meal plans."
                    : "Are you sure you want to revoke this practitioner's approval? They will lose clinical access and move back to the verification queue."}
                confirmText={confirmStatus.status === 'approved' ? "Approve Account" : "Revoke Access"}
                isDestructive={confirmStatus.status !== 'approved'}
                loading={processingId !== null}
            />

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
