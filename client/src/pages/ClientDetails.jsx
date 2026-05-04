import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, User, Plus, Trash2, Save, MessageSquare, StickyNote, Utensils, Monitor, Activity, ClipboardCheck, TrendingUp, Info } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Modal from '../components/common/Modal';
import Notification from '../components/common/Notification';
import { AlertTriangle, Bold, Italic, List, ListOrdered } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ReviewLogModal from '../components/ReviewLogModal';

// Global CSS Overrides for Quill Toolbar Visibility
const quillStyles = `
  .ql-toolbar.ql-snow {
    background-color: var(--color-bg-card) !important;
    border: none !important;
    padding: 8px !important;
    display: flex !important;
    align-items: center !important;
  }
  .ql-snow .ql-stroke {
    stroke: var(--color-text-main) !important;
    stroke-width: 2.5px !important;
  }
  .ql-snow .ql-fill {
    fill: var(--color-text-main) !important;
  }
  .ql-snow .ql-picker {
    color: var(--color-text-main) !important;
  }
  .ql-snow.ql-toolbar button:hover .ql-stroke {
    stroke: var(--color-primary) !important;
  }
  .ql-toolbar button {
    cursor: pointer !important;
  }
  
  .ql-editor {
    min-height: 300px !important;
    font-size: 0.875rem !important;
    line-height: 1.6 !important;
    color: var(--color-text-main) !important;
  }
  .ql-container.ql-snow {
    border: none !important;
    background-color: var(--color-bg-card) !important;
  }
`;

export default function ClientDetails() {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();
    const clientName = location.state?.clientName || 'Client';

    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [focusedField, setFocusedField] = useState(null);
    const editorRefs = useRef({});
    const [rules, setRules] = useState([]);

    const applyFormat = (format, value = true) => {
        if (!focusedField) return;
        const quill = editorRefs.current[focusedField]?.getEditor();
        if (quill) {
            quill.focus();
            if (format === 'list') {
                const current = quill.getFormat();
                quill.format('list', current.list === value ? false : value);
            } else {
                const current = quill.getFormat();
                quill.format(format, !current[format]);
            }
        }
    };
    const [newRule, setNewRule] = useState({
        category: 'Calories',
        rule_name: '',
        rule_definition: '',
        rule_type: 'max',
        rule_value: '',
        rule_unit: 'kcal'
    });
    const [standards, setStandards] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Modal & Notif States ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [ruleToDelete, setRuleToDelete] = useState(null);
    const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });

    // --- History State ---
    const [logs, setLogs] = useState([]);

    // --- Insights State ---
    const [reportData, setReportData] = useState(null);

    // --- Notes State ---
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');

    // --- Confirmation Modal State ---
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
    });

    // --- Meal Planner State ---
    const [activeTab, setActiveTab] = useState('profiles');
    const [mealPlan, setMealPlan] = useState([]);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [selectedDateForMeal, setSelectedDateForMeal] = useState(null);
    const [mealForm, setMealForm] = useState({
        meal_type: 'Breakfast',
        recipe_name: '',
        calories: '',
        protein_g: '',
        carbs_g: '',
        fats_g: ''
    });

    // --- ADIME Notes State ---
    const [adimeNotes, setAdimeNotes] = useState([]);
    const [newAdime, setNewAdime] = useState({
        assessment: '',
        diagnosis: '',
        intervention: '',
        monitoring: '',
        evaluation: ''
    });

    // --- Growth State ---
    const [growthLogs, setGrowthLogs] = useState([]);
    const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);
    const [newGrowth, setNewGrowth] = useState({ height_cm: '', weight_kg: '' });
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedLogForReview, setSelectedLogForReview] = useState(null);

    // --- Consultation Mode State ---
    const [isConsultationMode, setIsConsultationMode] = useState(false);

    useEffect(() => {
        if (selectedProfile && activeTab === 'plan') {
            fetchMealPlan(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'insights') {
            fetchReportData(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'notes') {
            fetchNotes(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'history') {
            fetchLogs(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'adime') {
            fetchAdimeNotes(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'overview') {
            fetchGrowthLogs(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'review') {
            fetchLogs(selectedProfile.id);
        }
    }, [selectedProfile, activeTab]);

    const fetchGrowthLogs = async (profileId) => {
        try {
            const res = await api.get(`/profiles/${profileId}/growth`);
            setGrowthLogs(res.data);
        } catch (err) {
            console.error("Error fetching growth logs", err);
        }
    };

    const handleAddGrowthLog = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/profiles/${selectedProfile.id}/growth`, newGrowth);
            fetchGrowthLogs(selectedProfile.id);
            fetchProfiles(); // Update current height/weight in sidebar
            setIsGrowthModalOpen(false);
            setNewGrowth({ height_cm: '', weight_kg: '' });
            showNotif("Growth data updated!");
        } catch (err) {
            console.error("Failed to add growth log", err);
            showNotif("Failed to save data", "error");
        }
    };

    const fetchAdimeNotes = async (profileId) => {
        try {
            const res = await api.get(`/nutritionist/adime-notes/${profileId}`);
            setAdimeNotes(res.data);
        } catch (err) {
            console.error("Error fetching ADIME notes", err);
        }
    };

    const handleAddAdimeNote = async (e) => {
        e.preventDefault();
        try {
            await api.post('/nutritionist/adime-notes', {
                profile_id: selectedProfile.id,
                ...newAdime
            });
            fetchAdimeNotes(selectedProfile.id);
            setNewAdime({
                assessment: '',
                diagnosis: '',
                intervention: '',
                monitoring: '',
                evaluation: ''
            });
            showNotif("Clinical note saved!");
        } catch (err) {
            console.error("Failed to add clinical note", err);
            showNotif("Failed to save note", "error");
        }
    };



    const fetchLogs = async (profileId) => {
        try {
            // Fetch logs for the selected profile
            const res = await api.get(`/logs/profile/${profileId}`);
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching logs", err);
        }
    };

    const fetchNotes = async (profileId) => {
        try {
            const res = await api.get(`/notes/${profileId}`);
            setNotes(res.data);
        } catch (err) {
            console.error("Error fetching notes", err);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            await api.post('/notes', {
                nutritionist_id: user.id,
                client_id: selectedProfile.id,
                content: newNote
            });
            setNewNote('');
            fetchNotes(selectedProfile.id);
        } catch (err) {
            console.error("Error adding note", err);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await api.delete(`/notes/${noteId}`);
            setNotes(notes.filter(n => n.id !== noteId));
        } catch (err) {
            console.error("Error deleting note", err);
        }
    };

    const fetchReportData = async (profileId) => {
        try {
            const res = await api.get(`/reports/compliance/${profileId}`);
            setReportData(res.data);
        } catch (err) {
            console.error("Error fetching report data", err);
        }
    };

    const fetchMealPlan = async (profileId) => {
        try {
            const res = await api.get(`/nutritionist/plan/${profileId}`);
            setMealPlan(res.data);
        } catch (err) {
            console.error("Failed to fetch plan", err);
        }
    };

    const handleAddManualMeal = async (e) => {
        e.preventDefault();
        try {
            await api.post('/nutritionist/plan/meal', {
                profile_id: selectedProfile.id,
                date: selectedDateForMeal,
                ...mealForm
            });
            setIsMealModalOpen(false);
            setMealForm({ meal_type: 'Breakfast', recipe_name: '', calories: '', protein_g: '', carbs_g: '', fats_g: '' });
            fetchMealPlan(selectedProfile.id);
            showNotif("Meal added to plan!");
        } catch (err) {
            console.error("Failed to add meal", err);
            showNotif("Failed to add meal", "error");
        }
    };

    const handleDeleteMeal = async (mealId) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Meal',
            message: 'Are you sure you want to remove this meal from the plan?',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/plan/meal/${mealId}`);
                    setMealPlan(prev => prev.filter(m => m.id !== mealId));
                    showNotif("Meal removed");
                } catch (err) {
                    console.error("Failed to delete meal", err);
                    showNotif("Failed to delete meal", "error");
                }
            },
            type: 'danger'
        });
    };

    const handleClearPlan = async () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear 7-Day Plan',
            message: 'This will permanently delete all meals in the current 7-day schedule. This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/plan/all/${selectedProfile.id}`);
                    setMealPlan([]);
                    showNotif("Meal plan cleared");
                } catch (err) {
                    console.error("Failed to clear plan", err);
                    showNotif("Failed to clear plan", "error");
                }
            },
            type: 'danger'
        });
    };

    const handleGeneratePlan = async () => {
        if (!selectedProfile) return;
        setGeneratingPlan(true);
        try {
            await api.post('/nutritionist/plan/generate', { profileId: selectedProfile.id });
            alert("New 7-day plan generated successfully!");
            fetchMealPlan(selectedProfile.id);
        } catch (err) {
            console.error("Failed to generate plan", err);
            alert("Failed to generate plan. Please try again.");
        } finally {
            setGeneratingPlan(false);
        }
    };

    // Helper to group plan by date
    const groupedPlan = mealPlan.reduce((acc, meal) => {
        const date = new Date(meal.date).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(meal);
        return acc;
    }, {});

    useEffect(() => {
        fetchProfiles();
    }, [clientId]);

    useEffect(() => {
        if (selectedProfile) {
            fetchRules(selectedProfile.id);
            fetchStandards(selectedProfile.id);
        }
    }, [selectedProfile]);

    const fetchStandards = async (profileId) => {
        try {
            const res = await api.get(`/nutritionist/standards/${profileId}`);
            setStandards(res.data);
        } catch (err) {
            console.error("Failed to fetch standards", err);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await api.get(`/nutritionist/clients/${clientId}/profiles`);
            setProfiles(res.data);
            if (res.data.length > 0) setSelectedProfile(res.data[0]);
        } catch (err) {
            console.error("Failed to fetch profiles", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRules = async (profileId) => {
        try {
            const res = await api.get(`/nutritionist/rules/${profileId}`);
            setRules(res.data);
        } catch (err) {
            console.error("Failed to fetch rules", err);
        }
    };

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        try {
            const definition = newRule.rule_definition || `${newRule.rule_type === 'max' ? 'Max' : 'Min'} ${newRule.rule_value}${newRule.rule_unit}`;

            await api.post('/nutritionist/rules', {
                profile_id: selectedProfile.id,
                ...newRule,
                rule_definition: definition
            });
            fetchRules(selectedProfile.id);
            setNewRule({
                category: 'Calories',
                rule_name: '',
                rule_definition: '',
                rule_type: 'max',
                rule_value: '',
                rule_unit: 'kcal'
            });
            showNotif("Rule added successfully!");
        } catch (err) {
            console.error("Failed to add rule", err);
            showNotif("Failed to add rule", "error");
        }
    };

    const confirmDeleteRule = (rule) => {
        setRuleToDelete(rule);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteRule = async () => {
        if (!ruleToDelete) return;
        try {
            await api.delete(`/nutritionist/rules/${ruleToDelete.id}`);
            setRules(rules.filter(r => r.id !== ruleToDelete.id));
            showNotif("Rule deleted successfully!");
            setIsDeleteModalOpen(false);
            setRuleToDelete(null);
        } catch (err) {
            console.error("Failed to delete rule", err);
            showNotif("Failed to delete rule", "error");
        }
    };

    const applyTemplate = (template) => {
        setNewRule({
            ...newRule,
            category: template.category,
            rule_name: template.rule_name,
            rule_type: template.rule_type,
            rule_value: template.rule_value,
            rule_unit: template.rule_unit
        });
    };

    if (loading) return <div className="p-8 text-center">Loading client details...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <style>{quillStyles}</style>
            <header className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeft size={24} />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-secondary)]">{clientName}</h1>
                    <p className="text-[var(--color-text-muted)]">Manage Family Profiles & Rules</p>
                </div>
                <div className="ml-auto">
                    <Button 
                        variant={isConsultationMode ? "primary" : "outline"} 
                        onClick={() => setIsConsultationMode(!isConsultationMode)}
                        className="flex gap-2"
                    >
                        <Monitor size={18} />
                        {isConsultationMode ? "Exit Consultation Mode" : "Enter Consultation Mode"}
                    </Button>
                </div>
            </header>

            {profiles.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        This client hasn't added any child profiles yet.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Sidebar: Profiles */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-[var(--color-secondary)] px-2">Family Profiles</h3>
                        {profiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => { setSelectedProfile(profile); setActiveTab('overview'); }}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedProfile?.id === profile.id
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                    : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${selectedProfile?.id === profile.id ? 'bg-white/30' : 'bg-[var(--color-divider)]'}`}>
                                        <User size={20} className={selectedProfile?.id === profile.id ? 'text-white' : 'text-[var(--color-text-main)]'} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className={`font-black truncate ${selectedProfile?.id === profile.id ? 'text-white' : 'text-[var(--color-text-main)]'}`}>{profile.child_name}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedProfile?.id === profile.id ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                                            {new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()} yrs • {profile.gender}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedProfile && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile: {selectedProfile.child_name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Tabs Navigation */}
                                    <div className="flex gap-6 border-b border-[var(--color-divider)] mb-6 overflow-x-auto">
                                        {[
                                            { id: 'overview', label: 'Overview' },
                                            { id: 'review', label: 'Pending Review' },
                                            { id: 'insights', label: 'Insights' },
                                            { id: 'adime', label: 'Clinical (ADIME)' },
                                            { id: 'notes', label: 'Notes' },
                                            { id: 'rules', label: 'Rules Engine' },
                                            { id: 'plan', label: 'Meal Planner' },
                                            { id: 'history', label: 'Log History' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                className={`pb-3 px-1 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                                    ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                                                    }`}
                                                onClick={() => setActiveTab(tab.id)}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* SHARED CLINICAL TOOLS & REFERENCE (ADIME & Notes) */}
                                    {(activeTab === 'adime' || activeTab === 'notes') && (
                                        <div className="space-y-6 mb-8 animate-in slide-in-from-top-4 duration-500">
                                            {/* TOP QUICK REFERENCE BAR - High Contrast */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border-l-4 border-amber-500 shadow-sm flex flex-col justify-center transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <AlertTriangle size={14} className="text-amber-600" />
                                                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Allergies</span>
                                                    </div>
                                                    <p className="text-sm font-black text-[var(--color-text-main,#1f2937)] truncate">{selectedProfile.allergies?.join(', ') || 'None'}</p>
                                                </div>

                                                <div className="p-4 bg-[var(--color-bg-card,#ffffff)] rounded-xl border-l-4 border-red-500 shadow-sm flex flex-col justify-center transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Info size={14} className="text-red-600" />
                                                        <span className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest">Medical History</span>
                                                    </div>
                                                    <p className="text-sm font-black text-[var(--color-text-main,#1f2937)] truncate" title={selectedProfile.medical_history || 'No history'}>
                                                        {selectedProfile.medical_history || 'None recorded'}
                                                    </p>
                                                </div>

                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border-l-4 border-blue-500 shadow-sm flex flex-col justify-center transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <TrendingUp size={14} className="text-blue-600" />
                                                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Growth Metrics</span>
                                                    </div>
                                                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                                                        {selectedProfile.weight_kg}kg / {selectedProfile.height_cm}cm
                                                    </p>
                                                </div>

                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border-l-4 border-emerald-500 shadow-sm flex flex-col justify-center transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Activity size={14} className="text-emerald-600" />
                                                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Compliance</span>
                                                    </div>
                                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">85% Correct</p>
                                                </div>
                                            </div>

                                            {/* ULTIMATE PROFESSIONAL SHARED TOOLBAR */}
                                            <div className="sticky top-0 z-20 my-4 bg-[var(--color-bg-card)] rounded-xl border-2 border-[var(--color-primary)]/40 shadow-xl overflow-hidden flex items-center justify-center p-1.5 gap-1">
                                                <div className="flex items-center gap-2 px-3 border-r border-[var(--color-divider)]">
                                                    <div className={`w-2 h-2 rounded-full ${focusedField ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                    <span className="text-[10px] font-black text-[var(--color-secondary)] uppercase tracking-widest whitespace-nowrap">
                                                        {focusedField ? `Editor: ${focusedField}` : 'Click to type'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => applyFormat('bold')} className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors text-[var(--color-text-main)] cursor-pointer" title="Bold (Ctrl+B)">
                                                        <Bold size={18} strokeWidth={2.5} />
                                                    </button>
                                                    <button type="button" onClick={() => applyFormat('italic')} className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors text-[var(--color-text-main)] cursor-pointer" title="Italic (Ctrl+I)">
                                                        <Italic size={18} strokeWidth={2.5} />
                                                    </button>
                                                    <button type="button" onClick={() => applyFormat('list', 'bullet')} className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors text-[var(--color-text-main)] cursor-pointer" title="Bulleted List (Ctrl+Shift+8)">
                                                        <List size={18} strokeWidth={2.5} />
                                                    </button>
                                                    <button type="button" onClick={() => applyFormat('list', 'ordered')} className="p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors text-[var(--color-text-main)] cursor-pointer" title="Numbered List (Ctrl+Shift+7)">
                                                        <ListOrdered size={18} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 1: OVERVIEW */}
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Growth Charts */}
                                                <Card className="border border-[var(--color-divider)] shadow-sm bg-[var(--color-bg-card)]">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between items-center">
                                                            <CardTitle className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Weight Tracking (kg)</CardTitle>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-7 text-[10px] font-black border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                                                                onClick={() => setIsGrowthModalOpen(true)}
                                                            >
                                                                <Plus size={12} className="mr-1" /> Log Growth
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="h-[200px]">
                                                        {growthLogs.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={growthLogs}>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                                                    <XAxis 
                                                                        dataKey="logged_at" 
                                                                        tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                                                                        fontSize={10}
                                                                        tick={{fill: 'var(--color-text-muted)'}}
                                                                    />
                                                                    <YAxis fontSize={10} tick={{fill: 'var(--color-text-muted)'}} domain={['auto', 'auto']} />
                                                                    <Tooltip 
                                                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                                        contentStyle={{
                                                                            backgroundColor: 'var(--color-bg-card)',
                                                                            borderColor: 'var(--color-divider)',
                                                                            borderRadius: '12px',
                                                                            color: 'var(--color-text-main)'
                                                                        }}
                                                                    />
                                                                    <Line type="monotone" dataKey="weight_kg" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-primary)'}} activeDot={{r: 6}} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] italic">No weight history logged.</div>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                <Card className="border border-[var(--color-divider)] shadow-sm bg-[var(--color-bg-card)]">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between items-center">
                                                            <CardTitle className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Height Tracking (cm)</CardTitle>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="h-[200px]">
                                                        {growthLogs.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={growthLogs}>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                                                    <XAxis 
                                                                        dataKey="logged_at" 
                                                                        tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                                                                        fontSize={10}
                                                                        tick={{fill: 'var(--color-text-muted)'}}
                                                                    />
                                                                    <YAxis fontSize={10} tick={{fill: 'var(--color-text-muted)'}} domain={['auto', 'auto']} />
                                                                    <Tooltip 
                                                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                                        contentStyle={{
                                                                            backgroundColor: 'var(--color-bg-card)',
                                                                            borderColor: 'var(--color-divider)',
                                                                            borderRadius: '12px',
                                                                            color: 'var(--color-text-main)'
                                                                        }}
                                                                    />
                                                                    <Line type="monotone" dataKey="height_cm" stroke="var(--color-secondary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-secondary)'}} activeDot={{r: 6}} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] italic">No height history logged.</div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <h3 className="font-bold text-lg text-[var(--color-secondary)]">Health & Profile Snapshot</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                    <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Allergies</div>
                                                    <div className="font-bold text-red-500 break-words">
                                                        {selectedProfile.allergies?.length > 0 ? selectedProfile.allergies.join(', ') : 'None'}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                    <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Dietary Prefs</div>
                                                    <div className="font-bold text-[var(--color-text-main)] break-words">
                                                        {selectedProfile.dietary_preferences || 'None'}
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                    <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Activity Level</div>
                                                    <div className="font-bold text-[var(--color-text-main)] capitalize">{selectedProfile.activity_level.replace('_', ' ')}</div>
                                                </div>
                                                <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                    <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Measurements</div>
                                                    <div className="font-bold text-[var(--color-text-main)]">{selectedProfile.weight_kg}kg <span className="opacity-30">/</span> {selectedProfile.height_cm}cm</div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                                <h4 className="font-bold text-green-800 dark:text-green-300 mb-2">Quick Summary</h4>
                                                <p className="text-sm text-green-700 dark:text-green-400">
                                                    This child has <strong>{rules.length} active rules</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: REVIEW */}
                                    {activeTab === 'review' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-[var(--color-secondary)]">Pending Clinical Reviews</h3>
                                                <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                                    {logs.filter(l => l.status === 'pending').length} Actions Required
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {logs.filter(l => l.status === 'pending').map(log => (
                                                    <Card 
                                                        key={log.id} 
                                                        onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                        className="hover:shadow-xl transition-all cursor-pointer border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)] overflow-hidden group"
                                                    >
                                                        <CardContent className="p-0">
                                                            <div className="h-40 relative overflow-hidden">
                                                                <img src={log.image_url} alt="Meal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                                <div className="absolute bottom-3 left-3">
                                                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">{new Date(log.logged_at).toLocaleDateString()}</p>
                                                                    <p className="text-white font-black uppercase text-xs">{log.meal_category}</p>
                                                                </div>
                                                            </div>
                                                            <div className="p-4">
                                                                <p className="text-sm font-bold text-[var(--color-text-main)] line-clamp-1 mb-1">
                                                                    {log.ai_analysis?.items?.map(i => i.name).join(', ') || 'Pending detection...'}
                                                                </p>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] text-[var(--color-text-muted)] font-bold">{log.ai_analysis?.total_calories_est || 0} kcal</span>
                                                                    <span className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest">Review Meal →</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                                {logs.filter(l => l.status === 'pending').length === 0 && (
                                                    <div className="col-span-full py-20 text-center bg-[var(--color-bg-page)] rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                                                        <ClipboardCheck size={48} className="mx-auto text-[var(--color-text-muted)] mb-4 opacity-20" />
                                                        <p className="text-[var(--color-text-muted)] font-black uppercase text-sm tracking-widest">Profile is Up to Date</p>
                                                        <p className="text-xs mt-1">No pending meal reviews for {selectedProfile.child_name}.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: ADIME */}
                                    {activeTab === 'adime' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                <h3 className="font-bold text-lg text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                                                    <MessageSquare size={20} className="text-blue-600" /> Professional Clinical Note (ADIME)
                                                </h3>

                                                <form onSubmit={handleAddAdimeNote} className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        { [
                                                            { key: 'assessment', label: 'Assessment' },
                                                            { key: 'diagnosis', label: 'Diagnosis' },
                                                            { key: 'intervention', label: 'Intervention' },
                                                            { key: 'monitoring', label: 'Monitoring & Evaluation' }
                                                        ].map((field, idx) => (
                                                            <div key={idx} className="space-y-1">
                                                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2 block">{field.label}</label>
                                                                <div className={`bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 transition-all ${focusedField === field.key ? 'border-[var(--color-primary)] shadow-md scale-[1.01]' : 'border-[var(--color-divider)]'}`}>
                                                                    <ReactQuill 
                                                                        ref={el => editorRefs.current[field.key] = el}
                                                                        theme="snow"
                                                                        value={newAdime[field.key]}
                                                                        onChange={(val) => setNewAdime({ ...newAdime, [field.key]: val })}
                                                                        onFocus={() => setFocusedField(field.key)}
                                                                        modules={{ toolbar: false }}
                                                                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                                                            <Save size={18} /> Save ADIME Note
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-[var(--color-secondary)] uppercase text-xs tracking-wider">Historical Clinical Notes</h4>
                                                {adimeNotes.length === 0 ? (
                                                    <p className="text-center py-8 text-gray-500 italic">No historical ADIME records found.</p>
                                                ) : (
                                                    adimeNotes.map(note => (
                                                        <div key={note.id} className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 space-y-3">
                                                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                                                                <span className="text-xs font-bold text-blue-600 uppercase">ADIME RECORD</span>
                                                                <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {[
                                                                    { key: 'assessment', label: 'Assessment' },
                                                                    { key: 'diagnosis', label: 'Diagnosis' },
                                                                    { key: 'intervention', label: 'Intervention' },
                                                                    { key: 'monitoring', label: 'Monitoring/Eval' }
                                                                ].map((field, idx) => (
                                                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                                        <p className="text-[10px] font-black text-[var(--color-primary)] uppercase mb-2 tracking-widest">{field.label}</p>
                                                                        <div 
                                                                            className="text-sm prose prose-sm dark:prose-invert max-w-none"
                                                                            dangerouslySetInnerHTML={{ __html: note[field.key] || '<em class="text-gray-400">No data recorded.</em>' }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: NOTES */}
                                    {activeTab === 'notes' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800/30">
                                                <h3 className="font-bold text-lg text-[var(--color-secondary)] mb-4 flex items-center gap-2">
                                                    <StickyNote size={20} className="text-[var(--color-primary)]" /> Client Observation Notes
                                                </h3>


                                                <form onSubmit={handleAddNote} className="space-y-3">
                                                    <div className={`bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 transition-all ${focusedField === 'notes' ? 'border-[var(--color-primary)] shadow-md scale-[1.01]' : 'border-[var(--color-divider)]'}`}>
                                                    <ReactQuill 
                                                        ref={el => editorRefs.current['notes'] = el}
                                                        theme="snow"
                                                        value={newNote}
                                                        onChange={setNewNote}
                                                        onFocus={() => setFocusedField('notes')}
                                                        modules={{ toolbar: false }}
                                                        placeholder="Add a new observation, milestone, or follow-up note..."
                                                    />
                                                </div>
                                                    <div className="flex justify-end pt-2">
                                                        <Button type="submit" disabled={!newNote.trim()} className="bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/20">
                                                            Save Clinical Note
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>

                                            <div className="space-y-4">
                                                <h4 className="font-bold text-[var(--color-secondary)] uppercase text-xs tracking-wider px-2">Recent Observations</h4>
                                                {notes.length === 0 ? (
                                                    <p className="text-center py-12 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-white/5 rounded-xl border-2 border-dashed">No notes added for this profile yet.</p>
                                                ) : (
                                                    notes.map(note => (
                                                        <div key={note.id} className={`p-5 border rounded-xl relative group hover:shadow-md transition-all ${note.is_pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white dark:bg-white/5 border-[var(--color-divider)]'}`}>
                                                            {note.is_pinned && <span className="absolute top-2 right-4 text-[10px] font-black text-yellow-600 uppercase flex items-center gap-1">📌 Pinned</span>}
                                                            
                                                            <div 
                                                                className="prose prose-sm dark:prose-invert max-w-none mb-4"
                                                                dangerouslySetInnerHTML={{ __html: note.content }}
                                                            />

                                                            <div className="flex justify-between items-center pt-3 border-t border-[var(--color-divider)]">
                                                                <span className="text-xs font-medium text-[var(--color-text-muted)]">{new Date(note.created_at).toLocaleString()}</span>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => api.patch(`/notes/${note.id}/pin`, { is_pinned: !note.is_pinned }).then(() => fetchNotes(selectedProfile.id))}
                                                                        className={`h-8 w-8 p-0 rounded-full transition-colors ${note.is_pinned ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 hover:text-[var(--color-primary)]'}`}
                                                                        title={note.is_pinned ? "Unpin" : "Pin Note"}
                                                                    >
                                                                        <Plus size={16} className={note.is_pinned ? "rotate-45" : ""} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => handleDeleteNote(note.id)}
                                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                                        title="Delete Note"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}



                                    {/* TAB: INSIGHTS */}
                                    {activeTab === 'insights' && reportData && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="p-6 rounded-xl border bg-white dark:bg-white/5 shadow-sm text-center">
                                                    <p className="text-sm text-[var(--color-text-muted)]">Compliance Rate (30 Days)</p>
                                                    <p className="text-4xl font-bold text-[var(--color-primary)] mt-2">{reportData.summary.complianceRate}%</p>
                                                </div>
                                                <div className="p-6 rounded-xl border bg-white dark:bg-white/5 shadow-sm text-center">
                                                    <p className="text-sm text-[var(--color-text-muted)]">Total Meals Logged</p>
                                                    <p className="text-4xl font-bold text-[var(--color-secondary)] mt-2">{reportData.summary.totalLogs}</p>
                                                </div>
                                                <div className="p-6 rounded-xl border bg-white dark:bg-white/5 shadow-sm text-center">
                                                    <p className="text-sm text-[var(--color-text-muted)]">Flagged Interactions</p>
                                                    <p className="text-4xl font-bold text-red-500 mt-2">{reportData.summary.flaggedCount}</p>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-xl border bg-white dark:bg-white/5 shadow-sm">
                                                <h3 className="font-bold mb-6">Health Score & Compliance Trend</h3>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart
                                                            data={logs.slice().reverse()}
                                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                                            <XAxis dataKey="logged_at" stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                                                            <YAxis stroke="var(--color-text-muted)" fontSize={12} domain={[0, 100]} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-divider)', color: 'var(--color-text-main)' }}
                                                            />
                                                            <Legend />
                                                            <Line type="monotone" dataKey="compliance_score" name="Daily Compliance Score" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: RULES */}
                                    {activeTab === 'rules' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-lg text-[var(--color-secondary)]">Nutrition Rules & Compliance Goals</h3>
                                            </div>

                                            <div className="space-y-3">
                                                {rules.length === 0 ? (
                                                    <p className="text-sm text-center py-8 text-[var(--color-text-muted)] italic bg-[var(--color-bg-page)] dark:bg-white/5 rounded-xl border-2 border-dashed border-[var(--color-divider)]">
                                                        No custom rules set. Add one below to start automated checks.
                                                    </p>
                                                ) : (
                                                    rules.map(rule => (
                                                        <div key={rule.id} className="flex justify-between items-start p-4 border border-[var(--color-divider)] rounded-xl bg-[var(--color-bg-card)] shadow-sm hover:shadow-md transition-shadow">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${rule.category === 'Sugar' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' :
                                                                        rule.category === 'Protein' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                                                                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-400 dark:border-white/10'
                                                                        }`}>
                                                                        {rule.category}
                                                                    </span>
                                                                    <span className="font-bold text-base text-[var(--color-text-main)]">{rule.rule_name}</span>
                                                                </div>
                                                                <p className="text-sm text-[var(--color-text-muted)] pl-1">
                                                                    {rule.rule_type ? `${rule.rule_type === 'max' ? 'Maximum' : 'Minimum'} ${rule.rule_value} ${rule.rule_unit}` : rule.rule_definition}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => confirmDeleteRule(rule)}
                                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0 rounded-full"
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Add Rule Form */}
                                            <div className="pt-6 mt-6 border-t border-[var(--color-divider)]">
                                                <div className="flex justify-between items-end mb-4">
                                                    <h4 className="font-bold text-sm text-[var(--color-primary)] uppercase tracking-wider">Quick Standards (Templates)</h4>
                                                </div>
                                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                                    {standards.map((s, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => applyTemplate(s)}
                                                            className="px-3 py-1.5 rounded-full border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                                                        >
                                                            + {s.name}
                                                        </button>
                                                    ))}
                                                </div>

                                                <h4 className="font-bold text-sm mb-4 text-[var(--color-primary)] uppercase tracking-wider">Custom Rule Builder</h4>
                                                <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-[var(--color-bg-page)] dark:bg-white/5 p-6 rounded-xl border border-[var(--color-divider)] shadow-inner">
                                                    <div className="md:col-span-3">
                                                        <label className="block text-xs font-bold mb-1.5 ml-1 text-[var(--color-text-muted)] uppercase">Category</label>
                                                        <select
                                                            className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] transition-all cursor-pointer"
                                                            value={newRule.category}
                                                            onChange={(e) => {
                                                                const cat = e.target.value;
                                                                let unit = 'g';
                                                                if (cat === 'Calories') unit = 'kcal';
                                                                if (cat === 'Sodium' || cat === 'Iron' || cat === 'Calcium' || cat === 'Potassium') unit = 'mg';
                                                                if (cat === 'Fluid/Water') unit = 'ml';
                                                                if (cat === 'Vitamin D') unit = 'mcg';
                                                                setNewRule({ ...newRule, category: cat, rule_unit: unit });
                                                            }}
                                                        >
                                                            <option>Calories</option>
                                                            <option>Protein</option>
                                                            <option>Carbohydrates</option>
                                                            <option>Total Fat</option>
                                                            <option>Saturated Fat</option>
                                                            <option>Total Sugar</option>
                                                            <option>Added Sugars</option>
                                                            <option>Fiber</option>
                                                            <option>Sodium</option>
                                                            <option>Fluid/Water</option>
                                                            <option>Iron</option>
                                                            <option>Calcium</option>
                                                            <option>Vitamin D</option>
                                                            <option>Potassium</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-4">
                                                        <label className="block text-xs font-bold mb-1.5 ml-1 text-[var(--color-text-muted)] uppercase">Rule Name</label>
                                                        <input
                                                            className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                            placeholder="e.g. Daily Sugar Limit"
                                                            value={newRule.rule_name}
                                                            onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold mb-1.5 ml-1 text-[var(--color-text-muted)] uppercase">Type</label>
                                                        <select
                                                            className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] transition-all cursor-pointer"
                                                            value={newRule.rule_type}
                                                            onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                                                        >
                                                            <option value="max">Maximum</option>
                                                            <option value="min">Minimum</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-xs font-bold mb-1.5 ml-1 text-[var(--color-text-muted)] uppercase">Value & Unit</label>
                                                        <div className="flex gap-1">
                                                            <input
                                                                type="number"
                                                                className="w-full p-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-sm text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                                                                placeholder="Value"
                                                                value={newRule.rule_value}
                                                                onChange={(e) => setNewRule({ ...newRule, rule_value: e.target.value })}
                                                                required
                                                            />
                                                            <select
                                                                className="w-24 p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-main)] cursor-pointer"
                                                                value={newRule.rule_unit}
                                                                onChange={(e) => setNewRule({ ...newRule, rule_unit: e.target.value })}
                                                            >
                                                                <option>kcal</option>
                                                                <option>g</option>
                                                                <option>mg</option>
                                                                <option>mcg</option>
                                                                <option>ml</option>
                                                                <option>L</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-12 flex justify-end pt-2 border-t border-[var(--color-divider)] mt-2">
                                                        <Button type="submit" className="px-8 py-2 bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                                                            <Plus size={18} /> Add New Rule
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: PLANNER */}
                                    {activeTab === 'plan' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 p-5 rounded-xl border border-[var(--color-primary)]/20 shadow-sm">
                                                <div>
                                                    <h3 className="font-bold text-lg text-[var(--color-secondary)]">Adaptive Meal Planner</h3>
                                                    <p className="text-xs text-[var(--color-text-muted)]">AI-generated schedule based on your clinical rules.</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button
                                                        onClick={handleClearPlan}
                                                        variant="outline"
                                                        className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-2 cursor-pointer"
                                                    >
                                                        <Trash2 size={16} /> Clear Plan
                                                    </Button>
                                                    <Button
                                                        onClick={handleGeneratePlan}
                                                        disabled={generatingPlan}
                                                        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white gap-2 shadow-lg shadow-green-500/10 cursor-pointer"
                                                    >
                                                        {generatingPlan ? 'Generating...' : '✨ Create New Plan'}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {mealPlan.length === 0 && !generatingPlan ? (
                                                    <div className="text-center py-16 text-[var(--color-text-muted)] border-2 border-dashed border-[var(--color-divider)] rounded-2xl bg-[var(--color-bg-page)] dark:bg-white/5">
                                                        <Utensils size={40} className="mx-auto mb-4 opacity-20" />
                                                        <p className="font-bold">No active meal plan.</p>
                                                        <p className="text-xs">Click the button above to generate a 7-day schedule.</p>
                                                    </div>
                                                ) : (
                                                    Object.keys(groupedPlan).sort().map(date => (
                                                        <div key={date} className="border border-[var(--color-divider)] rounded-xl overflow-hidden hover:border-[var(--color-primary)]/40 transition-colors bg-[var(--color-bg-card)]">
                                                            <div className="bg-[var(--color-bg-page)] dark:bg-white/5 p-3 font-black text-xs uppercase tracking-widest text-[var(--color-secondary)] border-b border-[var(--color-divider)] flex justify-between items-center">
                                                                <span>{date}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-normal text-[var(--color-text-muted)] lowercase">{groupedPlan[date].length} meals scheduled</span>
                                                                    <button 
                                                                        onClick={() => { setSelectedDateForMeal(date); setIsMealModalOpen(true); }}
                                                                        className="p-1 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded transition-colors cursor-pointer"
                                                                        title="Add Manual Meal"
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {groupedPlan[date].map((meal, idx) => (
                                                                    <div key={idx} className="group relative flex gap-3 items-start p-3 rounded-xl hover:bg-[var(--color-bg-page)] dark:hover:bg-white/5 transition-all border border-transparent hover:border-[var(--color-divider)]">
                                                                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20 rounded-xl flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center border border-[var(--color-primary)]/10">
                                                                            {meal.image_url ? (
                                                                                <img src={meal.image_url} className="w-full h-full object-cover" alt={meal.recipe_name} />
                                                                            ) : (
                                                                                <Utensils size={24} className="text-[var(--color-primary)]" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wider mb-0.5">{meal.meal_type}</div>
                                                                            <div className="font-bold text-sm leading-tight text-[var(--color-text-main)] truncate">{meal.recipe_name}</div>
                                                                            <div className="text-[11px] text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                                                                                <span className="font-bold text-[var(--color-secondary)]">{meal.calories} kcal</span>
                                                                                <span className="opacity-30">•</span>
                                                                                <span>P: {meal.protein_g}g</span>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleDeleteMeal(meal.id)}
                                                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                                {generatingPlan && (
                                                    <div className="text-center py-12 text-gray-500">
                                                        Processing... building the perfect schedule logic.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 4: HISTORY */}
                                    {activeTab === 'history' && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            <h3 className="font-bold text-lg text-[var(--color-secondary)]">Meal Log History</h3>

                                            {logs.length === 0 ? (
                                                <p className="text-center py-8 text-[var(--color-text-muted)]">No meal logs found for this profile.</p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {logs.map(log => (
                                                        <div 
                                                            key={log.id} 
                                                            onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                            className="flex items-start gap-4 p-4 border-2 border-[var(--color-divider)] rounded-2xl bg-white dark:bg-white/5 hover:border-[var(--color-primary)] hover:bg-gray-50/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                                                        >
                                                            <div className="flex gap-1 flex-shrink-0">
                                                                <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-black/5">
                                                                    <img src={log.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="before" />
                                                                </div>
                                                                {log.image_after_url && (
                                                                    <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-black/5">
                                                                        <img src={log.image_after_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="after" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{new Date(log.logged_at).toLocaleString()}</p>
                                                                        {log.ai_analysis && (
                                                                            <div className="font-black text-sm uppercase text-[var(--color-text-main)] mt-1 group-hover:text-[var(--color-primary)] transition-colors">
                                                                                {log.ai_analysis.items?.map(i => i.name).join(', ') || 'Unknown Food'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Compliance Badge */}
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2 ${log.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                            'bg-green-50 text-green-700 border-green-200'
                                                                            }`}>
                                                                            {log.status}
                                                                        </span>

                                                                        {log.compliance_status === 'compliant' && (
                                                                            <span className="text-[10px] font-black text-green-600 flex items-center gap-1 uppercase tracking-widest">
                                                                                ✓ Compliant
                                                                            </span>
                                                                        )}
                                                                        {log.compliance_status === 'flagged' && (
                                                                            <span className="text-[10px] font-black text-red-600 flex items-center gap-1 uppercase tracking-widest">
                                                                                ⚠ Flagged
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {log.violation_details?.violations && (
                                                                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-red-100 text-[10px] font-black uppercase text-red-700">
                                                                        <strong>Violations:</strong> {log.violation_details.violations.map(v => `${v.rule} (${v.actual})`).join(', ')}
                                                                    </div>
                                                                )}

                                                                {log.nutritionist_review && (
                                                                    <div className="mt-2 text-xs font-medium text-gray-500 italic border-l-4 border-[var(--color-primary)]/30 pl-3">
                                                                        "{log.nutritionist_review.comment || log.nutritionist_review.title || 'Reviewed by nutritionist'}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Consultation Mode Overlay View */}
            {isConsultationMode && selectedProfile && (
                <div className="fixed inset-0 z-40 bg-[var(--color-bg-page)] overflow-y-auto p-8 animate-in slide-in-from-bottom duration-500">
                    <div className="max-w-6xl mx-auto space-y-8">
                        <header className="flex justify-between items-end border-b pb-6">
                            <div>
                                <span className="text-xs font-black text-[var(--color-primary)] uppercase tracking-widest">Clinical Session Mode</span>
                                <h2 className="text-4xl font-black text-[var(--color-secondary)] mt-2">Consultation Summary: {selectedProfile.child_name}</h2>
                                <p className="text-gray-500 font-medium">Session Date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <Button variant="outline" onClick={() => setIsConsultationMode(false)} className="h-12 px-8 font-bold border-2">Exit Session</Button>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Growth & Physical Status */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-2 border-[var(--color-primary)]/10 shadow-xl overflow-hidden">
                                    <CardHeader className="bg-gray-50/50">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <TrendingUp size={20} className="text-[var(--color-primary)]" title="Growth Trend Analysis" /> Growth & Developmental Trends
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={growthLogs}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis dataKey="logged_at" tickFormatter={(t) => new Date(t).toLocaleDateString()} fontSize={10} />
                                                    <YAxis fontSize={10} domain={['auto', 'auto']} />
                                                    <Tooltip labelFormatter={(l) => new Date(l).toLocaleDateString()} />
                                                    <Legend />
                                                    <Line name="Weight (kg)" type="monotone" dataKey="weight_kg" stroke="var(--color-primary)" strokeWidth={4} dot={{r: 6}} />
                                                    <Line name="Height (cm)" type="monotone" dataKey="height_cm" stroke="#6366f1" strokeWidth={4} dot={{r: 6}} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="border-none shadow-md bg-green-50/50">
                                        <CardContent className="p-6">
                                            <h4 className="text-xs font-black text-green-700 uppercase mb-3 flex items-center gap-2">
                                                <ClipboardCheck size={16} title="Meal Compliance Status" /> Latest Compliance Status
                                            </h4>
                                            <div className="flex items-end gap-4">
                                                <span className="text-5xl font-black text-green-600">{reportData?.summary?.complianceRate || 100}%</span>
                                                <div className="pb-1">
                                                    <p className="text-sm font-bold text-green-800">30-Day Average</p>
                                                    <p className="text-xs text-green-600">{reportData?.summary?.totalLogs || 0} meals analyzed</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-none shadow-md bg-blue-50/50">
                                        <CardContent className="p-6">
                                            <h4 className="text-xs font-black text-blue-700 uppercase mb-3 flex items-center gap-2">
                                                <Info size={16} title="Patient Medical Context" /> Current Medical Context
                                            </h4>
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-blue-900">{selectedProfile.allergies?.length > 0 ? `Allergic to: ${selectedProfile.allergies.join(', ')}` : 'No known allergies'}</p>
                                                <p className="text-xs text-blue-700 italic">"{selectedProfile.medical_history || 'No medical history reported.'}"</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Clinical Interventions & Rules */}
                            <div className="space-y-6">
                                <Card className="h-full border-2 border-indigo-100 shadow-xl">
                                    <CardHeader className="bg-indigo-50/50">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Activity size={20} className="text-indigo-600" /> Active Interventions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            <div className="p-4 bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Latest Clinical Diagnosis</p>
                                                <p className="text-sm font-bold text-gray-800">
                                                    {adimeNotes[0]?.diagnosis || "No clinical diagnosis recorded yet."}
                                                </p>
                                            </div>
                                            
                                            <div className="pt-4 border-t border-dashed">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">Enforced Dietary Rules</p>
                                                <div className="space-y-2">
                                                    {rules.map(rule => (
                                                        <div key={rule.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                                                            <span className="text-xs font-bold text-gray-700">{rule.rule_name}</span>
                                                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border font-black text-[var(--color-primary)]">
                                                                {rule.rule_type === 'max' ? '<' : '>'} {rule.rule_value}{rule.rule_unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-6">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Recommended Next Action</p>
                                                <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                                                    <p className="text-sm font-medium leading-relaxed">
                                                        Based on the compliance rate of {reportData?.summary?.complianceRate}%, 
                                                        continue with the current {rules[0]?.category || 'nutritional'} intervention. 
                                                        Review sugar intake if compliance drops below 80%.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <footer className="text-center pt-8 opacity-50">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">SmartNutri-AI Clinical Consultation System • Version 2.0</p>
                        </footer>
                    </div>
                </div>
            )}

            {/* UI Overlays */}
            <Notification
                {...notif}
                onClose={() => setNotif({ ...notif, show: false })}
            />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                maxWidth="sm"
            >
                <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="font-bold text-[var(--color-secondary)]">Delete "{ruleToDelete?.rule_name}"?</p>
                        <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone. This rule will no longer be applied to future meal logs.</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Keep Rule
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeleteRule}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isGrowthModalOpen}
                onClose={() => setIsGrowthModalOpen(false)}
                title="Log New Growth Data"
            >
                <form onSubmit={handleAddGrowthLog} className="space-y-4">
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                        Updating these values will also update the child's primary profile details.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-main)]">Height (cm)</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                value={newGrowth.height_cm}
                                onChange={(e) => setNewGrowth({ ...newGrowth, height_cm: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-gray-50 dark:bg-white/5"
                                placeholder="e.g. 110.5"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-main)]">Weight (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                value={newGrowth.weight_kg}
                                onChange={(e) => setNewGrowth({ ...newGrowth, weight_kg: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-gray-50 dark:bg-white/5"
                                placeholder="e.g. 18.2"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => setIsGrowthModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1">Update Growth</Button>
                    </div>
                </form>
            </Modal>
            <Modal
                isOpen={isMealModalOpen}
                onClose={() => setIsMealModalOpen(false)}
                title={`Add Manual Meal - ${selectedDateForMeal}`}
            >
                <form onSubmit={handleAddManualMeal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">Meal Type</label>
                            <select 
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.meal_type}
                                onChange={(e) => setMealForm({...mealForm, meal_type: e.target.value})}
                            >
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Dinner</option>
                                <option>Snack</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">Calories</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                placeholder="kcal"
                                value={mealForm.calories}
                                onChange={(e) => setMealForm({...mealForm, calories: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">Meal/Recipe Name</label>
                        <input 
                            required
                            className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                            placeholder="e.g. Scrambled Eggs with Spinach"
                            value={mealForm.recipe_name}
                            onChange={(e) => setMealForm({...mealForm, recipe_name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-600 uppercase">Protein (g)</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.protein_g}
                                onChange={(e) => setMealForm({...mealForm, protein_g: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-amber-600 uppercase">Carbs (g)</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.carbs_g}
                                onChange={(e) => setMealForm({...mealForm, carbs_g: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase">Fats (g)</label>
                            <input 
                                type="number" 
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.fats_g}
                                onChange={(e) => setMealForm({...mealForm, fats_g: e.target.value})}
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black py-3 rounded-xl mt-4">
                        Save to Planner
                    </Button>
                </form>
            </Modal>
            {/* Universal Confirmation Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                title={confirmModal.title}
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-5 bg-[var(--color-bg-card,#ffffff)] dark:bg-white/5 rounded-2xl border-2 border-red-500 shadow-sm">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600 shadow-sm">
                            <AlertTriangle size={28} />
                        </div>
                        <p className="text-sm text-[var(--color-text-main,#1f2937)] font-black leading-relaxed">
                            {confirmModal.message}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="flex-1 font-bold rounded-xl"
                            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
                            onClick={() => {
                                confirmModal.onConfirm();
                                setConfirmModal({ ...confirmModal, isOpen: false });
                            }}
                        >
                            Confirm Delete
                        </Button>
                    </div>
                </div>
            </Modal>
            
            <ReviewLogModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                log={selectedLogForReview}
                onReviewComplete={() => {
                    setIsReviewOpen(false);
                    if (selectedProfile) fetchLogs(selectedProfile.id);
                }}
            />

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />
        </div>
    );
}
