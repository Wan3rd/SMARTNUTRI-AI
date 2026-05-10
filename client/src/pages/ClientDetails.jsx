import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, User, Plus, Trash2, Save, MessageSquare, StickyNote, Utensils, Monitor, Activity, ClipboardCheck, TrendingUp, TrendingDown, Info, Edit2, Stethoscope, Link2, PieChart, ChefHat, AlertTriangle, Bold, Italic, List, ListOrdered, Calendar, Check, BadgeCheck, ShieldAlert, Eye, AlertCircle, Clock, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, formatValue, convertHeight, convertWeight } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, Scatter } from 'recharts';
import Modal from '../components/common/Modal';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ReviewLogModal from '../components/ReviewLogModal';
import CreatePatientModal from '../components/CreatePatientModal';

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
  .ql-editor.ql-blank::before {
    color: var(--color-text-muted) !important;
    font-style: italic !important;
    opacity: 0.5 !important;
  }
  .quill-dark .ql-editor {
    color: white !important;
    min-height: 80px !important;
    padding: 0 !important;
  }
  .quill-dark .ql-editor.ql-blank::before {
    color: rgba(255,255,255,0.4) !important;
  }
`;

const BRISTOL_TYPES = [
    { type: 1, label: 'Type 1', desc: 'Hard Lumps', detail: 'Separate hard lumps, like nuts (hard to pass). Indicates severe constipation.' },
    { type: 2, label: 'Type 2', desc: 'Lumpy', detail: 'Sausage-shaped, but lumpy. Indicates mild constipation.' },
    { type: 3, label: 'Type 3', desc: 'Cracked', detail: 'Like a sausage but with cracks on its surface. Normal.' },
    { type: 4, label: 'Type 4', desc: 'Smooth', detail: 'Like a sausage or snake, smooth and soft. Ideal.' },
    { type: 5, label: 'Type 5', desc: 'Soft Blobs', detail: 'Soft blobs with clear-cut edges (passed easily). Lacking fiber.' },
    { type: 6, label: 'Type 6', desc: 'Mushy', detail: 'Fluffy pieces with ragged edges, a mushy stool. Mild diarrhea.' },
    { type: 7, label: 'Type 7', desc: 'Liquid', detail: 'Watery, no solid pieces (entirely liquid). Severe diarrhea.' }
];

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
    const [showLastAdimeReference, setShowLastAdimeReference] = useState(true);

    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // --- Modal & Notif States ---
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });

    // --- History State ---
    const [logs, setLogs] = useState([]);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);

    // --- Insights State ---
    const [reportData, setReportData] = useState(null);

    // --- Notes State ---
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');

    const [editingRuleId, setEditingRuleId] = useState(null);
    const [editRuleForm, setEditRuleForm] = useState({
        category: 'Calories',
        rule_name: '',
        rule_definition: '',
        rule_type: 'max',
        rule_value: '',
        rule_unit: 'kcal'
    });
    const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
    const [clientEmail, setClientEmail] = useState('');

    const [editingAdimeId, setEditingAdimeId] = useState(null);
    const [editAdimeForm, setEditAdimeForm] = useState({
        assessment: '',
        diagnosis: '',
        intervention: '',
        monitoring: '',
        evaluation: ''
    });

    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteForm, setEditNoteForm] = useState('');

    // --- Confirmation Modal State ---
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: true
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
    const [allClientPendingLogs, setAllClientPendingLogs] = useState([]);
    const [childVaccinations, setChildVaccinations] = useState([]);
    const [vaccinationTypes, setVaccinationTypes] = useState([]);
    const [isAddingVaccine, setIsAddingVaccine] = useState(false);
    const [newVaccine, setNewVaccine] = useState({ typeId: '', date: new Date().toISOString().split('T')[0], notes: '' });

    const bmiData = useMemo(() => {
        if (!selectedProfile?.weight_kg || !selectedProfile?.height_cm) return null;
        const heightM = selectedProfile.height_cm / 100;
        const bmi = (selectedProfile.weight_kg / (heightM * heightM)).toFixed(1);

        let status = 'Healthy Weight';
        let color = 'text-emerald-700 dark:text-emerald-300';
        let bgColor = 'bg-emerald-50 dark:bg-emerald-500/10';
        let borderColor = 'border-emerald-200 dark:border-emerald-500/20';

        if (bmi < 18.5) {
            status = 'Underweight';
            color = 'text-amber-700 dark:text-amber-300';
            bgColor = 'bg-amber-50 dark:bg-amber-500/10';
            borderColor = 'border-amber-200 dark:border-amber-500/20';
        } else if (bmi >= 25 && bmi < 30) {
            status = 'Overweight';
            color = 'text-orange-700 dark:text-orange-300';
            bgColor = 'bg-orange-50 dark:bg-orange-500/10';
            borderColor = 'border-orange-200 dark:border-orange-500/20';
        } else if (bmi >= 30) {
            status = 'Obese';
            color = 'text-red-700 dark:text-red-300';
            bgColor = 'bg-red-50 dark:bg-red-500/10';
            borderColor = 'border-red-200 dark:border-red-500/20';
        }

        return { bmi, status, color, bgColor, borderColor };
    }, [selectedProfile]);

    const growthDeltas = useMemo(() => {
        if (!growthLogs || growthLogs.length < 2) return { weight: 0, height: 0 };
        const sorted = [...growthLogs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
        const current = sorted[0];
        const previous = sorted[1];
        return {
            weight: (current.weight_kg - previous.weight_kg).toFixed(1),
            height: (current.height_cm - previous.height_cm).toFixed(1)
        };
    }, [growthLogs]);

    const clinicalPatterns = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        const alerts = [];
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const dailyMealCount = {};
        logs.forEach(log => {
            const dateStr = new Date(log.logged_at).toDateString();
            if (new Date(log.logged_at) >= last7Days && ['Breakfast', 'Lunch', 'Dinner'].includes(log.meal_category)) {
                dailyMealCount[dateStr] = (dailyMealCount[dateStr] || 0) + 1;
            }
        });

        const skippingDays = Object.entries(dailyMealCount).filter(([_, count]) => count < 2);
        if (skippingDays.length > 0) {
            alerts.push({ title: 'Meal Skipping Pattern', desc: `Patient missed core meals on ${skippingDays.length} days in the last week.`, severity: 'high' });
        }

        const highSodium = logs.filter(l => (l.total_sodium_mg || 0) > 800).length;
        if (highSodium > 0) {
            alerts.push({ title: 'Sodium Threshold Alert', desc: `${highSodium} meal entries exceeded 800mg sodium limit.`, severity: 'med' });
        }

        const lowConsumption = logs.filter(l => (l.consumption_percent || 100) < 50).length;
        if (lowConsumption >= 3) {
            alerts.push({ title: 'Low Intake Alert', desc: `Consistent low plate consumption (<50%) detected in ${lowConsumption} recent meals.`, severity: 'high' });
        }

        return alerts.length > 0 ? alerts : [{ title: 'Baseline Stable', desc: 'No significant clinical risks detected in recent logs.', severity: 'low' }];
    }, [logs]);

    const velocityStats = useMemo(() => {
        if (!growthLogs || growthLogs.length < 2) return [];
        const sorted = [...growthLogs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

        const velocityData = [];
        for (let i = 0; i < Math.min(sorted.length - 1, 5); i++) {
            const current = sorted[i];
            const prev = sorted[i + 1];

            const diffDays = (new Date(current.logged_at) - new Date(prev.logged_at)) / (1000 * 60 * 60 * 24);
            const months = diffDays / 30.44;

            velocityData.push({
                date: current.logged_at,
                weight: current.weight_kg,
                height: current.height_cm,
                weightVel: months > 0 ? ((current.weight_kg - prev.weight_kg) / months).toFixed(2) : 0,
                heightVel: months > 0 ? ((current.height_cm - prev.height_cm) / months).toFixed(2) : 0
            });
        }
        return velocityData;
    }, [growthLogs]);

    const [isClinicalEditing, setIsClinicalEditing] = useState(false);
    const [isAdimeEditing, setIsAdimeEditing] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const [isGrowthChartOpen, setIsGrowthChartOpen] = useState(false);
    const [isVelocityModalOpen, setIsVelocityModalOpen] = useState(false);

    const [clinicalForm, setClinicalForm] = useState({});

    useEffect(() => {
        if (selectedProfile) {
            setClinicalForm({
                child_name: selectedProfile.child_name,
                gender: selectedProfile.gender,
                date_of_birth: selectedProfile.date_of_birth?.split('T')[0],
                activity_level: selectedProfile.activity_level,
                height_cm: selectedProfile.height_cm,
                weight_kg: selectedProfile.weight_kg,
                allergies: selectedProfile.allergies || [],
                dietary_preferences: selectedProfile.dietary_preferences || '',
                medical_history: typeof selectedProfile.medical_history === 'string' ? selectedProfile.medical_history : '',
                medications: selectedProfile.medications || '',
                weigh_in_conditions: selectedProfile.weigh_in_conditions || '',
                bristol_stool_scale: selectedProfile.bristol_stool_scale || 4,
                family_history: selectedProfile.family_history || '',
                food_intolerances: selectedProfile.food_intolerances || '',
                symptoms: selectedProfile.symptoms || '',
                lifestyle_factors: selectedProfile.lifestyle_factors || '',
                waist_circumference: selectedProfile.waist_circumference || ''
            });
        }
    }, [selectedProfile]);

    const dayStatuses = useMemo(() => {
        if (!logs || !selectedProfile || !rules) return {};
        const statuses = {};
        const grouped = logs.reduce((acc, log) => {
            const date = new Date(log.logged_at).toLocaleDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(log);
            return acc;
        }, {});

        Object.keys(grouped).forEach(date => {
            const dayLogs = grouped[date];
            const totals = dayLogs.reduce((acc, l) => {
                acc.calories += (l.total_calories || 0);
                acc.protein += (l.total_protein_g || 0);
                acc.carbs += (l.total_carbs_g || 0);
                acc.fat += (l.total_fat_g || 0);
                acc.sugar += (l.total_sugar_g || 0);
                acc.sodium += (l.total_sodium_mg || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });

            let status = 'success';

            // Check Profile Targets
            if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 1.05) status = 'danger';
            else if (selectedProfile.calories_target && totals.calories > selectedProfile.calories_target * 0.9) status = 'warning';

            // Check Rules Engine
            rules.forEach(rule => {
                const limit = parseFloat(rule.rule_value);
                if (!limit) return;

                let current = 0;
                if (rule.category === 'Calories') current = totals.calories;
                else if (rule.category === 'Protein') current = totals.protein;
                else if (rule.category === 'Carbohydrates') current = totals.carbs;
                else if (rule.category === 'Fats') current = totals.fat;
                else if (rule.category === 'Sugar') current = totals.sugar;
                else if (rule.category === 'Sodium') current = totals.sodium;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
            });

            statuses[date] = status;
        });
        return statuses;
    }, [logs, selectedProfile, rules]);

    const dailyViolations = useMemo(() => {
        if (!selectedHistoryDate || !logs || !rules) return [];
        const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate);
        const totals = dayLogs.reduce((acc, l) => {
            acc.calories += (l.total_calories || 0);
            acc.protein += (l.total_protein_g || 0);
            acc.carbs += (l.total_carbs_g || 0);
            acc.fat += (l.total_fat_g || 0);
            acc.sugar += (l.total_sugar_g || 0);
            acc.sodium += (l.total_sodium_mg || 0);
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 });

        const violations = [];
        rules.forEach(rule => {
            const limit = parseFloat(rule.rule_value);
            if (!limit) return;

            let current = 0;
            if (rule.category === 'Calories') current = totals.calories;
            else if (rule.category === 'Protein') current = totals.protein;
            else if (rule.category === 'Carbohydrates') current = totals.carbs;
            else if (rule.category === 'Fats') current = totals.fat;
            else if (rule.category === 'Sugar') current = totals.sugar;
            else if (rule.category === 'Sodium') current = totals.sodium;

            if (rule.rule_type === 'max' && current > limit) {
                violations.push({
                    name: rule.rule_name,
                    category: rule.category,
                    actual: Math.round(current),
                    limit: limit,
                    unit: rule.rule_unit
                });
            }
        });
        return violations;
    }, [selectedHistoryDate, logs, rules]);

    const handleVerifyAllForDay = async (date) => {
        const pendingIds = logs
            .filter(l => new Date(l.logged_at).toLocaleDateString() === date && l.status === 'pending')
            .map(l => l.id);

        if (pendingIds.length === 0) return;

        try {
            await api.patch('/nutritionist/logs/batch-verify', { logIds: pendingIds });
            // Update local state
            setLogs(prev => prev.map(l => pendingIds.includes(l.id) ? { ...l, status: 'verified' } : l));
            showNotif(`Verified ${pendingIds.length} logs for ${date}`);
        } catch (err) {
            console.error("Batch verify failed", err);
            showNotif("Failed to batch verify logs", "error");
        }
    };

    const handleClinicalSave = async () => {
        try {
            const res = await api.patch(`/nutritionist/clients/profile/${selectedProfile.id}`, clinicalForm);
            setSelectedProfile(res.data);
            setProfiles(prev => prev.map(p => p.id === res.data.id ? res.data : p));
            setIsClinicalEditing(false);
            showNotif("Clinical profile updated successfully!");
        } catch (err) {
            console.error("Failed to update clinical profile", err);
            showNotif("Failed to update profile", "error");
        }
    };

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
        if (selectedProfile && (activeTab === 'history' || activeTab === 'review')) {
            fetchLogs(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'adime') {
            fetchAdimeNotes(selectedProfile.id);
        }
        if (selectedProfile && activeTab === 'overview') {
            fetchGrowthLogs(selectedProfile.id);
            fetchVaccinationData(selectedProfile.id);
        }
    }, [selectedProfile, activeTab]);

    useEffect(() => {
        if (clientId) {
            fetchClientEmail();
        }
    }, [clientId]);

    const fetchClientEmail = async () => {
        try {
            const res = await api.get(`/nutritionist/clients/${clientId}`);
            setClientEmail(res.data.email);
        } catch (err) {
            console.error("Error fetching client email", err);
        }
    };

    const fetchGrowthLogs = async (profileId) => {
        try {
            const res = await api.get(`/profiles/${profileId}/growth`);
            setGrowthLogs(res.data);
        } catch (err) {
            console.error("Error fetching growth logs", err);
        }
    };

    const fetchVaccinationData = async (profileId) => {
        try {
            const [typesRes, listRes] = await Promise.all([
                api.get('/profiles/vaccination-types'),
                api.get(`/profiles/${profileId}/vaccinations`)
            ]);
            setVaccinationTypes(typesRes.data);
            setChildVaccinations(listRes.data);
        } catch (err) {
            console.error("Error fetching vaccination data", err);
        }
    };

    const handleAddVaccine = async () => {
        if (!newVaccine.typeId) return;
        try {
            const res = await api.post(`/profiles/${selectedProfile.id}/vaccinations`, {
                vaccination_type_id: newVaccine.typeId,
                date_administered: newVaccine.date,
                notes: newVaccine.notes
            });
            setChildVaccinations([res.data, ...childVaccinations]);
            setIsAddingVaccine(false);
            setNewVaccine({ typeId: '', date: new Date().toISOString().split('T')[0], notes: '' });
            showNotif("Vaccination record added!");
        } catch (err) {
            console.error("Error adding vaccine", err);
            showNotif("Failed to add vaccine", "error");
        }
    };

    const handleDeleteVaccine = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Vaccination Record',
            message: 'Are you sure you want to permanently delete this immunization record? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/profiles/vaccinations/${id}`);
                    setChildVaccinations(childVaccinations.filter(v => v.id !== id));
                    showNotif("Vaccination record removed");
                } catch (err) {
                    console.error("Error deleting vaccine", err);
                    showNotif("Failed to delete vaccine", "error");
                }
            },
            isDestructive: true
        });
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

    const handleUpdateAdime = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/nutritionist/adime-notes/${editingAdimeId}`, editAdimeForm);
            setEditingAdimeId(null);
            fetchAdimeNotes(selectedProfile.id);
            showNotif("ADIME clinical record updated");
        } catch (err) {
            console.error("Error updating ADIME", err);
            showNotif("Failed to update ADIME record", "error");
        }
    };

    const handleDeleteAdimeNote = async (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete ADIME Record',
            message: 'Are you sure you want to permanently delete this structured clinical record? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/adime-notes/${id}`);
                    setAdimeNotes(adimeNotes.filter(n => n.id !== id));
                    showNotif("ADIME record deleted");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Error deleting ADIME", err);
                    showNotif("Failed to delete ADIME record", "error");
                }
            },
            isDestructive: true
        });
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



    const fetchAllClientPending = async () => {
        try {
            const res = await api.get('/nutritionist/logs/pending');
            // Filter only for profiles belonging to this parent/client
            const clientProfileIds = profiles.map(p => p.id);
            const filtered = res.data.filter(log => clientProfileIds.includes(log.profile_id));
            setAllClientPendingLogs(filtered);
        } catch (err) {
            console.error("Error fetching all client pending", err);
        }
    };

    useEffect(() => {
        if (profiles.length > 0) {
            fetchAllClientPending();
        }
    }, [profiles]);

    const handleGenerateParentGuide = () => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html>
                <head>
                    <title>SmartNutri-AI Clinical Report - ${selectedProfile.child_name}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
                        .header { border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; }
                        .title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
                        .meta { margin-top: 10px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
                        .section { margin-bottom: 30px; }
                        .section-title { font-size: 14px; font-weight: 900; color: #4f46e5; text-transform: uppercase; margin-bottom: 15px; border-left: 4px solid #4f46e5; padding-left: 10px; }
                        .card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                        .advice { font-size: 14px; line-height: 1.6; color: #334155; }
                        .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">Clinical Nutrition Report</div>
                        <div class="meta">Patient: ${selectedProfile.child_name} | Date: ${new Date().toLocaleDateString()} | Provider ID: ${user.id}</div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Current Intervention Plan</div>
                        <div class="card advice">
                            <strong>Diagnosis:</strong> ${adimeNotes[0]?.diagnosis || 'Stable'} <br><br>
                            <strong>Plan:</strong> ${adimeNotes[0]?.intervention || 'Maintain current diet.'}
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Risk Pattern Summary</div>
                        <div class="card advice">
                            ${clinicalPatterns.map(p => `• ${p.title}: ${p.desc}`).join('<br>')}
                        </div>
                    </div>

                    <div class="footer">
                        Generated by SmartNutri-AI Command Center v2.0. This is a clinical guide intended for caregiver reference.
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const fetchLogs = async (profileId) => {
        try {
            // Fetch logs for the selected profile
            const res = await api.get(`/logs/profile/${profileId}`);
            const sortedLogs = res.data.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
            setLogs(sortedLogs);

            if (sortedLogs.length > 0) {
                const latestDate = new Date(sortedLogs[0].logged_at).toLocaleDateString();
                setSelectedHistoryDate(latestDate);
            }
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

    const handleDeleteLog = async (logId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Meal Log',
            message: 'Are you sure you want to permanently delete this meal log? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/logs/${logId}`);
                    setLogs(prev => prev.filter(l => l.id !== logId));
                    showNotif("Meal log deleted");
                } catch (err) {
                    console.error("Failed to delete log", err);
                    showNotif("Failed to delete log", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleClearLogsForDay = async (date) => {
        // Use a consistent date format for the API (ISO)
        const isoDate = new Date(date).toISOString().split('T')[0];

        setConfirmDialog({
            isOpen: true,
            title: `Clear All Logs: ${date}`,
            message: `This will permanently delete ALL meal logs recorded on ${date}. Are you sure you want to proceed?`,
            onConfirm: async () => {
                try {
                    const res = await api.delete(`/logs/bulk/day/${selectedProfile.id}/${isoDate}`);
                    if (res.data.count > 0) {
                        // Re-fetch to ensure sync with DB
                        fetchLogs(selectedProfile.id);
                        setSelectedHistoryDate(null);
                        showNotif(`Cleared ${res.data.count} logs for ${date}`);
                    } else {
                        showNotif("No logs found on server for this date", "info");
                    }
                } catch (err) {
                    console.error("Failed to clear logs for day", err);
                    showNotif("Failed to clear logs", "error");
                }
            },
            isDestructive: true
        });
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

    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!editNoteForm.trim()) return;
        try {
            await api.patch(`/notes/${editingNoteId}`, { content: editNoteForm });
            setEditingNoteId(null);
            fetchNotes(selectedProfile.id);
            showNotif("Observation note updated");
        } catch (err) {
            console.error("Error updating note", err);
            showNotif("Failed to update note", "error");
        }
    };

    const handleDeleteNote = async (noteId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Observation Note',
            message: 'Are you sure you want to permanently delete this clinical observation? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/notes/${noteId}`);
                    setNotes(notes.filter(n => n.id !== noteId));
                    showNotif("Observation note deleted");
                } catch (err) {
                    console.error("Error deleting note", err);
                    showNotif("Failed to delete note", "error");
                }
            },
            isDestructive: true
        });
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
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Meal',
            message: 'Are you sure you want to remove this meal from the plan?',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/plan/meal/${mealId}`);
                    setMealPlan(prev => prev.filter(m => m.id !== mealId));
                    showNotif("Meal removed");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Failed to delete meal", err);
                    showNotif("Failed to delete meal", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleClearPlan = async () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Clear 7-Day Plan',
            message: 'This will permanently delete all meals in the current 7-day schedule. This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/plan/all/${selectedProfile.id}`);
                    setMealPlan([]);
                    showNotif("Meal plan cleared");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Failed to clear plan", err);
                    showNotif("Failed to clear plan", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleGeneratePlan = async () => {
        if (!selectedProfile) return;
        setGeneratingPlan(true);
        try {
            await api.post('/nutritionist/plan/generate', { profileId: selectedProfile.id });
            showNotif("New 7-day plan generated successfully!");
            fetchMealPlan(selectedProfile.id);
        } catch (err) {
            console.error("Failed to generate plan", err);
            showNotif("Failed to generate plan. Please try again.", "error");
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
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Clinical Rule',
            message: `Are you sure you want to remove the rule "${rule.rule_name}"? This will affect clinical compliance calculations for this patient.`,
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/rules/${rule.id}`);
                    setRules(rules.filter(r => r.id !== rule.id));
                    showNotif("Rule deleted successfully!");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Failed to delete rule", err);
                    showNotif("Failed to delete rule", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleUpdateRule = async (e) => {
        e.preventDefault();
        try {
            const definition = editRuleForm.rule_definition || `${editRuleForm.rule_type === 'max' ? 'Max' : 'Min'} ${editRuleForm.rule_value}${editRuleForm.rule_unit}`;

            await api.patch(`/nutritionist/rules/${editingRuleId}`, {
                ...editRuleForm,
                rule_definition: definition
            });

            fetchRules(selectedProfile.id);
            setEditingRuleId(null);
            showNotif("Rule updated successfully!");
        } catch (err) {
            console.error("Failed to update rule", err);
            showNotif("Failed to update rule", "error");
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
                    <h1 className={cn("text-3xl font-black text-[var(--color-text-main)]", user?.privacy_mode && "privacy-blur")}>{clientName}</h1>
                    <p className="text-[var(--color-text-muted)]">Manage Family Profiles & Rules</p>
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
                        {profiles.map(profile => {
                            const pendingCount = allClientPendingLogs.filter(l => l.profile_id === profile.id).length;
                            return (
                                <div
                                    key={profile.id}
                                    onClick={() => { setSelectedProfile(profile); setActiveTab('overview'); }}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border relative ${selectedProfile?.id === profile.id
                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                        : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                        }`}
                                >
                                    {pendingCount > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 z-10">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 border-2 border-white dark:border-zinc-900 text-[8px] font-black text-white items-center justify-center">
                                                {pendingCount}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border-2 ${selectedProfile?.id === profile.id ? 'border-white/50' : 'border-[var(--color-divider)]'} bg-white/10 flex items-center justify-center`}>
                                            {profile.profile_image_url ? (
                                                <img src={profile.profile_image_url} alt={profile.child_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User size={20} className={selectedProfile?.id === profile.id ? 'text-white' : 'text-[var(--color-text-main)]'} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`font-black truncate ${selectedProfile?.id === profile.id ? 'text-white' : 'text-[var(--color-text-main)]'}`}>{profile.child_name}</div>
                                            <div className="flex items-center justify-between">
                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedProfile?.id === profile.id ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                                                    {new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()}y • {profile.gender}
                                                </div>
                                                <div className={`text-[10px] font-black ${selectedProfile?.id === profile.id ? 'text-white/90' : 'text-[var(--color-primary)]'}`}>
                                                    {profile.weight_kg || '--'}kg / {profile.height_cm || '--'}cm
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <button
                            onClick={() => setIsAddProfileOpen(true)}
                            className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--color-divider)] bg-[var(--color-bg-card)]/50 hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)] transition-all group flex flex-col items-center justify-center gap-2 mt-4"
                        >
                            <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                <Plus size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">Add Child Profile</span>
                        </button>
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
                                            { id: 'history', label: 'Log History' },
                                            { id: 'insights', label: 'Insights' },
                                            { id: 'adime', label: 'Clinical (ADIME)' },
                                            { id: 'notes', label: 'Notes' },
                                            { id: 'rules', label: 'Rules Engine' },
                                            { id: 'plan', label: 'Meal Planner' }
                                        ].map(tab => {
                                            const isHistoryPending = tab.id === 'history' && allClientPendingLogs.filter(l => l.profile_id === selectedProfile?.id).length > 0;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    className={`pb-3 px-1 font-bold text-sm whitespace-nowrap transition-colors relative ${activeTab === tab.id
                                                        ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                                                        }`}
                                                    onClick={() => setActiveTab(tab.id)}
                                                >
                                                    {tab.label}
                                                    {isHistoryPending && (
                                                        <span className="absolute top-0 -right-2 flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* SHARED CLINICAL TOOLS & REFERENCE (ADIME, Notes) */}
                                    {(activeTab === 'adime' || activeTab === 'notes') && (
                                        <div className="space-y-6 mb-8 animate-in slide-in-from-top-4 duration-500">
                                            {/* ULTIMATE PROFESSIONAL SHARED TOOLBAR (Only for ADIME & Notes) */}
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
                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            {/* 1. BIOGRAPHICAL SUMMARY (Nutritionist's Quick Look) */}
                                            <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-20 w-20 rounded-2xl overflow-hidden bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] border-4 border-white dark:border-zinc-800 shadow-lg flex-shrink-0">
                                                            {selectedProfile.profile_image_url ? (
                                                                <img src={selectedProfile.profile_image_url} alt={selectedProfile.child_name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <User size={40} strokeWidth={2.5} className="text-[var(--color-primary)]" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h2 className={cn("text-2xl font-black text-[var(--color-text-main)] uppercase tracking-tight leading-none", user?.privacy_mode && "privacy-blur")}>{selectedProfile.child_name}</h2>
                                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-2">
                                                                <span className="px-2 py-1 bg-[var(--color-bg-page)] rounded-lg border border-[var(--color-divider)]">{selectedProfile.gender}</span>
                                                                <span className="px-2 py-1 bg-[var(--color-bg-page)] rounded-lg border border-[var(--color-divider)]">{new Date().getFullYear() - new Date(selectedProfile.date_of_birth).getFullYear()} Years Old</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Date of Birth</div>
                                                        <div className="text-sm font-black text-[var(--color-secondary)]">{new Date(selectedProfile.date_of_birth).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Current Weight</div>
                                                            {parseFloat(growthDeltas.weight) !== 0 && (
                                                                <div className={`text-[9px] font-black flex items-center ${parseFloat(growthDeltas.weight) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {parseFloat(growthDeltas.weight) > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                                                    {parseFloat(growthDeltas.weight) > 0 ? '+' : ''}{growthDeltas.weight}kg
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-xl font-black text-[var(--color-primary)]">{selectedProfile.weight_kg} <span className="text-xs font-bold opacity-60">kg</span></div>
                                                    </div>
                                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Current Height</div>
                                                            {parseFloat(growthDeltas.height) !== 0 && (
                                                                <div className={`text-[9px] font-black flex items-center ${parseFloat(growthDeltas.height) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {parseFloat(growthDeltas.height) > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                                                    {parseFloat(growthDeltas.height) > 0 ? '+' : ''}{growthDeltas.height}cm
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="text-xl font-black text-[var(--color-secondary)]">{selectedProfile.height_cm} <span className="text-xs font-bold opacity-60">cm</span></div>
                                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mt-0.5">
                                                                {Math.floor(selectedProfile.height_cm / 30.48)}' {Math.round((selectedProfile.height_cm % 30.48) / 2.54)}" Imperial
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-between">
                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">BMI Indicator</div>
                                                        {bmiData ? (
                                                            <div className="space-y-1.5">
                                                                <div className="text-xl font-black text-[var(--color-text-main)]">{bmiData.bmi}</div>
                                                                <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border ${bmiData.borderColor} ${bmiData.bgColor} ${bmiData.color} text-[10px] font-black uppercase tracking-tight`}>
                                                                    {bmiData.status}
                                                                </div>
                                                            </div>
                                                        ) : <div className="text-sm font-black text-[var(--color-text-muted)] italic">No data</div>}
                                                    </div>
                                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Activity Level</div>
                                                        <div className="text-sm font-black text-[var(--color-text-main)] capitalize mt-2">{selectedProfile.activity_level?.replace(/_/g, ' ') || 'N/A'}</div>
                                                    </div>
                                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Primary Allergies</div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {selectedProfile.allergies?.length > 0 ? (
                                                                selectedProfile.allergies.map(allergy => (
                                                                    <span key={allergy} className="px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-md text-[9px] font-black uppercase whitespace-nowrap">
                                                                        {allergy}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-sm font-black text-emerald-500 italic">None</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. CLINICAL & MEDICAL RECORDS */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between border-b-2 border-[var(--color-divider)] pb-4">
                                                    <div>
                                                        <h3 className="font-black text-xl text-[var(--color-secondary)] uppercase tracking-tight">Clinical & Medical Records</h3>
                                                        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Comprehensive medical history and current status</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isClinicalEditing && (
                                                            <Button variant="ghost" onClick={() => setIsClinicalEditing(false)} className="text-xs font-black uppercase">
                                                                Cancel
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant={isClinicalEditing ? "primary" : "outline"}
                                                            onClick={() => isClinicalEditing ? handleClinicalSave() : setIsClinicalEditing(true)}
                                                            className="flex gap-2"
                                                        >
                                                            {isClinicalEditing ? <Save size={16} /> : <Edit2 size={16} />}
                                                            {isClinicalEditing ? "Save Records" : "Edit Records"}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Edit Form for Bio Info if in edit mode */}
                                                {isClinicalEditing && (
                                                    <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-3xl border-2 border-blue-100 dark:border-blue-500/20 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest ml-1">Child Name</label>
                                                            <input
                                                                type="text"
                                                                value={clinicalForm.child_name}
                                                                onChange={(e) => setClinicalForm({ ...clinicalForm, child_name: e.target.value })}
                                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest ml-1">Gender</label>
                                                            <select
                                                                value={clinicalForm.gender}
                                                                onChange={(e) => setClinicalForm({ ...clinicalForm, gender: e.target.value })}
                                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                                            >
                                                                <option value="Male" className="bg-[var(--color-bg-page)] text-[var(--color-text-main)]">Male</option>
                                                                <option value="Female" className="bg-[var(--color-bg-page)] text-[var(--color-text-main)]">Female</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                                            <input
                                                                type="date"
                                                                value={clinicalForm.date_of_birth}
                                                                onChange={(e) => setClinicalForm({ ...clinicalForm, date_of_birth: e.target.value })}
                                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-6">
                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-2">
                                                                <Stethoscope size={14} /> Medical & Surgical History
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-[var(--color-primary)] outline-none min-h-[150px]"
                                                                    value={clinicalForm.medical_history}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, medical_history: e.target.value })}
                                                                    placeholder="Enter detailed medical and surgical history..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed whitespace-pre-wrap">
                                                                    {typeof selectedProfile.medical_history === 'string' ? selectedProfile.medical_history : "No medical history recorded."}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Link2 size={14} /> Current Medications
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-blue-500 outline-none min-h-[100px]"
                                                                    value={clinicalForm.medications}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, medications: e.target.value })}
                                                                    placeholder="List current medications and dosages..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed">
                                                                    {selectedProfile.medications || "No active medications."}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={14} /> Family Medical History
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-emerald-500 outline-none min-h-[100px]"
                                                                    value={clinicalForm.family_history}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, family_history: e.target.value })}
                                                                    placeholder="History of diabetes, hypertension, allergies in the family..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium leading-relaxed">
                                                                    {selectedProfile.family_history || "No family history recorded."}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                                                <AlertTriangle size={14} /> Allergies & Food Intolerances
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <div className="space-y-4">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {["None", "Peanuts", "Dairy", "Eggs", "Gluten", "Soy", "Fish", "Shellfish"].map(allergy => (
                                                                            <button
                                                                                key={allergy}
                                                                                onClick={() => {
                                                                                    const current = clinicalForm.allergies || [];
                                                                                    const updated = current.includes(allergy)
                                                                                        ? current.filter(a => a !== allergy)
                                                                                        : [...current, allergy];
                                                                                    setClinicalForm({ ...clinicalForm, allergies: updated });
                                                                                }}
                                                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all border-2 ${(clinicalForm.allergies || []).includes(allergy)
                                                                                        ? 'bg-red-500 text-white border-red-500'
                                                                                        : 'bg-[var(--color-bg-page)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-red-500'
                                                                                    }`}
                                                                            >
                                                                                {allergy}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <textarea
                                                                        className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-red-500 outline-none min-h-[80px]"
                                                                        value={clinicalForm.food_intolerances}
                                                                        onChange={(e) => setClinicalForm({ ...clinicalForm, food_intolerances: e.target.value })}
                                                                        placeholder="Specific food intolerances or digestive triggers..."
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {selectedProfile.allergies?.length > 0 ? selectedProfile.allergies.map(a => (
                                                                            <span key={a} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase border border-red-100">{a}</span>
                                                                        )) : <span className="text-sm text-[var(--color-text-muted)] italic">None recorded</span>}
                                                                    </div>
                                                                    {selectedProfile.food_intolerances && (
                                                                        <p className="text-sm text-[var(--color-text-main)] font-medium italic border-l-4 border-red-200 pl-3">
                                                                            {selectedProfile.food_intolerances}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={14} /> Clinical Symptoms & Observations
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-orange-500 outline-none min-h-[80px]"
                                                                    value={clinicalForm.symptoms}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, symptoms: e.target.value })}
                                                                    placeholder="Current symptoms: bloating, fatigue, skin issues..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium">
                                                                    {selectedProfile.symptoms || "No active symptoms reported."}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={14} /> Lifestyle & Environmental Factors
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-purple-500 outline-none min-h-[80px]"
                                                                    value={clinicalForm.lifestyle_factors}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, lifestyle_factors: e.target.value })}
                                                                    placeholder="Sleep quality, screen time, physical activity environment..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium">
                                                                    {selectedProfile.lifestyle_factors || "Standard lifestyle patterns."}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={14} /> Bristol Stool Scale (Baseline)
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                                                {BRISTOL_TYPES.map(type => {
                                                                    const currentVal = isClinicalEditing ? clinicalForm.bristol_stool_scale : selectedProfile.bristol_stool_scale;
                                                                    const isSelected = currentVal === type.type;
                                                                    return (
                                                                        <button
                                                                            key={type.type}
                                                                            type="button"
                                                                            disabled={!isClinicalEditing}
                                                                            onClick={() => isClinicalEditing && setClinicalForm({ ...clinicalForm, bristol_stool_scale: type.type })}
                                                                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group ${isSelected
                                                                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                                                : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] hover:border-amber-400 disabled:opacity-50'
                                                                                } ${!isClinicalEditing ? 'cursor-default' : 'cursor-pointer'}`}
                                                                        >
                                                                            <span className="text-xl">
                                                                                {type.type === 1 && '🥜'}
                                                                                {type.type === 2 && '🍇'}
                                                                                {type.type === 3 && '🥖'}
                                                                                {type.type === 4 && '🐍'}
                                                                                {type.type === 5 && '💧'}
                                                                                {type.type === 6 && '☁️'}
                                                                                {type.type === 7 && '🌊'}
                                                                            </span>
                                                                            <div className="text-center">
                                                                                <p className="text-[10px] font-black uppercase tracking-tight">{type.label}</p>
                                                                                <p className={`text-[8px] font-bold uppercase leading-tight ${isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                                                                                    {type.desc}
                                                                                </p>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] font-medium bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-[var(--color-divider)]">
                                                                <strong>Assessment Guide:</strong> {BRISTOL_TYPES.find(t => t.type === (isClinicalEditing ? clinicalForm.bristol_stool_scale : selectedProfile.bristol_stool_scale))?.detail}
                                                            </p>
                                                        </div>

                                                        <div className="p-6 bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] shadow-sm space-y-4">
                                                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                                                <Activity size={14} /> Weigh-in Conditions
                                                            </h4>
                                                            {isClinicalEditing ? (
                                                                <textarea
                                                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-medium focus:border-indigo-500 outline-none min-h-[80px]"
                                                                    value={clinicalForm.weigh_in_conditions}
                                                                    onChange={(e) => setClinicalForm({ ...clinicalForm, weigh_in_conditions: e.target.value })}
                                                                    placeholder="e.g. Early morning, before breakfast, same clothes..."
                                                                />
                                                            ) : (
                                                                <div className="text-sm text-[var(--color-text-main)] font-medium">
                                                                    {selectedProfile.weigh_in_conditions || "Standard conditions."}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. VACCINATION HISTORY & MANAGEMENT */}
                                            <div className="mt-8 space-y-6">
                                                <div className="flex items-center justify-between border-b-2 border-[var(--color-divider)] pb-4">
                                                    <div>
                                                        <h3 className="font-black text-xl text-[var(--color-secondary)] uppercase tracking-tight">Structured Vaccination History</h3>
                                                        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Comprehensive immunization record and tracking</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isClinicalEditing && !isAddingVaccine && (
                                                            <Button
                                                                variant="primary"
                                                                onClick={() => setIsAddingVaccine(true)}
                                                                className="flex gap-2 text-xs font-black uppercase"
                                                            >
                                                                <Plus size={16} />
                                                                Add Vaccine Record
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {isAddingVaccine && (
                                                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/30 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest ml-1">Vaccine Type</label>
                                                                <select
                                                                    value={newVaccine.typeId}
                                                                    onChange={(e) => setNewVaccine({ ...newVaccine, typeId: e.target.value })}
                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 bg-white text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                                                                >
                                                                    <option value="">Select vaccine...</option>
                                                                    {vaccinationTypes.map(t => (
                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest ml-1">Date Administered</label>
                                                                <input
                                                                    type="date"
                                                                    value={newVaccine.date}
                                                                    onChange={(e) => setNewVaccine({ ...newVaccine, date: e.target.value })}
                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 bg-white text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest ml-1">Batch # / Notes</label>
                                                                <input
                                                                    type="text"
                                                                    value={newVaccine.notes}
                                                                    onChange={(e) => setNewVaccine({ ...newVaccine, notes: e.target.value })}
                                                                    placeholder="e.g. Batch #7721-A"
                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 bg-white text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-3">
                                                            <Button variant="ghost" onClick={() => setIsAddingVaccine(false)} className="text-xs font-black uppercase">
                                                                Cancel
                                                            </Button>
                                                            <Button onClick={handleAddVaccine} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase px-6">
                                                                Save Record
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {childVaccinations.length === 0 ? (
                                                    <div className="p-12 text-center bg-[var(--color-bg-page)] rounded-3xl border-2 border-dashed border-[var(--color-divider)]">
                                                        <Stethoscope size={48} className="mx-auto text-[var(--color-text-muted)] mb-4 opacity-20" />
                                                        <p className="text-[var(--color-text-muted)] font-black uppercase text-sm tracking-widest">No Immunization Records</p>
                                                        <p className="text-xs mt-1">Start by adding a new vaccine record for {selectedProfile.child_name}.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {childVaccinations.map(v => (
                                                            <div key={v.id} className="group relative flex items-start gap-3 p-3 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-divider)] hover:border-emerald-500/50 hover:shadow-sm transition-all duration-300">
                                                                <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                                    <Check size={16} strokeWidth={3} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-[11px] font-black uppercase tracking-tight text-[var(--color-text-main)] truncate">
                                                                        {v.vaccination_types?.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-muted)] font-black uppercase mt-0.5">
                                                                        <Calendar size={10} />
                                                                        {new Date(v.date_administered).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                    </div>
                                                                    {v.notes && (
                                                                        <p className="mt-1 text-[9px] text-[var(--color-text-muted)] italic font-bold uppercase tracking-tight leading-tight opacity-70">
                                                                            {v.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {isClinicalEditing && (
                                                                    <button
                                                                        onClick={() => handleDeleteVaccine(v.id)}
                                                                        className="p-1 text-red-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                                                        title="Delete Record"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 4. GROWTH TRACKING (Moved to bottom) */}
                                            <div className="space-y-6 pt-4">
                                                <div className="flex items-center justify-between border-b-2 border-[var(--color-divider)] pb-4">
                                                    <div>
                                                        <h3 className="font-black text-xl text-[var(--color-primary)] uppercase tracking-tight">Growth & Development Trends</h3>
                                                        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase">Longitudinal height and weight tracking</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-[10px] font-black border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white uppercase tracking-widest"
                                                        onClick={() => setIsGrowthModalOpen(true)}
                                                    >
                                                        <Plus size={14} className="mr-2" /> Log New Growth Data
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                                    <Card className="border-2 border-[var(--color-divider)] shadow-sm bg-[var(--color-bg-card)] rounded-3xl overflow-hidden">
                                                        <CardHeader className="pb-2 bg-[var(--color-bg-page)] border-b border-[var(--color-divider)]">
                                                            <CardTitle className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                                <TrendingUp size={14} className="text-[var(--color-secondary)]" /> Height Tracking (cm)
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-6">
                                                            <div className="h-[250px] w-full min-h-[250px]" style={{ minWidth: 0 }}>
                                                                {growthLogs.length > 0 ? (
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <LineChart data={growthLogs}>
                                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                                                            <XAxis
                                                                                dataKey="logged_at"
                                                                                tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                                                                                fontSize={10}
                                                                                tick={{ fill: 'var(--color-text-muted)' }}
                                                                            />
                                                                            <YAxis fontSize={10} tick={{ fill: 'var(--color-text-muted)' }} domain={['auto', 'auto']} />
                                                                            <Tooltip
                                                                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                                                contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-divider)', borderRadius: '12px', color: 'var(--color-text-main)' }}
                                                                            />
                                                                            <Line type="monotone" dataKey="height_cm" stroke="var(--color-secondary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--color-secondary)' }} activeDot={{ r: 6 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] italic">No height history logged.</div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    <Card className="border-2 border-[var(--color-divider)] shadow-sm bg-[var(--color-bg-card)] rounded-3xl overflow-hidden">
                                                        <CardHeader className="pb-2 bg-[var(--color-bg-page)] border-b border-[var(--color-divider)]">
                                                            <CardTitle className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                                <TrendingUp size={14} className="text-[var(--color-primary)]" /> Weight Tracking (kg)
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-6">
                                                            <div className="h-[250px] w-full min-h-[250px]" style={{ minWidth: 0 }}>
                                                                {growthLogs.length > 0 ? (
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <LineChart data={growthLogs}>
                                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                                                            <XAxis
                                                                                dataKey="logged_at"
                                                                                tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                                                                                fontSize={10}
                                                                                tick={{ fill: 'var(--color-text-muted)' }}
                                                                            />
                                                                            <YAxis fontSize={10} tick={{ fill: 'var(--color-text-muted)' }} domain={['auto', 'auto']} />
                                                                            <Tooltip
                                                                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                                                                contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-divider)', borderRadius: '12px', color: 'var(--color-text-main)' }}
                                                                            />
                                                                            <Line type="monotone" dataKey="weight_kg" stroke="var(--color-primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-muted)] italic">No weight history logged.</div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl border-2 border-green-100 dark:border-green-800/30">
                                                <h4 className="font-black text-green-800 dark:text-green-300 uppercase tracking-widest text-xs mb-2">Clinical Insights Summary</h4>
                                                <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                                                    Currently tracking <strong>{rules.length} active nutrition rules</strong> for this profile. All clinical parameters and growth metrics are up to date as of {new Date().toLocaleDateString()}.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: LOG HISTORY (Date-Grouped) */}
                                    {activeTab === 'history' && (
                                        <div className="animate-in fade-in duration-500 flex flex-col md:flex-row gap-8 min-h-[600px]">
                                            {/* LEFT SIDEBAR: DATE SELECTION */}
                                            <div className="w-full md:w-72 flex-shrink-0 space-y-4">
                                                <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest px-2 mb-4">Log Timeline</h3>
                                                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:max-h-[700px] scrollbar-hide pb-2 md:pb-0">
                                                    {Object.keys(logs.reduce((acc, log) => {
                                                        const date = new Date(log.logged_at).toLocaleDateString();
                                                        acc[date] = true;
                                                        return acc;
                                                    }, {})).sort((a, b) => new Date(b) - new Date(a)).map(date => {
                                                        const isSelected = selectedHistoryDate === date;
                                                        const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === date);
                                                        return (
                                                            <button
                                                                key={date}
                                                                onClick={() => setSelectedHistoryDate(date)}
                                                                className={`flex-shrink-0 flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${isSelected
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg scale-[1.02] z-10'
                                                                        : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm ${dayStatuses[date] === 'danger' ? 'bg-red-500' :
                                                                            dayStatuses[date] === 'warning' ? 'bg-amber-500' :
                                                                                dayStatuses[date] === 'success' ? 'bg-emerald-500' :
                                                                                    'bg-gray-300'
                                                                        }`} />
                                                                    <div className="text-left">
                                                                        <div className={`text-sm font-black ${isSelected ? 'text-white' : 'text-[var(--color-text-main)]'}`}>{date}</div>
                                                                        <div className={`text-[9px] font-bold uppercase tracking-tighter ${isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
                                                                            {dayLogs.length} Entries • {Math.round(dayLogs.reduce((s, l) => s + (l.total_calories || 0), 0))} kcal
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                    {logs.length === 0 && (
                                                        <div className="p-8 text-center text-[var(--color-text-muted)] italic text-sm">No log history available.</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT CONTENT: DAILY LOGS */}
                                            <div className="flex-grow space-y-8">
                                                {selectedHistoryDate && (
                                                    <>
                                                        {/* DAILY SUMMARY CARD */}
                                                        <div className="p-4 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-divider)] shadow-sm">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                                                <div>
                                                                    <h3 className="text-sm font-black text-[var(--color-text-main)] uppercase tracking-widest">Daily Summary</h3>
                                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter">{new Date(selectedHistoryDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                                                        <Activity size={12} />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Analytics Active</span>
                                                                    </div>
                                                                    {logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate && l.status === 'pending').length > 0 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => handleVerifyAllForDay(selectedHistoryDate)}
                                                                            className="h-7 px-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] hover:text-white transition-all font-black text-[9px] uppercase tracking-widest"
                                                                        >
                                                                            <Check size={12} className="mr-1" />
                                                                            Verify All ({logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate && l.status === 'pending').length})
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => handleClearLogsForDay(selectedHistoryDate)}
                                                                        className="h-7 px-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-600 hover:text-white transition-all group font-black text-[9px] uppercase tracking-widest"
                                                                    >
                                                                        <Trash2 size={12} className="mr-1 group-hover:scale-110" />
                                                                        Clear Day
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* VIOLATIONS ALERT PANEL */}
                                                            {dailyViolations.length > 0 && (
                                                                <div className="mb-4 p-2 bg-rose-50/50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 rounded-xl animate-in fade-in duration-500">
                                                                    <div className="flex items-center gap-2 mb-1 px-1">
                                                                        <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                                                                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Nutritional Limit Alerts</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2 px-1">
                                                                        {dailyViolations.map((v, i) => (
                                                                            <div key={i} className="text-[10px] font-black flex items-center bg-[var(--color-bg-page)] px-3 py-1.5 rounded-xl border border-[var(--color-divider)] shadow-sm">
                                                                                <span className="text-[var(--color-danger)] mr-2 uppercase tracking-tight">{v.name}</span>
                                                                                <span className="text-[var(--color-text-main)]">{v.actual}{v.unit}</span>
                                                                                <span className="mx-2 text-[var(--color-text-muted)] opacity-30">/</span>
                                                                                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Limit {v.limit}{v.unit}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                {[
                                                                    { label: 'Total Calories', value: logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_calories || 0), 0), unit: 'kcal', color: 'text-[var(--color-primary)]' },
                                                                    { label: 'Total Protein', value: logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_protein_g || 0), 0), unit: 'g', color: 'text-blue-500' },
                                                                    { label: 'Total Carbs', value: logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_carbs_g || 0), 0), unit: 'g', color: 'text-orange-500' },
                                                                    { label: 'Total Fat', value: logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).reduce((sum, l) => sum + (l.total_fat_g || 0), 0), unit: 'g', color: 'text-amber-500' }
                                                                ].map((stat, idx) => (
                                                                    <div key={idx} className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{stat.label}</div>
                                                                        <div className={`text-xl font-black ${stat.color} dark:brightness-125`}>{Math.round(stat.value)} <span className="text-[10px] opacity-70">{stat.unit}</span></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* MEAL LIST */}
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between border-b-2 border-[var(--color-divider)] pb-4">
                                                                <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Meal Sequence</h4>
                                                                <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">{logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).length} Entries Captured</span>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-4">
                                                                {logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).map(log => (
                                                                    <div
                                                                        key={log.id}
                                                                        onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                                        className="group relative bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)]/50 transition-all overflow-hidden flex flex-col md:flex-row h-full md:h-40 cursor-pointer shadow-sm hover:shadow-md"
                                                                    >
                                                                        <div className="w-full md:w-48 h-40 md:h-auto relative overflow-hidden flex-shrink-0">
                                                                            <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                                                                                {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-6 flex-grow flex flex-col justify-between">
                                                                            <div>
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className="text-sm font-black text-[var(--color-secondary)] uppercase tracking-tight">{log.meal_category}</h5>
                                                                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${(log.status === 'verified' || log.status === 'reviewed') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                                                        }`}>
                                                                                        {(log.status === 'verified' || log.status === 'reviewed') ? 'Clinically Verified' : 'Awaiting Review'}
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-sm font-bold text-[var(--color-text-main)] line-clamp-1">
                                                                                    {log.nutritionist_review?.meal_summary || log.ai_analysis?.meal_summary || "Meal Log Entry"}
                                                                                </p>
                                                                                <div className="flex gap-4 mt-3">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Calories</span>
                                                                                        <span className="text-xs font-black text-[var(--color-text-main)]">{log.total_calories || 0} <span className="text-[8px]">kcal</span></span>
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Consumption</span>
                                                                                        <span className="text-xs font-black text-blue-600">
                                                                                            {log.consumption_percent === 100 ? 'Finished' :
                                                                                                log.consumption_percent === 75 ? 'Mostly' :
                                                                                                    log.consumption_percent === 50 ? 'Half' :
                                                                                                        log.consumption_percent === 25 ? 'A Little' :
                                                                                                            log.consumption_percent === 0 ? 'None' :
                                                                                                                'Finished'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-end items-center gap-2 pt-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    onClick={() => handleDeleteLog(log.id)}
                                                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                                                    title="Delete Entry"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                                                    className="h-8 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                                                                                >
                                                                                    View Details →
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
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
                                                        {[
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
                                                        <div key={note.id} className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 space-y-3 relative group">
                                                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                                                                <span className="text-xs font-bold text-blue-600 uppercase">ADIME RECORD</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                setEditingAdimeId(note.id);
                                                                                setEditAdimeForm(note);
                                                                            }}
                                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                                            title="Edit Record"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => handleDeleteAdimeNote(note.id)}
                                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                                            title="Delete Record"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {editingAdimeId === note.id ? (
                                                                <form onSubmit={handleUpdateAdime} className="space-y-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {[
                                                                            { key: 'assessment', label: 'Assessment' },
                                                                            { key: 'diagnosis', label: 'Diagnosis' },
                                                                            { key: 'intervention', label: 'Intervention' },
                                                                            { key: 'monitoring', label: 'Monitoring/Eval' }
                                                                        ].map((field, idx) => (
                                                                            <div key={idx} className="space-y-1">
                                                                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{field.label}</label>
                                                                                <div className="bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 border-[var(--color-divider)]">
                                                                                    <ReactQuill
                                                                                        theme="snow"
                                                                                        value={editAdimeForm[field.key]}
                                                                                        onChange={(val) => setEditAdimeForm({ ...editAdimeForm, [field.key]: val })}
                                                                                        modules={{ toolbar: false }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="flex justify-end gap-2 pt-2">
                                                                        <Button variant="ghost" type="button" onClick={() => setEditingAdimeId(null)} className="text-xs font-black uppercase">Cancel</Button>
                                                                        <Button type="submit" className="bg-blue-600 text-white text-xs font-black uppercase px-6">Update Record</Button>
                                                                    </div>
                                                                </form>
                                                            ) : (
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
                                                                                dangerouslySetInnerHTML={{ __html: note[field.key] || '<em class="text-[var(--color-text-muted)] opacity-60">No clinical data recorded.</em>' }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
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
                                                    <p className="text-center py-12 text-[var(--color-text-muted)] italic bg-gray-50 dark:bg-white/5 rounded-xl border-2 border-dashed border-[var(--color-divider)]">No clinical observations recorded for this profile yet.</p>
                                                ) : (
                                                    notes.map(note => (
                                                        <div key={note.id} className={`p-5 border rounded-xl relative group hover:shadow-md transition-all ${note.is_pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white dark:bg-white/5 border-[var(--color-divider)]'}`}>
                                                            {note.is_pinned && <span className="absolute top-2 right-4 text-[10px] font-black text-yellow-600 uppercase flex items-center gap-1">📌 Pinned</span>}

                                                            {editingNoteId === note.id ? (
                                                                <form onSubmit={handleUpdateNote} className="space-y-3">
                                                                    <div className="bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 border-[var(--color-primary)]">
                                                                        <ReactQuill
                                                                            theme="snow"
                                                                            value={editNoteForm}
                                                                            onChange={setEditNoteForm}
                                                                            modules={{ toolbar: false }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button variant="ghost" type="button" onClick={() => setEditingNoteId(null)} className="text-xs font-black uppercase">Cancel</Button>
                                                                        <Button type="submit" className="bg-[var(--color-primary)] text-white text-xs font-black uppercase px-6 shadow-lg shadow-emerald-500/20">Update Note</Button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <div
                                                                        className="prose prose-sm dark:prose-invert max-w-none mb-4"
                                                                        dangerouslySetInnerHTML={{ __html: note.content }}
                                                                    />

                                                                    <div className="flex justify-between items-center pt-3 border-t border-[var(--color-divider)]">
                                                                        <span className="text-xs font-medium text-[var(--color-text-muted)]">{new Date(note.created_at).toLocaleString()}</span>
                                                                        <div className="flex gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                onClick={() => {
                                                                                    setEditingNoteId(note.id);
                                                                                    setEditNoteForm(note.content);
                                                                                }}
                                                                                className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                                                title="Edit Note"
                                                                            >
                                                                                <Edit2 size={16} />
                                                                            </Button>
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
                                                                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                                                title="Delete Note"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
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
                                                <div className="h-[300px] w-full min-h-[300px] flex flex-col" style={{ minWidth: 0 }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                                        <div key={rule.id} className="p-4 border border-[var(--color-divider)] rounded-xl bg-[var(--color-bg-card)] shadow-sm hover:shadow-md transition-shadow">
                                                            {editingRuleId === rule.id ? (
                                                                <form onSubmit={handleUpdateRule} className="space-y-6">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Category</label>
                                                                            <select
                                                                                value={editRuleForm.category}
                                                                                onChange={(e) => setEditRuleForm({ ...editRuleForm, category: e.target.value })}
                                                                                className="w-full p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                                                                            >
                                                                                {['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Sugar', 'Sodium', 'Fiber', 'Iron', 'Calcium', 'Fluid/Water', 'Added Sugars', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Rule Name</label>
                                                                            <input
                                                                                type="text"
                                                                                value={editRuleForm.rule_name}
                                                                                onChange={(e) => setEditRuleForm({ ...editRuleForm, rule_name: e.target.value })}
                                                                                className="w-full p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)]"
                                                                                placeholder="e.g. Daily Limit"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Logic</label>
                                                                            <select
                                                                                value={editRuleForm.rule_type}
                                                                                onChange={(e) => setEditRuleForm({ ...editRuleForm, rule_type: e.target.value })}
                                                                                className="w-full p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                                                                            >
                                                                                <option value="max">Maximum (Limit)</option>
                                                                                <option value="min">Minimum (Goal)</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Value & Unit</label>
                                                                            <div className="flex gap-2">
                                                                                <input
                                                                                    type="number"
                                                                                    value={editRuleForm.rule_value}
                                                                                    onChange={(e) => setEditRuleForm({ ...editRuleForm, rule_value: e.target.value })}
                                                                                    className="flex-grow p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)]"
                                                                                    placeholder="Value"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    value={editRuleForm.rule_unit}
                                                                                    onChange={(e) => setEditRuleForm({ ...editRuleForm, rule_unit: e.target.value })}
                                                                                    className="w-16 p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)] text-center"
                                                                                    placeholder="Unit"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button variant="ghost" type="button" onClick={() => setEditingRuleId(null)} className="text-xs font-black uppercase">Cancel</Button>
                                                                        <Button type="submit" className="bg-[var(--color-primary)] text-white text-xs font-black uppercase px-6 shadow-lg shadow-emerald-500/20">Save Changes</Button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${rule.category === 'Sugar' || rule.category === 'Added Sugars' ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' :
                                                                                rule.category === 'Protein' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' :
                                                                                    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-gray-400 dark:border-white/10'
                                                                                }`}>
                                                                                {rule.category}
                                                                            </span>
                                                                            <span className="font-bold text-base text-[var(--color-text-main)]">{rule.rule_name}</span>
                                                                        </div>
                                                                        <p className="text-sm text-[var(--color-text-muted)] pl-1 font-medium">
                                                                            {rule.rule_type ? `${rule.rule_type === 'max' ? 'Maximum' : 'Minimum'} ${rule.rule_value} ${rule.rule_unit}` : rule.rule_definition}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                setEditingRuleId(rule.id);
                                                                                setEditRuleForm(rule);
                                                                            }}
                                                                            className="h-8 w-8 p-0 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-all"
                                                                            title="Edit Rule"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => confirmDeleteRule(rule)}
                                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                                                            title="Delete Rule"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
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

                                    {/* Final Closing of Tab Content Container */}

                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* UI Overlays */}
            <Notification
                {...notif}
                onClose={() => setNotif({ ...notif, show: false })}
            />


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
                                onChange={(e) => setMealForm({ ...mealForm, meal_type: e.target.value })}
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
                                onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
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
                            onChange={(e) => setMealForm({ ...mealForm, recipe_name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-600 uppercase">Protein (g)</label>
                            <input
                                type="number"
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.protein_g}
                                onChange={(e) => setMealForm({ ...mealForm, protein_g: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-amber-600 uppercase">Carbs (g)</label>
                            <input
                                type="number"
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.carbs_g}
                                onChange={(e) => setMealForm({ ...mealForm, carbs_g: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase">Fats (g)</label>
                            <input
                                type="number"
                                className="w-full p-2.5 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)]"
                                value={mealForm.fats_g}
                                onChange={(e) => setMealForm({ ...mealForm, fats_g: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black py-3 rounded-xl mt-4">
                        Save to Planner
                    </Button>
                </form>
            </Modal>
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                isDestructive={confirmDialog.isDestructive}
            />

            <ReviewLogModal
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                log={selectedLogForReview}
                onReviewComplete={() => {
                    fetchLogs(selectedProfile.id);
                    fetchAdimeNotes(selectedProfile.id);
                    setIsReviewOpen(false);
                }}
            />

            {/* Simplified Growth Chart Modal */}
            <Modal
                isOpen={isGrowthChartOpen}
                onClose={() => setIsGrowthChartOpen(false)}
                title={`Growth History - ${selectedProfile?.child_name}`}
                maxWidth="max-w-6xl"
            >
                <div className="space-y-6">
                    <div className="h-[400px] w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[var(--color-divider)] flex flex-col" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={[...growthLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                                <XAxis
                                    dataKey="logged_at"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    fontSize={10}
                                    tick={{ fill: 'var(--color-text-muted)', fontWeight: 700 }}
                                />
                                <YAxis fontSize={10} tick={{ fill: 'var(--color-text-muted)', fontWeight: 700 }} />
                                <Tooltip
                                    labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-divider)', borderRadius: '12px', fontSize: '10px', fontWeight: 900 }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />

                                <Line
                                    type="monotone"
                                    dataKey="weight_kg"
                                    stroke="var(--color-primary)"
                                    strokeWidth={4}
                                    name="Weight (kg)"
                                    dot={{ r: 6, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="height_cm"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    name="Height (cm)"
                                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                        <span>Chronological Progress Tracking</span>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[var(--color-primary)] rounded-full" /> Weight</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-500 rounded-full" /> Height</span>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* NEW: Velocity Ledger Modal */}
            <Modal
                isOpen={isVelocityModalOpen}
                onClose={() => setIsVelocityModalOpen(false)}
                title={`Clinical Velocity Ledger - ${selectedProfile?.child_name}`}
                maxWidth="max-w-4xl"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--color-divider)]">
                                    <th className="px-4 py-3 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest text-right">Weight (Δ)</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest text-right">Height (Δ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-divider)]">
                                {velocityStats.length > 0 ? velocityStats.map((stat, i) => (
                                    <tr key={i} className="hover:bg-indigo-500/5 transition-colors">
                                        <td className="px-4 py-4 text-xs font-black text-[var(--color-text-main)] uppercase">
                                            {new Date(stat.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-sm font-black text-[var(--color-secondary)]">{stat.weight} <span className="text-[10px] opacity-50 uppercase">kg</span></div>
                                            <div className={`text-[10px] font-black flex items-center justify-end gap-1 ${parseFloat(stat.weightVel) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {parseFloat(stat.weightVel) > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {parseFloat(stat.weightVel) > 0 ? '+' : ''}{stat.weightVel} kg/mo
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-sm font-black text-[var(--color-secondary)]">{stat.height} <span className="text-[10px] opacity-50 uppercase">cm</span></div>
                                            <div className={`text-[10px] font-black flex items-center justify-end gap-1 ${parseFloat(stat.heightVel) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {parseFloat(stat.heightVel) > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {parseFloat(stat.heightVel) > 0 ? '+' : ''}{stat.heightVel} cm/mo
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-20 text-center text-xs font-bold text-[var(--color-text-muted)] italic uppercase">No velocity data recorded.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Button variant="outline" className="w-full font-black uppercase text-[10px] py-4 rounded-2xl" onClick={() => setIsVelocityModalOpen(false)}>Close Ledger</Button>
                </div>
            </Modal>


            <CreatePatientModal
                isOpen={isAddProfileOpen}
                onClose={() => setIsAddProfileOpen(false)}
                parentId={clientId}
                parentEmail={clientEmail}
                parentName={clientName}
                onClientAdded={() => {
                    fetchProfiles();
                    showNotif("Child profile added successfully!");
                }}
            />
        </div>
    );
}
