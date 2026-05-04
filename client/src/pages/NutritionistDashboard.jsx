import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Users, ClipboardList, Settings, UserPlus, Search } from 'lucide-react';
import api from '../lib/api';

import AddClientModal from '../components/AddClientModal';
import ReviewLogModal from '../components/ReviewLogModal';

export default function NutritionistDashboard() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [pendingLogs, setPendingLogs] = useState([]);
    const [stats, setStats] = useState({ clients: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [clientsRes, pendingRes] = await Promise.all([
                api.get('/nutritionist/clients'),
                api.get('/nutritionist/logs/pending')
            ]);
            setClients(clientsRes.data);
            setPendingLogs(pendingRes.data);
            setStats({
                clients: clientsRes.data.length,
                pending: pendingRes.data.length
            });
        } catch (err) {
            console.error("Failed to fetch nutritionist data", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Nutritionist Portal 🩺</h1>
                    <p className="text-[var(--color-text-muted)]">Monitor and guide your clients' nutrition.</p>
                </div>
                <Button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
                    <UserPlus size={18} /> Add Client
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
                    <CardContent className="p-6">
                        <p className="text-blue-100 font-medium">Active Clients</p>
                        <h2 className="text-4xl font-bold mt-1">{stats.clients}</h2>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none">
                    <CardContent className="p-6">
                        <p className="text-orange-100 font-medium">Pending Reviews</p>
                        <h2 className="text-4xl font-bold mt-1">{stats.pending}</h2>
                    </CardContent>
                </Card>
            </div>



            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[var(--color-secondary)]">My Clients</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            placeholder="Search clients..."
                            className="pl-9 pr-4 py-1.5 rounded-full border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-48 transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map(client => {
                        const clientPendingCount = pendingLogs.filter(log => log.profiles?.user_id === client.id).length;
                        return (
                            <Card
                                key={client.id}
                                onClick={() => navigate(`/nutritionist/client/${client.id}`, { state: { clientName: client.full_name } })}
                                className="hover:shadow-lg transition-all cursor-pointer border border-[var(--color-divider)] relative group"
                            >
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] relative">
                                        <Users size={24} />
                                        {clientPendingCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white dark:border-zinc-900 text-[8px] font-black text-white items-center justify-center">
                                                    {clientPendingCount}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[var(--color-secondary)] truncate">{client.full_name}</h3>
                                        <p className="text-xs text-[var(--color-text-muted)] truncate">{client.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {client.status}
                                        </div>
                                        {clientPendingCount > 0 && (
                                            <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest animate-pulse">Needs Review</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {clients.length === 0 && (
                        <p className="col-span-full text-center py-12 text-[var(--color-text-muted)] bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-[var(--color-divider)]">
                            No clients linked yet. Start by adding a parent portal account.
                        </p>
                    )}
                </div>
            </section>

            <AddClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onClientAdded={fetchData}
            />

            <ReviewLogModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                log={selectedLog}
                onReviewComplete={fetchData}
            />
        </div>
    );
}
