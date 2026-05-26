import React, { useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { User, XCircle, Shield, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function UserDetailsModal({ selectedUserDetails, currentUser, onClose, loading }) {
    useEffect(() => {
        if (selectedUserDetails || loading) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedUserDetails, loading]);

    if (loading) {
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in fade-in duration-300"
                onClick={onClose}
            >
                <Card
                    className="max-w-md w-full border-2 border-[var(--color-divider)] rounded-[3rem] overflow-hidden shadow-2xl bg-[var(--color-bg-card)] flex flex-col items-center justify-center p-12 text-center relative gap-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 blur-xl animate-pulse scale-150" />
                        <div className="h-20 w-20 rounded-[2rem] bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center animate-spin-slow shadow-lg shadow-[var(--color-primary)]/5 border-2 border-[var(--color-primary)]/20">
                            <User size={36} className="animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-[var(--color-text-main)] animate-pulse">Retrieving Profile</h3>
                        <p className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider">Synchronizing secure data packets from platform ledger...</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (!selectedUserDetails) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center sm:bg-black/60 sm:backdrop-blur-md sm:p-6 animate-in sm:fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300"
            onClick={onClose}
        >
            <Card
                className="max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[95vh] border-0 sm:border-2 border-[var(--color-divider)] rounded-none sm:rounded-[3rem] overflow-hidden shadow-none sm:shadow-2xl bg-[var(--color-bg-card)] flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="overflow-y-auto flex-1 scrollbar-hide p-4 sm:p-10 space-y-5 sm:space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-[1.2rem] sm:rounded-[2rem] bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] shrink-0 overflow-hidden">
                                {selectedUserDetails.profile_image_url ? (
                                    <img src={selectedUserDetails.profile_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <User size={24} className="sm:hidden" />
                                        <User size={36} className="hidden sm:block" />
                                    </>
                                )}
                            </div>
                            <div>
                                <h2 className={cn("text-xl sm:text-3xl font-black text-[var(--color-text-main)] tracking-tight leading-none mb-1.5", currentUser?.privacy_mode && "privacy-blur")}>{selectedUserDetails.full_name}</h2>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                    <span className="w-fit text-[9px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg">
                                        {selectedUserDetails.role}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] truncate max-w-[180px] sm:max-w-none">{selectedUserDetails.email}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 sm:p-3 hover:bg-[var(--color-bg-page)] rounded-2xl transition-all text-[var(--color-text-muted)]"
                        >
                            <XCircle size={20} className="sm:hidden" />
                            <XCircle size={24} className="hidden sm:block" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 sm:p-6 bg-[var(--color-bg-page)] rounded-2xl sm:rounded-3xl border border-[var(--color-divider)]">
                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-3 sm:mb-4">Account Metadata</div>
                            <div className="space-y-2 sm:space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)]">Joined Platform</span>
                                    <span className="text-[10px] sm:text-xs font-black text-[var(--color-text-main)]">
                                        {new Date(selectedUserDetails.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)]">Contact Number</span>
                                    <span className="text-[10px] sm:text-xs font-black text-[var(--color-text-main)]">
                                        {selectedUserDetails.phone || 'Not Provided'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] sm:text-xs font-bold text-[var(--color-text-muted)]">Auth ID</span>
                                    <span className="text-[8px] sm:text-[9px] font-mono text-[var(--color-text-muted)] truncate max-w-[80px] sm:max-w-[120px]">{selectedUserDetails.id}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 bg-[var(--color-bg-page)] rounded-2xl sm:rounded-3xl border border-[var(--color-divider)]">
                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-3 sm:mb-4">Security Status</div>
                            <div className="flex flex-col gap-2 sm:gap-3">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                    <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${selectedUserDetails.role !== 'nutritionist' || selectedUserDetails.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-text-main)]">
                                        {selectedUserDetails.role === 'nutritionist' ? (selectedUserDetails.status || 'Pending Review') : 'Active Member'}
                                    </span>
                                </div>
                                {selectedUserDetails.is_suspended && (
                                    <div className="flex items-center gap-2.5 sm:gap-3 animate-pulse">
                                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500" />
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-rose-600">Access Suspended</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Role Specific Deep Data */}
                    {selectedUserDetails.role === 'nutritionist' && (
                        <div className="space-y-4">
                            <div className="p-4 sm:p-8 bg-[var(--color-bg-page)] rounded-2xl sm:rounded-[2.5rem] border border-[var(--color-divider)]">
                                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4 sm:mb-6 flex items-center gap-2">
                                    <Shield size={14} className="text-[var(--color-primary)]" />
                                    Professional Credentials
                                </div>
                                <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase">Medical License / ID</div>
                                        <div className="text-xs sm:text-sm font-black text-[var(--color-text-main)] font-mono truncate">{selectedUserDetails.professional_id || selectedUserDetails.license_no || 'NOT PROVIDED'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase">Affiliated Clinic</div>
                                        <div className="text-xs sm:text-sm font-black text-[var(--color-text-main)] truncate">{selectedUserDetails.clinic || 'Not Specified'}</div>
                                    </div>
                                </div>

                                {selectedUserDetails.license_image_url && (
                                    <div>
                                        <div className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] mb-2 sm:mb-3 uppercase tracking-widest">Digital License Certificate</div>
                                        <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[var(--color-divider)] bg-zinc-900 shadow-inner group">
                                            <img src={selectedUserDetails.license_image_url} className="w-full h-full object-cover" />
                                            <a
                                                href={selectedUserDetails.license_image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm"
                                            >
                                                View Full Document
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedUserDetails.role === 'parent' && (
                        <div className="p-4 sm:p-8 bg-[var(--color-bg-page)] rounded-2xl sm:rounded-[2.5rem] border border-[var(--color-divider)]">
                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-4 sm:mb-6 flex items-center gap-2">
                                <Users size={14} className="text-[var(--color-primary)]" />
                                Connected Patient Profiles
                            </div>
                            {selectedUserDetails.profiles?.length > 0 ? (
                                <div className="space-y-2 sm:space-y-3">
                                    {selectedUserDetails.profiles.map(child => (
                                        <div key={child.id} className="flex items-center justify-between p-3 sm:p-4 bg-[var(--color-bg-card)] rounded-xl sm:rounded-2xl border border-[var(--color-divider)]">
                                            <div className="flex items-center gap-2.5 sm:gap-3">
                                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0 overflow-hidden">
                                                    {child.profile_image_url ? (
                                                        <img src={child.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <>
                                                            <User size={12} className="sm:hidden" />
                                                            <User size={14} className="hidden sm:block" />
                                                        </>
                                                    )}
                                                </div>
                                                <span className="text-[11px] sm:text-xs font-black text-[var(--color-text-main)] truncate max-w-[120px] sm:max-w-none">{child.child_name}</span>
                                            </div>
                                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-bg-page)] px-2 py-0.5 sm:py-1 rounded-md">
                                                Patient
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[11px] sm:text-xs font-medium text-[var(--color-text-muted)] italic">No patient profiles linked to this account.</div>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 sm:p-8 bg-gray-50/50 dark:bg-white/5 border-t border-[var(--color-divider)] flex justify-center pb-8 sm:pb-8">
                    <Button
                        onClick={onClose}
                        className="w-full h-11 sm:h-14 bg-white dark:bg-zinc-900 border-2 border-[var(--color-divider)] text-zinc-900 dark:text-zinc-100 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
                    >
                        Dismiss
                    </Button>
                </div>
            </Card>
        </div>
    );
}
