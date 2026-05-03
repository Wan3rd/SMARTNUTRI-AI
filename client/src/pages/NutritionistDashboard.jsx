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
                    {clients.map(client => (
                        <Card
                            key={client.id}
                            onClick={() => navigate(`/nutritionist/client/${client.id}`, { state: { clientName: client.full_name } })}
                            className="hover:shadow-lg transition-shadow cursor-pointer border border-[var(--color-divider)]"
                        >
                            <CardContent className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                    <Users size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[var(--color-secondary)]">{client.full_name}</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">{client.email}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {client.status}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {clients.length === 0 && (
                        <p className="col-span-full text-center py-12 text-[var(--color-text-muted)] bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-[var(--color-divider)]">
                            No clients linked yet. Start by adding a parent portal account.
                        </p>
                    )}
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-secondary)]">Pending Reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingLogs.map(log => (
                        <Card
                            key={log.id}
                            onClick={() => { setSelectedLog(log); setIsReviewOpen(true); }}
                            className="hover:shadow-lg transition-shadow cursor-pointer border border-[var(--color-divider)] group overflow-hidden"
                        >
                            <CardContent className="p-0">
                                <div className="h-48 relative overflow-hidden">
                                    <img src={log.image_url} alt="Meal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                                        <p className="text-white font-bold">{log.child_name}</p>
                                        <p className="text-white/80 text-xs">{new Date(log.logged_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                        Pending
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                                        {log.ai_analysis?.items?.map(i => i.name).join(', ') || 'No analysis available'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {pendingLogs.length === 0 && (
                        <div className="col-span-full text-center py-12 text-[var(--color-text-muted)] bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-[var(--color-divider)]">
                            <p>All caught up! No pending meal reviews.</p>
                        </div>
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
