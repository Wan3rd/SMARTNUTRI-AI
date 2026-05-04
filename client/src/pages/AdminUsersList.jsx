import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Users, Search, Shield, User, Clock, Trash2, ShieldAlert, CheckCircle2, XCircle, ChevronDown, UserCog, AlertCircle, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function AdminUsersList() {
    const { user: currentUser } = useAuth();
    const dropdownRef = useRef(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [processingId, setProcessingId] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, userId: null });
    const [confirmStatus, setConfirmStatus] = useState({ isOpen: false, userId: null, status: '' });

    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'parent',
        professional_id: '',
        clinic: ''
    });

    useEffect(() => {
        fetchUsers();
        
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setProcessingId('creating');
        try {
            const res = await api.post('/admin/users', createForm);
            setUsers(prev => [res.data, ...prev]);
            setIsCreateModalOpen(false);
            setCreateForm({ full_name: '', email: '', password: '', role: 'parent', professional_id: '', clinic: '' });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create user");
        } finally {
            setProcessingId(null);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeepDetails = async (id) => {
        setDetailsLoading(true);
        try {
            const res = await api.get(`/admin/users/${id}/details`);
            setSelectedUserDetails(res.data);
        } catch (err) {
            console.error("Failed to fetch user details", err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleDelete = async () => {
        const id = confirmDelete.userId;
        if (!id) return;
        
        setProcessingId(id);
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(prev => prev.filter(u => u.id !== id));
            setConfirmDelete({ isOpen: false, userId: null });
            setSelectedUserDetails(null);
        } catch (err) {
            alert("Deletion failed: " + (err.response?.data?.message || "Server Error"));
        } finally {
            setProcessingId(null);
        }
    };

    const handleRoleChange = async (id, newRole) => {
        setProcessingId(id);
        try {
            await api.patch(`/admin/users/${id}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
            if (selectedUserDetails?.id === id) {
                setSelectedUserDetails(prev => ({ ...prev, role: newRole }));
            }
            setActiveDropdown(null);
        } catch (err) {
            alert("Role update failed");
        } finally {
            setProcessingId(null);
        }
    };

    const handleStatusChange = async () => {
        const { userId, status } = confirmStatus;
        if (!userId) return;

        setProcessingId(userId);
        try {
            await api.patch(`/admin/nutritionists/${userId}/verify`, { status });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
            if (selectedUserDetails?.id === userId) {
                setSelectedUserDetails(prev => ({ ...prev, status }));
            }
            setConfirmStatus({ isOpen: false, userId: null, status: '' });
        } catch (err) {
            alert("Status update failed");
        } finally {
            setProcessingId(null);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || 
                             (u.role === 'nutritionist' ? u.status === statusFilter : statusFilter === 'approved');
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    const Tooltip = ({ text, children, align = 'center' }) => (
        <div className="group/tip relative inline-block">
            {children}
            <div className={`absolute top-full mt-3 px-3 py-2 bg-[var(--color-text-main)] text-[var(--color-bg-card)] text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover/tip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[110] shadow-2xl scale-90 group-hover/tip:scale-100 origin-top border border-white/10 ${
                align === 'right' ? 'right-0' : 
                align === 'left' ? 'left-0' : 
                'left-1/2 -translate-x-1/2'
            }`}>
                <div className={`absolute bottom-full border-[6px] border-transparent border-b-[var(--color-text-main)] ${
                    align === 'right' ? 'right-3' : 
                    align === 'left' ? 'left-3' : 
                    'left-1/2 -translate-x-1/2'
                }`} />
                {text}
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-[var(--color-text-muted)] font-outfit uppercase tracking-widest text-xs">Accessing User Vault...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto font-outfit">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-[var(--color-text-main)] tracking-tight mb-2">User Directory</h1>
                    <p className="text-[var(--color-text-muted)] font-medium max-w-lg">Master platform oversight. Manage clinical credentials, account authority, and platform entry for all practitioners and caregivers.</p>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-14 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-[1.5rem] font-black uppercase tracking-[0.15em] text-[11px] shadow-2xl shadow-[var(--color-primary)]/20 whitespace-nowrap flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <User size={16} />
                    Provision New Account
                </Button>
            </div>

            {/* Filter & Search Command Bar */}
            <div className="flex flex-wrap items-center gap-3 p-2 bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2 border-r border-[var(--color-divider)]">
                    <Filter size={14} className="text-[var(--color-text-muted)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Filters</span>
                </div>
                
                <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 bg-transparent font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                >
                    <option value="all">All Roles</option>
                    <option value="nutritionist">Nutritionists</option>
                    <option value="parent">Parents</option>
                    <option value="admin">Admins</option>
                </select>

                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-transparent font-black uppercase tracking-widest text-[10px] outline-none text-[var(--color-text-main)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                </select>

                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-30" size={16} />
                    <input
                        type="text"
                        placeholder="Search directory by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 bg-transparent outline-none font-bold text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)]/50"
                    />
                </div>
            </div>

            <Card className="border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-xl bg-[var(--color-bg-card)]">
                <CardContent className="p-0 overflow-visible">
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-bg-page)] text-left border-b border-[var(--color-divider)]">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">User Identity</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Role</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Auth Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Platform Entry</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-right">Administrative Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-divider)]">
                                {filteredUsers.map(user => (
                                    <tr 
                                        key={user.id} 
                                        className="hover:bg-[var(--color-bg-page)]/50 transition-colors group cursor-pointer"
                                        onClick={() => fetchDeepDetails(user.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] flex items-center justify-center font-black text-[var(--color-text-muted)]">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-[var(--color-text-main)]">{user.full_name}</div>
                                                    <div className="text-[10px] text-[var(--color-text-muted)] font-medium">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-bg-page)] rounded-lg border border-[var(--color-divider)]">
                                                {user.role === 'admin' ? (
                                                    <Shield size={12} className="text-violet-500" />
                                                ) : user.role === 'nutritionist' ? (
                                                    <UserCog size={12} className="text-blue-500" />
                                                ) : (
                                                    <Users size={12} className="text-emerald-500" />
                                                )}
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-main)]">{user.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === 'nutritionist' ? (
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    user.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
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
                                                {/* Status Cycle Actions */}
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
                    {filteredUsers.length === 0 && (
                        <div className="p-20 text-center text-[var(--color-text-muted)] italic font-medium">No accounts found matching your criteria.</div>
                    )}
                </CardContent>
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

            {/* User Details Master Modal */}
            {selectedUserDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <Card className="max-w-2xl w-full border-2 border-[var(--color-divider)] rounded-[3rem] overflow-hidden shadow-2xl bg-[var(--color-bg-card)]">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className="h-20 w-20 rounded-[2rem] bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)]">
                                        <User size={36} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-[var(--color-text-main)] tracking-tight leading-none mb-2">{selectedUserDetails.full_name}</h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-lg">
                                                {selectedUserDetails.role}
                                            </span>
                                            <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{selectedUserDetails.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedUserDetails(null)}
                                    className="p-3 hover:bg-[var(--color-bg-page)] rounded-2xl transition-all text-[var(--color-text-muted)]"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-[var(--color-bg-page)] rounded-3xl border border-[var(--color-divider)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4">Account Metadata</div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-[var(--color-text-muted)]">Joined Platform</span>
                                            <span className="text-xs font-black text-[var(--color-text-main)]">
                                                {new Date(selectedUserDetails.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-[var(--color-text-muted)]">Contact Number</span>
                                            <span className="text-xs font-black text-[var(--color-text-main)]">
                                                {selectedUserDetails.phone || 'Not Provided'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-[var(--color-text-muted)]">Auth ID</span>
                                            <span className="text-[9px] font-mono text-[var(--color-text-muted)] truncate max-w-[100px]">{selectedUserDetails.id}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-[var(--color-bg-page)] rounded-3xl border border-[var(--color-divider)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4">Security Status</div>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-3 w-3 rounded-full ${selectedUserDetails.role !== 'nutritionist' || selectedUserDetails.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">
                                            {selectedUserDetails.role === 'nutritionist' ? (selectedUserDetails.status || 'Pending Review') : 'Active Member'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Role Specific Deep Data */}
                            {selectedUserDetails.role === 'nutritionist' && selectedUserDetails.professional_id && (
                                <div className="p-8 bg-[var(--color-bg-page)] rounded-[2.5rem] border border-[var(--color-divider)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-6 flex items-center gap-2">
                                        <Shield size={14} className="text-[var(--color-primary)]" />
                                        Professional Credentials
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase">Medical License / ID</div>
                                            <div className="text-sm font-black text-[var(--color-text-main)]">{selectedUserDetails.professional_id}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase">Affiliated Clinic</div>
                                            <div className="text-sm font-black text-[var(--color-text-main)]">{selectedUserDetails.clinic || 'Not Specified'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedUserDetails.role === 'parent' && (
                                <div className="p-8 bg-[var(--color-bg-page)] rounded-[2.5rem] border border-[var(--color-divider)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-6 flex items-center gap-2">
                                        <Users size={14} className="text-[var(--color-primary)]" />
                                        Connected Patient Profiles
                                    </div>
                                    {selectedUserDetails.profiles?.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedUserDetails.profiles.map(child => (
                                                <div key={child.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-divider)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                                            <User size={14} />
                                                        </div>
                                                        <span className="text-xs font-black text-[var(--color-text-main)]">{child.child_name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-bg-page)] px-2 py-1 rounded-md">
                                                        Patient Profile
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs font-medium text-[var(--color-text-muted)] italic">No patient profiles linked to this account.</div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Button 
                                    onClick={() => setSelectedUserDetails(null)}
                                    className="flex-1 h-14 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] text-[var(--color-text-main)] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[var(--color-divider)]"
                                >
                                    Dismiss Inspector
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Account Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <Card className="max-w-md w-full border-2 border-[var(--color-divider)] rounded-[2.5rem] overflow-hidden shadow-2xl bg-[var(--color-bg-card)]">
                        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--color-text-main)] tracking-tight">New Platform Account</h2>
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Administrative Provisioning</p>
                                </div>
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Account Role</label>
                                    <div className="flex gap-2 p-1 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                        {['parent', 'nutritionist', 'admin'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setCreateForm(prev => ({ ...prev, role: r }))}
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${createForm.role === r ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm border border-[var(--color-divider)]' : 'text-[var(--color-text-muted)]'}`}
                                            >
                                                {r === 'parent' ? 'Parent' : r === 'nutritionist' ? 'Practi' : 'Admin'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Full Identity</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter legal name..."
                                        value={createForm.full_name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="user@smartnutri.ai"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Temporary Password</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Min 6 characters..."
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                    />
                                </div>

                                {createForm.role === 'nutritionist' && (
                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">License ID</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="PH-..."
                                                value={createForm.professional_id}
                                                onChange={(e) => setCreateForm(prev => ({ ...prev, professional_id: e.target.value }))}
                                                className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-2">Clinic</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Hospital..."
                                                value={createForm.clinic}
                                                onChange={(e) => setCreateForm(prev => ({ ...prev, clinic: e.target.value }))}
                                                className="w-full px-5 py-3 bg-[var(--color-bg-page)] border border-[var(--color-divider)] rounded-2xl text-sm font-bold outline-none focus:border-[var(--color-primary)] transition-all text-[var(--color-text-main)]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button 
                                type="submit"
                                disabled={processingId === 'creating'}
                                className="w-full h-14 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[var(--color-primary)]/20"
                            >
                                {processingId === 'creating' ? 'Provisioning Account...' : 'Generate Account'}
                            </Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
