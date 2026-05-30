import React, { useState, useEffect, useRef, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, parseISO, subWeeks, addWeeks, startOfDay } from 'date-fns';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, User, Users, Plus, Trash2, Save, MessageSquare, StickyNote, Utensils, Monitor, Activity, ClipboardCheck, TrendingUp, TrendingDown, Info, Edit2, Stethoscope, Link2, PieChart, ChefHat, AlertTriangle, Bold, Italic, List, ListOrdered, Calendar, Check, BadgeCheck, ShieldAlert, Eye, AlertCircle, Clock, Filter, Table, Leaf, Apple, Milk, Zap, Beef, Droplets, PanelLeftOpen, PanelLeftClose, BookmarkPlus, ListFilter, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatValue, convertHeight, convertWeight } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, Scatter } from 'recharts';
import Modal from '../components/common/Modal';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import ReviewLogModal from '../components/ReviewLogModal';
import CreatePatientModal from '../components/CreatePatientModal';
import { ClientDetailsSkeleton, SkeletonLoader } from '../components/SkeletonShell';
import InsightsTab from './ClientDetails/components/InsightsTab';

const formatDateSafe = (dateVal, options = {}) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString(undefined, options);
};

const getAgeSafe = (dob) => {
    if (!dob) return 'N/A';
    const d = new Date(dob);
    if (isNaN(d.getTime())) return 'N/A';
    const age = new Date().getFullYear() - d.getFullYear();
    return isNaN(age) ? 'N/A' : `${age} Yrs`;
};

// Stable default for the portion exchange matrix — used in fetchPortionPlan to
// avoid the stale-closure bug that blanks out the grid when switching clients.
const DEFAULT_PORTION_MATRIX = [
    { meal_type: 'Breakfast', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
    { meal_type: 'AM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
    { meal_type: 'Lunch', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
    { meal_type: 'PM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
    { meal_type: 'Dinner', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
];

const ALLERGY_OPTIONS = [
    "None",
    "Peanuts",
    "Tree Nuts",
    "Milk/Dairy",
    "Eggs",
    "Wheat/Gluten",
    "Soy",
    "Fish",
    "Shellfish",
    "Sesame",
    "Mustard",
    "Sulfites",
    "Corn",
    "Celery",
    "Lupin",
    "Molluscs",
    "Garlic",
    "Onions",
    "Chocolate/Cocoa",
    "Strawberries",
    "Citrus Fruits",
    "Kiwi",
    "Pineapple",
    "Honey",
    "Beef",
    "Chicken",
    "Pork",
    "Food Dyes/Additives"
];

// Global CSS Overrides for Quill Toolbar Visibility
const quillStyles = `
  .ql-toolbar.ql-snow {
    background-color: var(--color-bg-card) !important;
    border: none !important;
    padding: 8px !important;
    display: flex !important;
    align-items: center !important;
  }
  .ql-snow .ql-picker {
    color: var(--color-text-main) !important;
  }
  .ql-snow .ql-picker-options {
    background-color: var(--color-bg-card) !important;
    border: 1px solid var(--color-divider) !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
    border-radius: 8px !important;
    padding: 4px !important;
    z-index: 100 !important;
  }
  .ql-snow .ql-picker-item {
    color: var(--color-text-main) !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
  }
  .ql-snow .ql-picker-item:hover {
    background-color: var(--color-primary-light) !important;
    color: var(--color-primary) !important;
  }
  .ql-snow .ql-picker-label {
    color: var(--color-text-main) !important;
    font-weight: 700 !important;
  }
  .ql-snow .ql-picker-label:hover {
    color: var(--color-primary) !important;
  }
  .ql-snow .ql-stroke {
    stroke: var(--color-text-main) !important;
    stroke-width: 2.5px !important;
  }
  .ql-snow .ql-fill {
    fill: var(--color-text-main) !important;
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
  
  /* Reset margins for all elements to avoid gaps, especially at the top */
  .ql-editor > * {
    margin-top: 0 !important;
    margin-bottom: 0.75rem !important;
  }
  .ql-editor > *:last-child {
    margin-bottom: 0 !important;
  }
  
  @media (max-width: 640px) {
    .ql-editor {
      min-height: 180px !important;
      padding: 12px 14px !important;
    }
    .ql-toolbar.ql-snow {
      padding: 6px !important;
      flex-wrap: wrap !important;
      display: flex !important;
    }
    .ql-toolbar.ql-snow .ql-formats {
      margin-right: 4px !important;
      margin-bottom: 4px !important;
    }
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

const Sparkline = ({ data, color, dataKey }) => (
    <div className="h-10 w-24 opacity-50">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#gradient-${dataKey})`}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const AutocompleteMatrixCell = ({ value, onChange, item }) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseSuggestions = {
        'vegetables': ['1/2 cup', '1 cup', '1 exchange'],
        'fruit': ['1 pc', '1 slice', '1 exchange', '1/2 cup'],
        'milk': ['1 cup', '1/2 cup', '1 exchange', '8 oz'],
        'rice': ['1/2 cup', '1 cup', '1 exchange', '1 slice'],
        'meat': ['30g', '40g', '1 exchange', '1 oz'],
        'fat': ['1 tsp', '1 tbsp', '1 exchange']
    };
    const defaultSuggestions = baseSuggestions[item.id] || ['1 exchange', '1/2 cup'];

    // Convert value and suggestions to lowercase to safely compare
    const val = value || '';
    const suggestions = val
        ? defaultSuggestions.filter(s => s.toLowerCase().includes(val.toLowerCase()) && s.toLowerCase() !== val.toLowerCase())
        : defaultSuggestions;

    return (
        <div className="flex flex-col items-center relative w-full h-full min-h-[40px]">
            <textarea
                rows={2}
                className="w-full h-full bg-transparent border-0 text-center text-sm font-bold text-[var(--color-text-main)] focus:ring-0 placeholder:text-gray-300 dark:placeholder:text-white/10 resize-none overflow-y-auto scrollbar-hide py-2"
                placeholder="e.g. 1/2 cup"
                value={val}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            />
            {isFocused && suggestions.length > 0 && (
                <div className="absolute top-[80%] left-0 right-0 flex flex-wrap justify-center gap-1 mt-1 z-20 pointer-events-auto bg-white/90 dark:bg-black/90 p-1 rounded-lg shadow-xl border border-[var(--color-divider)] backdrop-blur-sm">
                    {suggestions.map(s => (
                        <div
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); onChange(s); setIsFocused(false); }}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase rounded-md cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-800/60 shadow-sm"
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};



export default function ClientDetails() {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isLoading, startLoading, stopLoading } = useLoading();
    const location = useLocation();
    const [fetchedClientName, setFetchedClientName] = useState('');
    const clientName = location.state?.clientName || fetchedClientName || 'Client';

    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
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
    const [isInitialSync, setIsInitialSync] = useState(true);
    const [showLastAdimeReference, setShowLastAdimeReference] = useState(true);

    const CLINICAL_ADIME_TEMPLATES = [
        {
            name: "Clinical ADIME (Full)",
            content: `<h3><strong>[A] ASSESSMENT</strong></h3><p><strong>Anthropometrics:</strong> [Ht/Length, Wt, BMI, HC]. Z-scores: [WFA, HFA, WFL/BFA]. Growth Trends: [Velocity, Pattern]</p><p><strong>Biochemical:</strong> [Labs: Albumin, Iron, Vitamin D, etc.]</p><p><strong>Clinical:</strong> [Physical Findings: Muscle/Fat Wasting, Hair/Skin/Nails]</p><p><strong>Dietary:</strong> [Current Intake: Breast/Formula/Solids. Feeding Skills. Allergies/Intolerances]</p><br/><h3><strong>[D] DIAGNOSIS (PES Statement)</strong></h3><p><strong>Problem:</strong> [Nutrition Diagnosis Term]</p><p><strong>Etiology:</strong> [Related to...]</p><p><strong>Signs & Symptoms:</strong> [As evidenced by... quantifiable Assessment data]</p><br/><h3><strong>[I] INTERVENTION</strong></h3><p><strong>Nutrition Prescription:</strong> [Kcal/kg, Protein/kg, Fluid needs]. [Texture/Modifications]</p><p><strong>Plan:</strong> [SMART Goals, Education/Counseling, Referrals]</p><br/><h3><strong>[M] MONITORING &amp; [E] EVALUATION</strong></h3><p><strong>Indicators:</strong> [Weight change, Intake volume, Lab improvements]</p><p><strong>Timeline:</strong> [Next follow-up date]</p>`
        },
        {
            name: "PES Statement Only",
            content: `<p><strong>Nutrition Diagnosis (PES):</strong> [Nutrition Problem] related to [Etiology] as evidenced by [Signs &amp; Symptoms / Quantifiable Assessment Data].</p>`
        },
        {
            name: "Nutrition Prescription",
            content: `<h3><strong>NUTRITION PRESCRIPTION</strong></h3><p><strong>Energy Goals:</strong> [Kcal/day or Kcal/kg]</p><p><strong>Protein Goals:</strong> [g/day or g/kg]</p><p><strong>Fluid Needs:</strong> [ml/day]</p><p><strong>Instructions:</strong> [Caregiver education, feeding schedule, or specific formula recipes]</p>`
        },
        {
            name: "Clinical Follow-up",
            content: `<h3><strong>PROGRESS REVIEW</strong></h3><p><strong>Monitoring:</strong> [Changes in Weight/Length Z-scores since last visit]</p><p><strong>Evaluation:</strong> [Evaluation of intake vs. prescription]</p><p><strong>Intervention Updates:</strong> [Modified goals/actions]</p><p><strong>Next Steps:</strong> [Plan for next follow-up visit]</p>`
        }
    ];

    const handleApplyAdimeTemplate = (templateContent) => {
        setNewAdime(prev => {
            const current = prev.assessment || '';
            // Robust check to see if the HTML is effectively empty (stripping tags, NBSP, and whitespace)
            const cleanText = current.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
            const isEmpty = cleanText.length === 0;

            return {
                ...prev,
                assessment: isEmpty
                    ? templateContent
                    : current.trim() + '<br/>' + templateContent
            };
        });
        showNotif("Clinical template applied");
    };

    const handleCopyLastAdime = () => {
        if (adimeNotes.length === 0) {
            showNotif("No historical records found to copy", "error");
            return;
        }
        const lastNote = adimeNotes[0];
        setNewAdime({
            assessment: lastNote.assessment || '',
            diagnosis: lastNote.diagnosis || '',
            intervention: lastNote.intervention || '',
            monitoring: lastNote.monitoring || '',
            evaluation: lastNote.evaluation || ''
        });
        showNotif("Copied forward from last record");
    };

    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // --- Modal & Notif States ---
    const [notif, setNotif] = useState({ show: false, message: '', type: 'success' });

    const showNotif = (message, type = 'success') => {
        setNotif({ show: true, message, type });
        setTimeout(() => setNotif(prev => ({ ...prev, show: false })), 3000);
    };

    // --- History State ---
    const [logs, setLogs] = useState([]);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
    const [isMobileDateDropdownOpen, setIsMobileDateDropdownOpen] = useState(false);



    // --- Notes State ---
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [adimeNotes, setAdimeNotes] = useState([]);
    const [savingAdime, setSavingAdime] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);
    const [hoveredProfileId, setHoveredProfileId] = useState(null);
    const [newAdime, setNewAdime] = useState({
        assessment: '',
        diagnosis: '',
        intervention: '',
        monitoring: '',
        evaluation: ''
    });

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
    const [clientData, setClientData] = useState(null);
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

    // --- Auto-Save & Optimistic UI State ---
    const [syncStatus, setSyncStatus] = useState({ type: 'idle', lastSaved: null }); // idle, saving, saved, error
    const [isRestored, setIsRestored] = useState({ adime: false, note: false });

    // Helper: Local Storage Persistence
    const saveDraft = (key, data) => {
        if (!selectedProfile) return;
        localStorage.setItem(`draft_${key}_${selectedProfile.id}`, JSON.stringify(data));
        setSyncStatus({ type: 'saved', lastSaved: new Date() });
    };

    const loadDraft = (key) => {
        if (!selectedProfile) return null;
        const saved = localStorage.getItem(`draft_${key}_${selectedProfile.id}`);
        return saved ? JSON.parse(saved) : null;
    };

    const clearDraft = (key) => {
        if (!selectedProfile) return;
        localStorage.removeItem(`draft_${key}_${selectedProfile.id}`);
    };

    // Auto-Save Effect for ADIME
    useEffect(() => {
        if (!selectedProfile || isInitialSync) return;

        const hasContent = Object.values(newAdime).some(v => v && v.replace(/<[^>]*>/g, '').trim().length > 0);
        if (!hasContent) {
            clearDraft('adime');
            return;
        }

        setSyncStatus({ type: 'saving', lastSaved: null });
        const timer = setTimeout(() => {
            saveDraft('adime', newAdime);
        }, 1500);

        return () => clearTimeout(timer);
    }, [newAdime]);

    // Auto-Save Effect for Progress Notes
    useEffect(() => {
        if (!selectedProfile || isInitialSync) return;

        const hasContent = newNote && newNote.replace(/<[^>]*>/g, '').trim().length > 0;
        if (!hasContent) {
            clearDraft('note');
            return;
        }

        setSyncStatus({ type: 'saving', lastSaved: null });
        const timer = setTimeout(() => {
            saveDraft('note', newNote);
        }, 1500);

        return () => clearTimeout(timer);
    }, [newNote]);

    // Restore Drafts on Profile Change
    useEffect(() => {
        if (selectedProfile) {
            const adimeDraft = loadDraft('adime');
            const noteDraft = loadDraft('note');

            if (adimeDraft) {
                setNewAdime(adimeDraft);
            } else {
                setNewAdime({
                    assessment: '',
                    diagnosis: '',
                    intervention: '',
                    monitoring: '',
                    evaluation: ''
                });
            }

            if (noteDraft) {
                setNewNote(noteDraft);
            } else {
                setNewNote('');
            }

            setIsRestored({ adime: !!adimeDraft, note: !!noteDraft });
        }
    }, [selectedProfile?.id]);

    // --- Meal Planner & Tab State ---
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(tabFromUrl);
    const prevTabRef = useRef(activeTab);
    const [tabDirection, setTabDirection] = useState(1);

    const TAB_ORDER = ['overview', 'history', 'insights', 'adime', 'rules', 'notes', 'portions', 'plan'];

    const setTab = (newTab) => {
        const prevIdx = TAB_ORDER.indexOf(prevTabRef.current);
        const newIdx = TAB_ORDER.indexOf(newTab);
        setTabDirection(newIdx >= prevIdx ? 1 : -1);
        prevTabRef.current = newTab;
        setActiveTab(newTab);
    };

    useEffect(() => {
        setSearchParams({ tab: activeTab }, { replace: true });
    }, [activeTab, setSearchParams]);

    // Apply native hover tooltips to all ReactQuill style bar toolbar controls dynamically
    useEffect(() => {
        const tooltipMap = {
            '.ql-bold': 'Bold (Ctrl+B)',
            '.ql-italic': 'Italic (Ctrl+I)',
            '.ql-underline': 'Underline (Ctrl+U)',
            '.ql-strike': 'Strikethrough',
            '.ql-blockquote': 'Block Quote',
            '.ql-code-block': 'Code Block',
            '.ql-list[value="ordered"]': 'Numbered List',
            '.ql-list[value="bullet"]': 'Bullet List',
            '.ql-header[value="1"]': 'Heading 1',
            '.ql-header[value="2"]': 'Heading 2',
            '.ql-header[value="3"]': 'Heading 3',
            '.ql-script[value="sub"]': 'Subscript',
            '.ql-script[value="super"]': 'Superscript',
            '.ql-indent[value="-1"]': 'Decrease Indent',
            '.ql-indent[value="+1"]': 'Increase Indent',
            '.ql-direction[value="rtl"]': 'Text Direction',
            '.ql-link': 'Insert Link',
            '.ql-image': 'Insert Image',
            '.ql-video': 'Insert Video',
            '.ql-clean': 'Clear Formatting',
            '.ql-font': 'Font Family',
            '.ql-size': 'Text Size',
            '.ql-color': 'Text Color',
            '.ql-background': 'Highlight Color',
            '.ql-align': 'Alignment'
        };

        const addQuillTooltips = () => {
            const toolbarElements = document.querySelectorAll('.ql-toolbar');
            toolbarElements.forEach(toolbar => {
                Object.entries(tooltipMap).forEach(([selector, tooltipText]) => {
                    const elements = toolbar.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (el && !el.getAttribute('title')) {
                            el.setAttribute('title', tooltipText);
                            el.setAttribute('aria-label', tooltipText);
                        }
                    });
                });

                // Fallback for custom/unmapped buttons
                const buttons = toolbar.querySelectorAll('button');
                buttons.forEach(btn => {
                    if (!btn.getAttribute('title')) {
                        const classes = Array.from(btn.classList);
                        const qlClass = classes.find(c => c.startsWith('ql-'));
                        if (qlClass) {
                            const name = qlClass.replace('ql-', '');
                            const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
                            btn.setAttribute('title', capitalized);
                        }
                    }
                });

                // Fallback for custom/unmapped select pickers
                const pickers = toolbar.querySelectorAll('.ql-picker');
                pickers.forEach(picker => {
                    if (!picker.getAttribute('title')) {
                        const classes = Array.from(picker.classList);
                        const qlClass = classes.find(c => c.startsWith('ql-'));
                        if (qlClass) {
                            const name = qlClass.replace('ql-', '');
                            const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
                            picker.setAttribute('title', capitalized);
                        }
                    }
                });
            });
        };

        // Run immediately and set safe deferred triggers to catch all rendering completions
        addQuillTooltips();
        const timer = setTimeout(addQuillTooltips, 200);
        const timer2 = setTimeout(addQuillTooltips, 800);

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [activeTab]);
    const [mealPlan, setMealPlan] = useState([]);
    const [portionMatrix, setPortionMatrix] = useState([
        { meal_type: 'Breakfast', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
        { meal_type: 'AM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
        { meal_type: 'Lunch', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
        { meal_type: 'PM Snack', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
        { meal_type: 'Dinner', vegetables: '', fruit: '', milk: '', rice: '', meat: '', fat: '', sugar: '' },
    ]);
    const [isSavingPortions, setIsSavingPortions] = useState(false);
    const [portionTemplates, setPortionTemplates] = useState([]);
    const [mealTemplates, setMealTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    // Meal Templates & Grid Editing
    const [editingMeal, setEditingMeal] = useState(null); // { id, recipe_name, calories, protein_g, carbs_g, fats_g, meal_type }
    const [isMealEditModalOpen, setIsMealEditModalOpen] = useState(false);

    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [newTemplateForm, setNewTemplateForm] = useState({ name: '', description: '', target_age: '' });

    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null); // template object from DB
    const [newTemplateName, setNewTemplateName] = useState("");
    const [templateToDelete, setTemplateToDelete] = useState(null);

    useEffect(() => {
        fetchPortionTemplates();
        fetchMealTemplates();
    }, []);

    const fetchPortionTemplates = async () => {
        try {
            const res = await api.get('/nutritionist/portion-templates');
            setPortionTemplates(res.data);
        } catch (err) {
            console.error("Failed to fetch portion templates", err);
        }
    };

    const fetchMealTemplates = async () => {
        try {
            const res = await api.get('/nutritionist/plan/meal-templates');
            setMealTemplates(res.data);
        } catch (err) {
            console.error("Failed to fetch meal templates", err);
        }
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName.trim()) {
            showNotif("Please enter a template name", "error");
            return;
        }
        try {
            const res = await api.post('/nutritionist/portion-templates', {
                template_name: newTemplateName,
                matrix: portionMatrix
            });
            setPortionTemplates([res.data, ...portionTemplates]);
            setIsTemplateModalOpen(false);
            setNewTemplateName("");
            showNotif("Template saved successfully");
        } catch (err) {
            console.error(err);
            showNotif(err.response?.data?.message || "Failed to save template", "error");
        }
    };

    const applyPortionTemplate = (template) => {
        // template.matrix is an array of objects
        // We need to merge it carefully with the current portionMatrix state
        if (!template.matrix) return;

        const newMatrix = portionMatrix.map(row => {
            const savedRow = template.matrix.find(r => r.meal_type === row.meal_type);
            return savedRow ? { ...row, ...savedRow } : row;
        });

        setPortionMatrix(newMatrix);
        showNotif(`Applied template: ${template.template_name}`);
    };

    const executeDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await api.delete(`/nutritionist/portion-templates/${templateToDelete.id}`);
            setPortionTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
            showNotif("Template deleted");
        } catch (err) {
            console.error(err);
            showNotif(err.response?.data?.message || "Failed to delete template", "error");
        } finally {
            setTemplateToDelete(null);
        }
    };

    useEffect(() => {
        if (selectedProfile) {
            fetchPortionPlan(selectedProfile.id);
        }
    }, [selectedProfile?.id]);

    const fetchPortionPlan = async (profileId) => {
        try {
            const res = await api.get(`/nutritionist/portion-plan/${profileId}`);
            if (res.data && res.data.length > 0) {
                // BUG B FIX: Use the stable module-level DEFAULT_PORTION_MATRIX as the
                // merge base instead of `portionMatrix` state, which could be stale
                // (holding the previous client's data) when switching profiles.
                const newMatrix = DEFAULT_PORTION_MATRIX.map(row => {
                    const savedRow = res.data.find(r => r.meal_type === row.meal_type);
                    return savedRow ? { ...row, ...savedRow } : row;
                });
                setPortionMatrix(newMatrix);
            } else {
                // No saved plan — reset cleanly to the default empty matrix
                setPortionMatrix(DEFAULT_PORTION_MATRIX.map(r => ({ ...r })));
            }
        } catch (err) {
            console.error("Error fetching portion plan", err);
        }
    };

    const handleSavePortions = async () => {
        setIsSavingPortions(true);
        try {
            await api.post('/nutritionist/portion-plan', {
                profile_id: selectedProfile.id,
                matrix: portionMatrix
            });
            showNotif("Portion plan saved successfully!");
            // BUG E FIX: Re-fetch from DB after save so the displayed matrix
            // always reflects what was actually committed, not just local state.
            await fetchPortionPlan(selectedProfile.id);
        } catch (err) {
            console.error(err);
            showNotif(err.response?.data?.message || "Failed to save portion plan", "error");
        } finally {
            setIsSavingPortions(false);
        }
    };

    const updatePortionCell = (mealType, field, value) => {
        setPortionMatrix(prev => prev.map(row =>
            row.meal_type === mealType ? { ...row, [field]: value } : row
        ));
    };

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

    // --- Weekly Planning State ---
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [activePlannerDay, setActivePlannerDay] = useState(0);
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
    const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
    const handleThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // --- Growth State ---
    const [growthLogs, setGrowthLogs] = useState([]);
    const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);
    const [newGrowth, setNewGrowth] = useState({ height_cm: '', weight_kg: '' });
    const [isEditGrowthModalOpen, setIsEditGrowthModalOpen] = useState(false);
    const [editingGrowthLog, setEditingGrowthLog] = useState(null);
    const [editGrowthForm, setEditGrowthForm] = useState({ height_cm: '', weight_kg: '', logged_at: '' });
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
        if (!growthLogs || growthLogs.length < 2) return { weight: '0.0', height: '0.0', weightVel: '0.00', heightVel: '0.00' };
        const sorted = [...growthLogs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
        const current = sorted[0];
        const previous = sorted[1];
        
        const diffDays = (new Date(current.logged_at) - new Date(previous.logged_at)) / (1000 * 60 * 60 * 24);
        const months = diffDays / 30.44;
        
        return {
            weight: (current.weight_kg - previous.weight_kg).toFixed(1),
            height: (current.height_cm - previous.height_cm).toFixed(1),
            weightVel: months > 0 ? ((current.weight_kg - previous.weight_kg) / months).toFixed(2) : '0.00',
            heightVel: months > 0 ? ((current.height_cm - previous.height_cm) / months).toFixed(2) : '0.00'
        };
    }, [growthLogs]);

    const clinicalPatterns = useMemo(() => {
        const alerts = [];
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        // 1. Meal Patterns
        if (logs && logs.length > 0) {
            const dailyMealCount = {};
            logs.forEach(log => {
                const dateStr = new Date(log.logged_at).toDateString();
                if (new Date(log.logged_at) >= last7Days && ['Breakfast', 'Lunch', 'Dinner'].includes(log.meal_category)) {
                    dailyMealCount[dateStr] = (dailyMealCount[dateStr] || 0) + 1;
                }
            });

            const skippingDays = Object.entries(dailyMealCount).filter(([_, count]) => count < 2);
            if (skippingDays.length > 0) {
                alerts.push({ icon: Utensils, title: 'Meal Skipping Pattern', desc: `Patient missed core meals on ${skippingDays.length} days in the last week.`, severity: 'high' });
            }

            const highSodium = logs.filter(l => (l.total_sodium_mg || 0) > 800).length;
            if (highSodium > 0) {
                alerts.push({ icon: ShieldAlert, title: 'Sodium Threshold Alert', desc: `${highSodium} meal entries exceeded 800mg sodium limit.`, severity: 'med' });
            }

            const lowConsumption = logs.filter(l => (l.consumption_percent || 100) < 50).length;
            if (lowConsumption >= 3) {
                alerts.push({ icon: AlertTriangle, title: 'Low Intake Alert', desc: `Consistent low plate consumption (<50%) detected in ${lowConsumption} recent meals.`, severity: 'high' });
            }
        }

        // 2. Bristol Stool Patterns
        const recentBristolLogs = logs?.filter(l => l.bristol_stool_scale && new Date(l.logged_at) >= last7Days) || [];
        const diarrheaLogs = recentBristolLogs.filter(l => l.bristol_stool_scale >= 6);
        const constipationLogs = recentBristolLogs.filter(l => l.bristol_stool_scale <= 2);

        if (diarrheaLogs.length > 0) {
            alerts.push({ icon: AlertCircle, title: 'GI Distress: Diarrhea', desc: `${diarrheaLogs.length} instances of Bristol Type 6/7 (Loose/Liquid) detected this week.`, severity: 'critical' });
        }
        if (constipationLogs.length > 0) {
            alerts.push({ icon: AlertCircle, title: 'GI Distress: Constipation', desc: `${constipationLogs.length} instances of Bristol Type 1/2 (Hard) detected this week.`, severity: 'med' });
        }

        // 3. Growth Patterns
        const latestGrowth = growthLogs[growthLogs.length - 1];
        if (latestGrowth?.clinical_analysis) {
            const { weight, height, trends } = latestGrowth.clinical_analysis;

            if (weight.status !== 'Normal') {
                alerts.push({
                    icon: AlertCircle,
                    title: `Growth Alert: ${weight.status}`,
                    desc: `Weight-for-age is in the ${weight.percentile}th percentile (Z: ${weight.zScore}).`,
                    severity: weight.zScore < -3 ? 'critical' : 'high'
                });
            }

            if (height.status !== 'Normal') {
                alerts.push({
                    icon: AlertCircle,
                    title: `Growth Alert: ${height.status}`,
                    desc: `Height-for-age is in the ${height.percentile}th percentile (Z: ${height.zScore}).`,
                    severity: height.zScore < -3 ? 'critical' : 'high'
                });
            }

            if (trends?.clinical_warning) {
                alerts.push({
                    icon: TrendingDown,
                    title: 'Clinical Trend Warning',
                    desc: `${trends.clinical_warning}: Significant percentile shift detected since last visit.`,
                    severity: 'critical'
                });
            }
        }

        if (growthLogs.length > 1) {
            const isImperial = user?.measurement_system === 'imperial';
            const weightVelocity = parseFloat(growthDeltas.weight);
            const displayVal = isImperial ? (weightVelocity * 2.20462).toFixed(1) : weightVelocity.toFixed(1);
            const unitStr = isImperial ? 'lbs' : 'kg';
            if (weightVelocity < -0.5) {
                alerts.push({ icon: TrendingDown, title: 'Rapid Weight Loss', desc: `Significant weight loss of ${Math.abs(displayVal)}${unitStr} detected since last visit.`, severity: 'critical' });
            }
        }

        return alerts.length > 0 ? alerts : [{ icon: Check, title: 'Baseline Stable', desc: 'No significant clinical risks detected in recent logs.', severity: 'low' }];
    }, [logs, growthLogs, growthDeltas]);

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
    const [isAllergyDropdownOpen, setIsAllergyDropdownOpen] = useState(false);

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
                acc.water += (l.water_ml || 0);
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, water: 0 });

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
                else if (rule.category === 'Fluid/Water' || rule.category === 'Water') current = totals.water;

                if (rule.rule_type === 'max' && current > limit) status = 'danger';
                else if (rule.rule_type === 'min' && current < limit) status = 'danger';
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
            acc.water += (l.water_ml || 0);
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, water: 0 });

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
            else if (rule.category === 'Fluid/Water' || rule.category === 'Water') current = totals.water;

            const isViolation = (rule.rule_type === 'max' && current > limit) || (rule.rule_type === 'min' && current < limit);
            if (isViolation) {
                violations.push({
                    name: rule.rule_name,
                    category: rule.category,
                    actual: Math.round(current),
                    limit: limit,
                    unit: rule.rule_unit,
                    rule_type: rule.rule_type
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
            fetchAllClientPending();
            showNotif(`Verified ${pendingIds.length} logs for ${date}`);
        } catch (err) {
            console.error("Batch verify failed", err);
            showNotif(err.response?.data?.message || "Failed to batch verify logs", "error");
        }
    };

    const handleClinicalSave = async () => {
        if (clinicalForm.date_of_birth && new Date(clinicalForm.date_of_birth) > new Date()) {
            showNotif("Date of birth cannot be in the future.", "error");
            return;
        }
        try {
            const res = await api.patch(`/nutritionist/clients/profile/${selectedProfile.id}`, clinicalForm);
            setSelectedProfile(res.data);
            setProfiles(prev => prev.map(p => p.id === res.data.id ? res.data : p));
            setIsClinicalEditing(false);
            showNotif("Clinical profile updated successfully!");
        } catch (err) {
            console.error("Failed to update clinical profile", err);
            showNotif(err.response?.data?.message || "Failed to update profile", "error");
        }
    };

    // Fetch global child data on profile mount/change (required by global biometric cards and Clinical Intelligence)
    useEffect(() => {
        if (selectedProfile) {
            fetchLogs(selectedProfile.id);
            fetchGrowthLogs(selectedProfile.id);
            fetchVaccinationData(selectedProfile.id);
        }
    }, [selectedProfile?.id]);

    // Fetch tab-specific data when the active tab changes
    useEffect(() => {
        if (!selectedProfile) return;
        if (activeTab === 'plan') {
            fetchMealPlan(selectedProfile.id);
        }
        if (activeTab === 'notes') {
            fetchNotes(selectedProfile.id);
        }
        if (activeTab === 'adime') {
            fetchAdimeNotes(selectedProfile.id);
        }
    }, [selectedProfile?.id, activeTab]);

    useEffect(() => {
        if (clientId) {
            fetchClientEmail();
        }
    }, [clientId]);

    const fetchClientEmail = async () => {
        try {
            const res = await api.get(`/nutritionist/clients/${clientId}`);
            setClientData(res.data);
            setClientEmail(res.data.email);
            if (res.data.full_name) {
                setFetchedClientName(res.data.full_name);
            }
        } catch (err) {
            console.error("Error fetching client details", err);
        }
    };

    const handleRestoreClient = async () => {
        try {
            startLoading('Restoring account...');
            await api.patch(`/nutritionist/clients/${clientId}/restore`);
            await fetchClientEmail();
            showNotif("Account restored successfully!");
        } catch (err) {
            console.error("Restore failed", err);
            showNotif(err.response?.data?.message || "Failed to restore account", "error");
        } finally {
            stopLoading();
        }
    };

    const handleUnlinkClient = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Unlink Caregiver',
            message: `Are you sure you want to unlink caregiver "${clientName || 'this caregiver'}"? This will immediately revoke your access to their profile and their children's data.`,
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    startLoading('Unlinking caregiver...');
                    const res = await api.delete(`/nutritionist/clients/${clientId}`);
                    if (res.data.success) {
                        showNotif(`Successfully unlinked caregiver "${clientName || 'caregiver'}".`);
                        navigate('/dashboard');
                    } else {
                        showNotif(res.data.message || "Failed to unlink client connection.", "error");
                    }
                } catch (err) {
                    console.error("Failed to unlink client connection:", err);
                    showNotif(err.response?.data?.message || "An error occurred while trying to unlink this connection.", "error");
                } finally {
                    stopLoading();
                }
            }
        });
    };

    const fetchGrowthLogs = async (profileId) => {
        try {
            const res = await api.get(`/profiles/${profileId}/growth`);
            setGrowthLogs(res.data);
        } catch (err) {
            console.error("Error fetching growth logs", err);
        }
    };

    const handleDeleteGrowthLog = async (logId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Growth Record',
            message: 'Are you sure you want to permanently delete this height/weight log entry? This will update the primary biometric profile for this child.',
            onConfirm: async () => {
                try {
                    await api.delete(`/profiles/growth-record/${logId}`);
                    setGrowthLogs(prev => prev.filter(l => l.id !== logId));
                    showNotif("Growth record deleted successfully.");
                    // Refresh profile to get updated height/weight if we deleted the latest
                    const res = await api.get(`/profiles/${selectedProfile.id}`);
                    setSelectedProfile(res.data);
                    setProfiles(prev => prev.map(p => p.id === res.data.id ? res.data : p));
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Delete growth log failed", err);
                    showNotif(err.response?.data?.message || "Failed to delete record", "error");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleUpdateGrowthLog = async (e) => {
        e.preventDefault();
        if (editGrowthForm.logged_at && new Date(editGrowthForm.logged_at) > new Date()) {
            showNotif("Growth log date cannot be in the future.", "error");
            return;
        }
        try {
            await api.patch(`/profiles/growth-record/${editingGrowthLog}`, editGrowthForm);
            fetchGrowthLogs(selectedProfile.id);
            // Refresh profile to get updated height/weight if we edited the latest
            const res = await api.get(`/profiles/${selectedProfile.id}`);
            setSelectedProfile(res.data);
            setProfiles(prev => prev.map(p => p.id === res.data.id ? res.data : p));
            setIsEditGrowthModalOpen(false);
            showNotif("Growth record updated successfully!");
        } catch (err) {
            console.error("Failed to update growth log", err);
            showNotif(err.response?.data?.message || "Failed to update record", "error");
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
        if (newVaccine.date && new Date(newVaccine.date) > new Date()) {
            showNotif("Vaccination date cannot be in the future.", "error");
            return;
        }
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
            showNotif(err.response?.data?.message || "Failed to add vaccine", "error");
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
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Error deleting vaccine", err);
                    showNotif(err.response?.data?.message || "Failed to delete vaccine", "error");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
            showNotif(err.response?.data?.message || "Failed to save data", "error");
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
            showNotif(err.response?.data?.message || "Failed to update ADIME record", "error");
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
                    showNotif(err.response?.data?.message || "Failed to delete ADIME record", "error");
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

        // Validation: Check if any field has meaningful content
        const hasContent = Object.values(newAdime).some(val => {
            if (!val) return false;
            const stripped = val.replace(/<[^>]*>/g, '').trim();
            return stripped.length > 0;
        });

        if (!hasContent) {
            showNotif("Please enter some clinical data before saving.", "error");
            return;
        }

        setSavingAdime(true);

        // Truly Optimistic: Create temp note and clear inputs immediately
        const tempId = `temp-${Date.now()}`;
        const tempNote = {
            id: tempId,
            ...newAdime,
            created_at: new Date().toISOString(),
            is_optimistic: true
        };

        setAdimeNotes(prev => [tempNote, ...prev]);
        const backupData = { ...newAdime };

        setNewAdime({
            assessment: '',
            diagnosis: '',
            intervention: '',
            monitoring: '',
            evaluation: ''
        });
        clearDraft('adime');

        try {
            const res = await api.post('/nutritionist/adime-notes', {
                profile_id: selectedProfile.id,
                ...backupData
            });

            // Replace temporary note with real server response
            setAdimeNotes(prev => prev.map(n => n.id === tempId ? res.data : n));
            showNotif("Clinical note saved!");
            setSyncStatus({ type: 'idle', lastSaved: null });
        } catch (err) {
            console.error("Failed to add clinical note", err);
            showNotif(err.response?.data?.message || "Failed to save note", "error");
            // Rollback
            setAdimeNotes(prev => prev.filter(n => n.id !== tempId));
            setNewAdime(backupData);
            setSyncStatus({ type: 'error', lastSaved: null });
        } finally {
            setSavingAdime(false);
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
        const latestNote = adimeNotes[0];
        if (!latestNote) {
            showNotif("No clinical record found to generate report", "error");
            return;
        }

        const printWindow = window.open('', '_blank');
        const content = `
            <html>
                <head>
                    <title>SmartNutri-AI Clinical Report - ${selectedProfile.child_name}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                        .header { border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1e293b; }
                        .meta { margin-top: 10px; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                        .section { margin-bottom: 40px; }
                        .section-title { font-size: 14px; font-weight: 900; color: #4f46e5; text-transform: uppercase; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 15px; letter-spacing: 1px; }
                        .card { background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                        .clinical-content { font-size: 15px; line-height: 1.7; color: #334155; }
                        .clinical-content h3 { font-size: 16px; font-weight: 900; color: #1e293b; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                        .clinical-content p { margin-bottom: 12px; }
                        .footer { margin-top: 60px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 25px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; }
                        .legacy-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-top: 20px; }
                        .legacy-item { background: #fff; padding: 15px; border-radius: 10px; border: 1px dashed #cbd5e1; }
                        .legacy-label { font-size: 10px; font-weight: 900; color: #4f46e5; text-transform: uppercase; margin-bottom: 5px; display: block; letter-spacing: 0.5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">Clinical Nutrition Report</div>
                            <div class="meta">Patient: ${selectedProfile.child_name} | Age: ${getAgeSafe(selectedProfile.date_of_birth)} | ${selectedProfile.gender}</div>
                        </div>
                        <div class="meta" style="text-align: right;">Generated: ${new Date().toLocaleDateString()}</div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">Professional Clinical Documentation</div>
                        <div class="card clinical-content">
                            ${latestNote.assessment || '<em style="color: #94a3b8">No clinical assessment recorded.</em>'}
                            
                            ${(latestNote.diagnosis || latestNote.intervention || latestNote.monitoring || latestNote.evaluation) ? `
                                <div class="legacy-grid">
                                    ${latestNote.diagnosis ? `<div class="legacy-item"><span class="legacy-label">Diagnosis</span>${latestNote.diagnosis}</div>` : ''}
                                    ${latestNote.intervention ? `<div class="legacy-item"><span class="legacy-label">Intervention</span>${latestNote.intervention}</div>` : ''}
                                    ${latestNote.monitoring ? `<div class="legacy-item"><span class="legacy-label">Monitoring</span>${latestNote.monitoring}</div>` : ''}
                                    ${latestNote.evaluation ? `<div class="legacy-item"><span class="legacy-label">Evaluation</span>${latestNote.evaluation}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${clinicalPatterns.length > 0 ? `
                        <div class="section">
                            <div class="section-title">Clinical Risk Patterns & Insights</div>
                            <div class="card clinical-content">
                                ${clinicalPatterns.map(p => `<div style="margin-bottom: 15px;"><strong>• ${p.title}:</strong> ${p.desc}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="footer">
                        Official Clinical Documentation • SmartNutri-AI Platform v2.0 • HIPAA Compliant Data Sync
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const fetchLogs = async (profileId) => {
        setLogsLoading(true);
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
        } finally {
            setLogsLoading(false);
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
                    fetchAllClientPending();
                    showNotif("Meal log deleted");
                } catch (err) {
                    console.error("Failed to delete log", err);
                    showNotif(err.response?.data?.message || "Failed to delete log", "error");
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
                        fetchAllClientPending();
                        showNotif(`Cleared ${res.data.count} logs for ${date}`);
                    } else {
                        showNotif("No logs found on server for this date", "info");
                    }
                } catch (err) {
                    console.error("Failed to clear logs for day", err);
                    showNotif(err.response?.data?.message || "Failed to clear logs", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote || newNote.replace(/<[^>]*>/g, '').trim().length === 0) return;

        setSavingNote(true);

        // Optimistic UI: Create temporary note
        const tempNote = {
            id: Date.now(),
            content: newNote,
            created_at: new Date().toISOString(),
            nutritionist_id: user.id,
            client_id: selectedProfile.id,
            is_optimistic: true
        };

        setNotes(prev => [tempNote, ...prev]);
        const originalContent = newNote;
        setNewNote('');
        clearDraft('note');

        try {
            const res = await api.post('/notes', {
                nutritionist_id: user.id,
                client_id: selectedProfile.id,
                content: originalContent
            });

            // Replace optimistic note with real one
            setNotes(prev => prev.map(n => n.id === tempNote.id ? res.data : n));
            showNotif("Progress note added");
            setSyncStatus({ type: 'idle', lastSaved: null });
        } catch (err) {
            console.error("Failed to add note", err);
            showNotif(err.response?.data?.message || "Failed to save note", "error");
            // Rollback optimistic update
            setNotes(prev => prev.filter(n => n.id !== tempNote.id));
            setNewNote(originalContent);
            setSyncStatus({ type: 'error', lastSaved: null });
        } finally {
            setSavingNote(false);
        }
    };

    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!editNoteForm || editNoteForm.replace(/<[^>]*>/g, '').trim().length === 0) return;
        try {
            await api.patch(`/notes/${editingNoteId}`, { content: editNoteForm });
            setEditingNoteId(null);
            fetchNotes(selectedProfile.id);
            showNotif("Observation note updated");
        } catch (err) {
            console.error("Error updating note", err);
            showNotif(err.response?.data?.message || "Failed to update note", "error");
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
                    showNotif(err.response?.data?.message || "Failed to delete note", "error");
                }
            },
            isDestructive: true
        });
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
            showNotif(err.response?.data?.message || "Failed to add meal", "error");
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
                    showNotif(err.response?.data?.message || "Failed to delete meal", "error");
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
                    showNotif(err.response?.data?.message || "Failed to clear plan", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleApplyMealTemplate = async (templateId) => {
        if (!selectedProfile) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Apply Weekly Template',
            message: 'This will replace the meal schedule for the current 7-day week with the selected template. This action cannot be undone. Proceed?',
            onConfirm: async () => {
                try {
                    await api.post('/nutritionist/plan/apply-template', {
                        profileId: selectedProfile.id,
                        startDate: format(currentWeekStart, 'yyyy-MM-dd'),
                        templateId
                    });
                    showNotif("Weekly template applied successfully!");
                    fetchMealPlan(selectedProfile.id);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    console.error("Failed to apply template", err);
                    showNotif(err.response?.data?.message || "Failed to apply weekly template", "error");
                }
            }
        });
    };

    const handleEditMeal = (meal) => {
        setEditingMeal({
            id: meal.id,
            recipe_name: meal.recipe_name || '',
            calories: meal.calories || '',
            protein_g: meal.protein_g || '',
            carbs_g: meal.carbs_g || '',
            fats_g: meal.fats_g || '',
            meal_type: meal.meal_type || 'Breakfast'
        });
        setIsMealEditModalOpen(true);
    };

    const handleSaveEditedMeal = async () => {
        if (!editingMeal.recipe_name.trim()) {
            showNotif("Meal name is required", "error");
            return;
        }
        try {
            await api.patch(`/nutritionist/plan/meal/${editingMeal.id}`, {
                recipe_name: editingMeal.recipe_name,
                calories: editingMeal.calories === '' ? null : parseInt(editingMeal.calories),
                protein_g: editingMeal.protein_g === '' ? null : parseInt(editingMeal.protein_g),
                carbs_g: editingMeal.carbs_g === '' ? null : parseInt(editingMeal.carbs_g),
                fats_g: editingMeal.fats_g === '' ? null : parseInt(editingMeal.fats_g),
                meal_type: editingMeal.meal_type
            });
            showNotif("Meal updated successfully!");
            setIsMealEditModalOpen(false);
            if (selectedProfile) {
                fetchMealPlan(selectedProfile.id);
            }
        } catch (err) {
            console.error("Failed to update meal", err);
            showNotif(err.response?.data?.message || "Failed to update meal", "error");
        }
    };

    const handleSaveWeekAsTemplate = async () => {
        if (!newTemplateForm.name.trim()) {
            showNotif("Template name is required", "error");
            return;
        }

        const days = {
            "Monday": [],
            "Tuesday": [],
            "Wednesday": [],
            "Thursday": [],
            "Friday": [],
            "Saturday": [],
            "Sunday": []
        };
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        mealPlan.forEach(meal => {
            const dateObj = parseISO(meal.date);
            const matchedDayIndex = weekDays.findIndex(day => isSameDay(day, dateObj));
            if (matchedDayIndex !== -1) {
                const dayName = dayNames[matchedDayIndex];
                days[dayName].push({
                    meal_type: meal.meal_type,
                    recipe_name: meal.recipe_name,
                    calories: meal.calories ? parseInt(meal.calories) : null,
                    protein_g: meal.protein_g ? parseInt(meal.protein_g) : null,
                    carbs_g: meal.carbs_g ? parseInt(meal.carbs_g) : null,
                    fats_g: meal.fats_g ? parseInt(meal.fats_g) : null
                });
            }
        });

        try {
            await api.post('/nutritionist/plan/meal-templates', {
                name: newTemplateForm.name,
                description: newTemplateForm.description,
                target_age: newTemplateForm.target_age,
                days
            });
            showNotif("Current week saved as template!");
            setIsSaveTemplateModalOpen(false);
            setNewTemplateForm({ name: '', description: '', target_age: '' });
            fetchMealTemplates();
        } catch (err) {
            console.error("Failed to save template", err);
            showNotif(err.response?.data?.message || "Failed to save template", "error");
        }
    };

    const handleOpenTemplateEditor = (template) => {
        setEditingTemplate(JSON.parse(JSON.stringify(template))); // deep clone
        setIsTemplateEditorOpen(true);
    };

    const handleSaveEditedTemplate = async () => {
        if (!editingTemplate.name.trim()) {
            showNotif("Template name is required", "error");
            return;
        }
        try {
            await api.patch(`/nutritionist/plan/meal-templates/${editingTemplate.id}`, {
                name: editingTemplate.name,
                description: editingTemplate.description,
                target_age: editingTemplate.target_age,
                days: editingTemplate.days
            });
            showNotif("Template updated successfully!");
            setIsTemplateEditorOpen(false);
            fetchMealTemplates();
        } catch (err) {
            console.error("Failed to update template", err);
            showNotif(err.response?.data?.message || "Failed to update template", "error");
        }
    };

    const handleDeleteMealTemplate = async (templateId, event) => {
        if (event) event.stopPropagation(); // prevent triggering template loading
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Template',
            message: 'Are you sure you want to delete this weekly meal plan template? This cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/nutritionist/plan/meal-templates/${templateId}`);
                    showNotif("Template deleted successfully!");
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    fetchMealTemplates();
                } catch (err) {
                    console.error("Failed to delete template", err);
                    showNotif(err.response?.data?.message || "Failed to delete template", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleGeneratePlan = async () => {
        if (!selectedProfile) return;

        const performGeneration = async () => {
            setGeneratingPlan(true);
            try {
                await api.post('/nutritionist/plan/generate', { profileId: selectedProfile.id });
                showNotif("New 7-day plan generated successfully!");
                fetchMealPlan(selectedProfile.id);
            } catch (err) {
                console.error("Failed to generate plan", err);
                showNotif(err.response?.data?.message || "Failed to generate plan. Please try again.", "error");
            } finally {
                setGeneratingPlan(false);
            }
        };

        if (mealPlan.length > 0) {
            setConfirmDialog({
                isOpen: true,
                title: 'Overwrite Existing Plan?',
                message: 'This patient already has a recorded 7-day meal schedule. Generating a new one will permanently replace all current entries. Do you want to proceed?',
                onConfirm: () => {
                    performGeneration();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                },
                isDestructive: true
            });
        } else {
            performGeneration();
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
        const loadInitialClientData = async () => {
            if (clientId) {
                await fetchProfiles();
                // Wait for profiles to be set, then others will trigger? 
                // Actually fetchProfiles sets selectedProfile which triggers other effects.
                // But for the initial sync to be clean, we should wait for everything.
                setIsInitialSync(false);
            }
        };
        loadInitialClientData();
    }, [clientId]);

    useEffect(() => {
        if (selectedProfile) {
            fetchRules(selectedProfile.id);
            fetchStandards(selectedProfile.id);
        }
    }, [selectedProfile]);

    // Persist active child profile in sessionStorage to prevent resetting selection on page refresh
    useEffect(() => {
        if (selectedProfile?.id) {
            sessionStorage.setItem(`selected_profile_${clientId}`, selectedProfile.id);
        }
    }, [selectedProfile?.id, clientId]);

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
            const data = res.data;
            setProfiles(data);

            if (data.length > 0) {
                setSelectedProfile(prev => {
                    // Maintain current selection if it still exists in the refreshed list
                    // Fall back to saved selection in sessionStorage if refreshing
                    const currentId = prev?.id || sessionStorage.getItem(`selected_profile_${clientId}`);
                    const matched = data.find(p => p.id === currentId);
                    return matched || data[0];
                });
            }
        } catch (err) {
            console.error("Failed to fetch profiles", err);
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



    const handleAddRule = async (e) => {
        e.preventDefault();

        // --- Frontend Validation ---
        if (!newRule.rule_name || newRule.rule_name.trim().length === 0) {
            showNotif("Rule name is required.", "error");
            return;
        }
        if (!newRule.rule_value || isNaN(parseFloat(newRule.rule_value)) || parseFloat(newRule.rule_value) <= 0) {
            showNotif("Please enter a valid positive number for the rule value.", "error");
            return;
        }
        if (!['min', 'max', 'range'].includes(newRule.rule_type)) {
            showNotif("Invalid rule type selected.", "error");
            return;
        }

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
            showNotif(err.response?.data?.message || "Failed to add rule", "error");
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
                    showNotif(err.response?.data?.message || "Failed to delete rule", "error");
                }
            },
            isDestructive: true
        });
    };

    const handleUpdateRule = async (e) => {
        e.preventDefault();

        // --- Frontend Validation ---
        if (!editRuleForm.rule_name || editRuleForm.rule_name.trim().length === 0) {
            showNotif("Rule name is required.", "error");
            return;
        }
        if (!editRuleForm.rule_value || isNaN(parseFloat(editRuleForm.rule_value)) || parseFloat(editRuleForm.rule_value) <= 0) {
            showNotif("Please enter a valid positive number for the rule value.", "error");
            return;
        }
        if (!['min', 'max', 'range'].includes(editRuleForm.rule_type)) {
            showNotif("Invalid rule type selected.", "error");
            return;
        }

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
            showNotif(err.response?.data?.message || "Failed to update rule", "error");
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

    if (isInitialSync) return <ClientDetailsSkeleton />;

    if (!selectedProfile && !isInitialSync) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-page)] p-6">
            <Card className="max-w-md w-full border-2 border-dashed border-[var(--color-divider)] rounded-[2.5rem] p-12 text-center">
                <div className="h-20 w-20 bg-gray-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <User size={40} className="text-gray-300" />
                </div>
                <h2 className="text-xl font-black text-[var(--color-text-main)] uppercase tracking-tight mb-2">No Profiles Found</h2>
                <p className="text-sm text-[var(--color-text-muted)] font-medium mb-8">This client does not have any active patient profiles linked yet.</p>
                <Button
                    onClick={() => setIsAddProfileOpen(true)}
                    className="w-full bg-[var(--color-primary)] text-white rounded-2xl py-4 font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                    Create Patient Profile
                </Button>
            </Card>

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

    return (
        <div className="min-h-screen bg-[var(--color-bg-page)] pb-20 font-outfit relative">
            <style>{quillStyles}</style>

            {/* --- ARCHIVE BANNER --- */}
            {clientData?.deleted_at && (
                <div className="bg-zinc-900 dark:bg-zinc-950 text-white p-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left z-50 sticky top-0 animate-in slide-in-from-top duration-500 shadow-xl border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-800 rounded-xl">
                            <Clock size={20} className="text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clinical Archive Mode</p>
                            <p className="text-sm font-bold">This client was deactivated on {new Date(clientData.deleted_at).toLocaleDateString()}. Data is read-only.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-px bg-zinc-800 hidden sm:block" />
                        <div className="text-xs font-medium text-zinc-400">
                            Reason: <span className="text-white italic">"{clientData.deactivation_reason || 'Not specified'}"</span>
                        </div>
                        <Button
                            onClick={handleRestoreClient}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            <Zap size={14} className="mr-2" />
                            Restore Account
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-500">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
                            <ArrowLeft size={24} />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                            className="hidden lg:flex p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-all"
                            title={isSidebarMinimized ? "Show Family Roster" : "Hide Family Roster"}
                        >
                            {isSidebarMinimized ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </Button>
                        <div>
                            <h1 className={cn("text-xl sm:text-2xl md:text-3xl font-black text-[var(--color-text-main)]", user?.privacy_mode && "privacy-blur")}>{clientName}</h1>
                            <p className="text-xs sm:text-base text-[var(--color-text-muted)]">Manage Family Profiles & Rules</p>
                        </div>
                    </div>
                    {!isLoading && (
                        <button
                            onClick={handleUnlinkClient}
                            className="hidden sm:flex h-10 px-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 border border-red-500/20 hover:border-red-500/50 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] items-center justify-center gap-2 transition-all shadow-sm shrink-0 w-fit self-start sm:self-auto"
                            title="Unlink Caregiver"
                        >
                            <Trash2 size={13} />
                            Unlink Caregiver
                        </button>
                    )}
                </header>

                {profiles.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                            This client hasn't added any child profiles yet.
                        </CardContent>
                    </Card>
                ) : (
                    <div className={cn("flex flex-col lg:flex-row items-start w-full max-w-full transition-all duration-300", isSidebarMinimized ? "lg:gap-4" : "gap-4 lg:gap-8")}>
                        {/* Left Sidebar: Profiles (Command Center) */}
                        <div className={cn("transition-all duration-300 ease-in-out shrink-0 w-full max-w-full lg:relative lg:z-10", isSidebarMinimized ? "lg:w-[60px]" : "lg:w-72")}>
                            <div className="sticky top-[72px] lg:top-8 z-10 bg-[var(--color-bg-page)]/95 backdrop-blur-xl -mx-4 px-4 py-2 lg:mx-0 lg:px-0 lg:py-0 lg:static lg:bg-transparent transition-all border-b lg:border-none border-[var(--color-divider)]">
                                <div className={cn("flex items-center justify-between", isSidebarMinimized ? "mb-0" : "mb-4")}>
                                    <h3 className={cn("font-black text-[var(--color-secondary)] uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 transition-opacity duration-200", isSidebarMinimized ? "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:m-0" : "opacity-100 w-auto")}>
                                        <Users size={14} className="text-[var(--color-primary)] shrink-0" />
                                        <span>Family Profiles</span>
                                    </h3>
                                    <button
                                        onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                                        className={cn("hidden lg:flex p-1.5 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-lg transition-colors shrink-0", isSidebarMinimized && "lg:hidden")}
                                        title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
                                    >
                                        {isSidebarMinimized ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                    </button>
                                </div>
                                <div className="flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide snap-x">
                                    {profiles.map(profile => {
                                        const pendingCount = allClientPendingLogs.filter(l => l.profile_id === profile.id).length;
                                        const isSelected = selectedProfile?.id === profile.id;
                                        return (
                                            <div
                                                key={profile.id}
                                                onClick={() => { setSelectedProfile(profile); setActiveTab('overview'); }}
                                                onMouseEnter={() => setHoveredProfileId(profile.id)}
                                                onMouseLeave={() => setHoveredProfileId(null)}
                                                className={cn(
                                                    "h-[52px] rounded-2xl cursor-pointer transition-all border-2 relative shrink-0 snap-start flex items-center",
                                                    isSelected
                                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-emerald-500/20'
                                                        : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] hover:border-[var(--color-primary)]/50',
                                                    "w-[52px] sm:w-[200px] justify-center sm:justify-start px-0 sm:px-3 gap-0 sm:gap-2.5",
                                                    isSidebarMinimized ? "lg:w-[52px] lg:px-0 lg:justify-center lg:gap-0" : "lg:w-full"
                                                )}
                                            >
                                                {pendingCount > 0 && (
                                                    <div className="absolute -top-1 -right-1 flex h-4 w-4 z-10">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                                        <span className={cn(
                                                            "relative inline-flex rounded-full h-4 w-4 border-2 text-[7px] font-black items-center justify-center",
                                                            isSelected ? "bg-white text-orange-500 border-[var(--color-primary)]" : "bg-orange-500 text-white border-white dark:border-zinc-900"
                                                        )}>
                                                            {pendingCount}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="relative shrink-0">
                                                    <div className={cn(
                                                        "h-9 w-9 rounded-full overflow-hidden flex-shrink-0 border-2 transition-all duration-300",
                                                        isSelected
                                                            ? 'border-transparent ring-2 ring-white/80 dark:ring-emerald-400/80 ring-offset-1 ring-offset-[var(--color-primary)] dark:ring-offset-slate-900 scale-105 shadow-md bg-white/20'
                                                            : 'border-[var(--color-divider)] bg-white/10'
                                                    )}>
                                                        {profile.profile_image_url ? (
                                                            <img src={profile.profile_image_url} alt={profile.child_name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center">
                                                                <User size={18} className={isSelected ? 'text-white' : 'text-[var(--color-text-main)]'} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Active Living Pulse Ring Indicator */}
                                                    {isSelected && (
                                                        <div className="absolute inset-0 rounded-full ring-[3px] ring-white/30 dark:ring-emerald-400/30 animate-pulse pointer-events-none -m-0.5" />
                                                    )}
                                                </div>
                                                <AnimatePresence initial={false}>
                                                    {!isSidebarMinimized && (
                                                        <motion.div
                                                            initial={{ opacity: 0, width: 0, x: -10 }}
                                                            animate={{ opacity: 1, width: 'auto', x: 0 }}
                                                            exit={{ opacity: 0, width: 0, x: -10 }}
                                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                            className="min-w-0 flex-1 flex-col justify-center hidden sm:flex overflow-hidden"
                                                        >
                                                            <div className={cn("font-black truncate uppercase text-xs sm:text-sm tracking-tight leading-none mb-0.5", isSelected ? 'text-white' : 'text-[var(--color-text-main)]')}>
                                                                {profile.child_name}
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div className={cn("text-[8px] font-bold uppercase tracking-wider whitespace-nowrap", isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]')}>
                                                                    {getAgeSafe(profile.date_of_birth)} • {profile.gender.charAt(0)}
                                                                </div>
                                                                <div className={cn("text-[8px] font-black whitespace-nowrap", isSelected ? 'text-white/90' : 'text-[var(--color-primary)]')}>
                                                                    {profile.weight_kg || '--'}KG
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Premium Glassmorphic Hover Tooltip */}
                                                <AnimatePresence>
                                                    {isSidebarMinimized && hoveredProfileId === profile.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                                            className="absolute left-[64px] top-1/2 -translate-y-1/2 hidden lg:flex flex-col min-w-[140px] p-3 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl z-50 text-left pointer-events-none"
                                                        >
                                                            {/* Glow Effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/5 to-transparent rounded-2xl pointer-events-none" />

                                                            {/* Caret Arrow */}
                                                            <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white/90 dark:bg-slate-900/90 border-l border-b border-white/40 dark:border-white/10 rotate-45" />

                                                            {/* Detailed Pediatric Metadata */}
                                                            <div className="relative z-10 space-y-1">
                                                                <p className="font-black text-xs uppercase tracking-tight text-[var(--color-text-main)] truncate leading-none">
                                                                    {profile.child_name}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest leading-none pt-0.5">
                                                                    <span>{getAgeSafe(profile.date_of_birth)}</span>
                                                                    <span>•</span>
                                                                    <span className="text-[var(--color-primary)]">{profile.weight_kg || '--'} kg</span>
                                                                </div>
                                                                {pendingCount > 0 && (
                                                                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded-md text-[8px] font-black uppercase tracking-wider leading-none">
                                                                        ⚠️ {pendingCount} Pending
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => setIsAddProfileOpen(true)}
                                        className={cn(
                                            "shrink-0 h-[52px] rounded-2xl border-2 border-dashed border-[var(--color-divider)] bg-[var(--color-bg-card)]/50 hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)] transition-all group flex items-center justify-center snap-start",
                                            "w-[52px] sm:w-[200px] gap-0 sm:gap-3",
                                            isSidebarMinimized ? "lg:w-[52px] lg:px-0 lg:gap-0" : "lg:w-full"
                                        )}
                                        title={isSidebarMinimized ? "Add New Profile" : undefined}
                                    >
                                        <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform shrink-0">
                                            <Plus size={16} strokeWidth={3} />
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {!isSidebarMinimized && (
                                                <motion.span
                                                    initial={{ opacity: 0, width: 0, x: -10 }}
                                                    animate={{ opacity: 1, width: 'auto', x: 0 }}
                                                    exit={{ opacity: 0, width: 0, x: -10 }}
                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] hidden sm:block overflow-hidden whitespace-nowrap"
                                                >
                                                    Add New
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 w-full max-w-full space-y-6">
                            {selectedProfile && (
                                <Card className="w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="truncate">Profile: {selectedProfile.child_name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* --- Grouped Clinical Modules (Pillars) --- */}
                                        <div className="flex flex-col gap-3.5 mb-4">
                                            {/* Pillar Switcher */}
                                            <div className="bg-[var(--color-bg-page)] p-1.5 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-[var(--color-divider)] flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-1.5 sm:pb-1.5 shadow-inner whitespace-nowrap">
                                                {[
                                                    { id: 'assessment', label: 'Assessment', icon: Activity, tabs: ['overview', 'history', 'insights'] },
                                                    { id: 'clinical', label: 'Clinical Care', icon: ShieldAlert, tabs: ['adime', 'rules', 'notes'] },
                                                    { id: 'planning', label: 'Dietary Design', icon: ChefHat, tabs: ['portions', 'plan'] }
                                                ].map(group => {
                                                    const isGroupActive = group.tabs.includes(activeTab);
                                                    const GroupIcon = group.icon;

                                                    // Count pending logs in this group for the badge
                                                    let groupBadge = 0;
                                                    if (group.id === 'assessment') {
                                                        groupBadge = allClientPendingLogs.filter(l => l.profile_id === selectedProfile?.id).length;
                                                    }

                                                    return (
                                                        <button
                                                            key={group.id}
                                                            onClick={() => setTab(group.tabs[0])}
                                                            className={cn(
                                                                "flex-shrink-0 min-w-[110px] sm:min-w-0 sm:flex-grow sm:flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-[1.5rem] transition-all relative font-black uppercase tracking-tight sm:tracking-widest text-[9px] sm:text-[10px]",
                                                                isGroupActive
                                                                    ? "bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-xl border border-[var(--color-primary)]/10"
                                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                                                            )}
                                                        >
                                                            <GroupIcon size={14} className={isGroupActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"} />
                                                            <span className="hidden sm:inline">{group.label}</span>
                                                            <span className="sm:hidden">{group.label.split(' ')[0]}</span>

                                                            {groupBadge > 0 && (
                                                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[7px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-[var(--color-bg-page)] animate-pulse shadow-md">
                                                                    {groupBadge}
                                                                </span>
                                                            )}

                                                            {isGroupActive && (
                                                                <motion.div
                                                                    layoutId="pillar-bg"
                                                                    className="absolute inset-0 bg-[var(--color-primary)]/5 rounded-[1.5rem] z-[-1]"
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Sub-Navigation Pills */}
                                            <div className="flex items-center gap-2 px-1 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-1 whitespace-nowrap">
                                                {(() => {
                                                    const currentGroup = [
                                                        {
                                                            id: 'assessment', label: 'Assessment', tabs: [
                                                                { id: 'overview', label: 'Overview', icon: Eye },
                                                                { id: 'history', label: 'Log History', icon: Clock },
                                                                { id: 'insights', label: 'Insights', icon: TrendingUp }
                                                            ]
                                                        },
                                                        {
                                                            id: 'clinical', label: 'Clinical Care', tabs: [
                                                                { id: 'adime', label: 'ADIME', icon: Stethoscope },
                                                                { id: 'rules', label: 'Rules Engine', icon: ShieldAlert },
                                                                { id: 'notes', label: 'Notes', icon: StickyNote }
                                                            ]
                                                        },
                                                        {
                                                            id: 'planning', label: 'Dietary Design', tabs: [
                                                                { id: 'portions', label: 'Portion Exchange', icon: PieChart },
                                                                { id: 'plan', label: 'Meal Planner', icon: Calendar }
                                                            ]
                                                        }
                                                    ].find(g => g.tabs.some(t => t.id === activeTab));

                                                    return currentGroup?.tabs.map(tab => {
                                                        const isTabActive = activeTab === tab.id;
                                                        const TabIcon = tab.icon;
                                                        const isPending = tab.id === 'history' && allClientPendingLogs.filter(l => l.profile_id === selectedProfile?.id).length > 0;

                                                        return (
                                                            <button
                                                                key={tab.id}
                                                                onClick={() => setTab(tab.id)}
                                                                className={cn(
                                                                    "px-4 py-2 rounded-full border-2 transition-all flex items-center gap-2 whitespace-nowrap font-black uppercase text-[8px] sm:text-[9px] tracking-widest shadow-sm flex-shrink-0",
                                                                    isTabActive
                                                                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-emerald-500/20"
                                                                        : "bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-divider)] hover:border-[var(--color-primary)]/50"
                                                                )}
                                                            >
                                                                <TabIcon size={12} />
                                                                {tab.label}
                                                                {isPending && (
                                                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                                                                )}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        {/* TAB SLIDE CONTAINER */}
                                        <div className="relative overflow-hidden">
                                            <AnimatePresence mode="wait" custom={tabDirection}>
                                                <motion.div
                                                    key={activeTab}
                                                    custom={tabDirection}
                                                    initial={{ opacity: 0, x: tabDirection * 32 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: tabDirection * -32 }}
                                                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                >


                                                    {/* TAB 1: OVERVIEW */}
                                                    {activeTab === 'overview' && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="space-y-8"
                                                        >
                                                            {/* 1. BIOGRAPHICAL SUMMARY (Nutritionist's Quick Look) */}
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="sm:-mx-0 p-4 sm:p-6 glass mesh-emerald rounded-2xl sm:rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-2xl relative overflow-hidden"
                                                            >
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 sm:gap-0 relative z-10">
                                                                    <div className="flex items-center gap-3 sm:gap-5">
                                                                        <motion.div
                                                                            whileHover={{ scale: 1.05, rotate: 5 }}
                                                                            className="h-16 w-16 sm:h-24 sm:w-24 rounded-3xl overflow-hidden bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] border-4 border-white/50 dark:border-white/10 shadow-xl flex-shrink-0 backdrop-blur-xl"
                                                                        >
                                                                            {isLoading ? <SkeletonLoader /> : (
                                                                                selectedProfile?.profile_image_url ? (
                                                                                    <img src={selectedProfile.profile_image_url} alt={selectedProfile.child_name} className="h-full w-full object-cover" />
                                                                                ) : (
                                                                                    <User size={40} strokeWidth={2.5} className="text-[var(--color-primary)] sm:w-12 sm:h-12" />
                                                                                )
                                                                            )}
                                                                        </motion.div>
                                                                        <div className="min-w-0">
                                                                            {isLoading ? (
                                                                                <div className="space-y-2">
                                                                                    <SkeletonLoader className="h-8 w-48" />
                                                                                    <SkeletonLoader className="h-4 w-32" />
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <h2 className={cn("text-2xl sm:text-4xl font-black text-[var(--color-text-main)] uppercase tracking-tight leading-none truncate mb-1", user?.privacy_mode && "privacy-blur")}>{selectedProfile.child_name}</h2>
                                                                                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex-wrap">
                                                                                        <span className="px-3 py-1 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm">{selectedProfile.gender}</span>
                                                                                        <span className="px-3 py-1 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm whitespace-nowrap">{getAgeSafe(selectedProfile.date_of_birth)}</span>
                                                                                        {selectedProfile.waist_circumference && (
                                                                                            <span className="px-3 py-1 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm whitespace-nowrap">Waist: {selectedProfile.waist_circumference} cm</span>
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                                        {!isLoading && clinicalPatterns.some(a => a.severity === 'critical' || a.severity === 'high') && (
                                                                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full animate-pulse shadow-xl shadow-red-500/30">
                                                                                <AlertCircle size={16} />
                                                                                <span className="text-[11px] font-black uppercase tracking-widest">{clinicalPatterns.filter(a => a.severity === 'critical' || a.severity === 'high').length} Urgent Alerts</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="text-left sm:text-right p-4 sm:p-0 bg-white/30 dark:bg-slate-900/30 sm:bg-transparent rounded-2xl sm:rounded-none border border-white/20 dark:border-white/10 sm:border-none self-start sm:self-auto w-full sm:w-auto backdrop-blur-sm sm:backdrop-blur-none">
                                                                            <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Clinical Record DOB</div>
                                                                            <div className="text-sm font-black text-[var(--color-secondary)]">
                                                                                {isLoading ? <SkeletonLoader className="h-5 w-32 ml-auto" /> : formatDateSafe(selectedProfile.date_of_birth, { dateStyle: 'long' })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 relative z-10">
                                                                    {/* Weight Card */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                                        className="p-3 sm:p-4 glass bg-white/40 dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 relative overflow-hidden group shadow-lg backdrop-blur-md"
                                                                    >
                                                                        <div className="flex justify-between items-start mb-1 relative z-10">
                                                                            <div className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Weight</div>
                                                                            {!isLoading && parseFloat(growthDeltas.weight) !== 0 && (() => {
                                                                                const isImperial = user?.measurement_system === 'imperial';
                                                                                const rawVal = parseFloat(growthDeltas.weight);
                                                                                const convertedVal = isImperial ? (rawVal * 2.20462).toFixed(1) : rawVal.toFixed(1);
                                                                                const unitStr = isImperial ? 'lbs' : 'kg';
                                                                                return (
                                                                                    <div className={`text-[8px] sm:text-[9px] font-black flex items-center ${rawVal > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                                        {rawVal > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                                                                        {rawVal > 0 ? '+' : ''}{convertedVal} {unitStr}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex items-end justify-between relative z-10">
                                                                            <div className="text-lg sm:text-xl font-black text-[var(--color-primary)]">
                                                                                {isLoading ? (
                                                                                    <SkeletonLoader className="h-7 w-16" />
                                                                                ) : (() => {
                                                                                    const wConv = convertWeight(selectedProfile.weight_kg, user?.measurement_system);
                                                                                    return <>{wConv.value} <span className="text-[10px] sm:text-xs font-bold opacity-60">{wConv.unit}</span></>;
                                                                                })()}
                                                                            </div>
                                                                            {!isLoading && growthLogs.length > 1 && (
                                                                                <div className="w-12 sm:w-20 opacity-60">
                                                                                    <Sparkline
                                                                                        data={[...growthLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).slice(-10)}
                                                                                        color="#10b981"
                                                                                        dataKey="weight_kg"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {!isLoading && growthLogs.length > 1 && (
                                                                            <div className="mt-2 text-[7px] sm:text-[9px] font-bold text-[var(--color-text-muted)] border-t border-white/20 pt-2 relative z-10">
                                                                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Activity size={8} className="text-emerald-500" />
                                                                                        {(() => {
                                                                                            const isImperial = user?.measurement_system === 'imperial';
                                                                                            const velVal = parseFloat(growthDeltas.weightVel);
                                                                                            const convertedVel = isImperial ? (velVal * 2.20462).toFixed(2) : velVal.toFixed(2);
                                                                                            const unitStr = isImperial ? 'lbs/m' : 'kg/m';
                                                                                            return <span>Velocity: <span className="text-[var(--color-text-main)]">{convertedVel} {unitStr}</span></span>;
                                                                                        })()}
                                                                                    </div>
                                                                                </div>
                                                                                {growthLogs[growthLogs.length - 1]?.clinical_analysis?.weight && (
                                                                                    <span className={cn(
                                                                                        "px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-tighter",
                                                                                        growthLogs[growthLogs.length - 1].clinical_analysis.weight.zScore < -2 ? "bg-red-500 text-white" : "bg-emerald-500/10 text-emerald-600"
                                                                                    )}>
                                                                                        P{growthLogs[growthLogs.length - 1].clinical_analysis.weight.percentile} Percentile
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
 
                                                                    {/* Height Card */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                                        className="p-3 sm:p-4 glass bg-white/40 dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 relative overflow-hidden group shadow-lg backdrop-blur-md"
                                                                    >
                                                                        <div className="flex justify-between items-start mb-1 relative z-10">
                                                                            <div className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Height</div>
                                                                            {!isLoading && parseFloat(growthDeltas.height) !== 0 && (() => {
                                                                                const isImperial = user?.measurement_system === 'imperial';
                                                                                const rawVal = parseFloat(growthDeltas.height);
                                                                                const convertedVal = isImperial ? (rawVal / 2.54).toFixed(1) : rawVal.toFixed(1);
                                                                                const unitStr = isImperial ? 'in' : 'cm';
                                                                                return (
                                                                                    <div className={`text-[8px] sm:text-[9px] font-black flex items-center ${rawVal > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                                        {rawVal > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                                                                        {rawVal > 0 ? '+' : ''}{convertedVal} {unitStr}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex items-end justify-between relative z-10">
                                                                            <div className="flex flex-col">
                                                                                <div className="text-lg sm:text-xl font-black text-[var(--color-secondary)]">
                                                                                    {isLoading ? (
                                                                                        <SkeletonLoader className="h-7 w-16" />
                                                                                    ) : user?.measurement_system === 'imperial' ? (
                                                                                        <>{Math.floor(selectedProfile.height_cm / 30.48)}' {Math.round((selectedProfile.height_cm % 30.48) / 2.54)}" <span className="text-[10px] sm:text-xs font-bold opacity-60">ft/in</span></>
                                                                                    ) : (
                                                                                        <>{selectedProfile.height_cm} <span className="text-[10px] sm:text-xs font-bold opacity-60">cm</span></>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-[7px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mt-0.5 whitespace-nowrap">
                                                                                    {isLoading ? (
                                                                                        <SkeletonLoader className="h-3 w-12" />
                                                                                    ) : user?.measurement_system === 'imperial' ? (
                                                                                        <>{selectedProfile.height_cm} cm Metric</>
                                                                                    ) : (
                                                                                        <>{Math.floor(selectedProfile.height_cm / 30.48)}' {Math.round((selectedProfile.height_cm % 30.48) / 2.54)}" Imp</>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {!isLoading && growthLogs.length > 1 && (
                                                                                <div className="w-12 sm:w-20 opacity-60">
                                                                                    <Sparkline
                                                                                        data={[...growthLogs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).slice(-10)}
                                                                                        color="#3b82f6"
                                                                                        dataKey="height_cm"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {!isLoading && growthLogs.length > 1 && (
                                                                            <div className="mt-2 text-[7px] sm:text-[9px] font-bold text-[var(--color-text-muted)] border-t border-white/20 pt-2 relative z-10">
                                                                                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Activity size={8} className="text-blue-500" />
                                                                                        {(() => {
                                                                                            const isImperial = user?.measurement_system === 'imperial';
                                                                                            const velVal = parseFloat(growthDeltas.heightVel);
                                                                                            const convertedVel = isImperial ? (velVal / 2.54).toFixed(2) : velVal.toFixed(2);
                                                                                            const unitStr = isImperial ? 'in/m' : 'cm/m';
                                                                                            return <span>Velocity: <span className="text-[var(--color-text-main)]">{convertedVel} {unitStr}</span></span>;
                                                                                        })()}
                                                                                    </div>
                                                                                </div>
                                                                                {growthLogs[growthLogs.length - 1]?.clinical_analysis?.height && (
                                                                                    <span className={cn(
                                                                                        "px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-tighter",
                                                                                        growthLogs[growthLogs.length - 1].clinical_analysis.height.zScore < -2 ? "bg-red-500 text-white" : "bg-blue-500/10 text-blue-600"
                                                                                    )}>
                                                                                        P{growthLogs[growthLogs.length - 1].clinical_analysis.height.percentile} Percentile
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>

                                                                    {/* BMI Card */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                                        className="p-3 sm:p-4 glass bg-white/40 dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 flex flex-col justify-between shadow-lg backdrop-blur-md"
                                                                    >
                                                                        <div className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">BMI Status</div>
                                                                        {bmiData ? (
                                                                            <div className="space-y-1.5">
                                                                                <div className="text-lg sm:text-xl font-black text-[var(--color-text-main)]">{isLoading ? <SkeletonLoader className="h-7 w-12" /> : bmiData.bmi}</div>
                                                                                <div className={cn(
                                                                                    "inline-flex items-center px-2 py-0.5 rounded-lg border backdrop-blur-md text-[7px] sm:text-[9px] font-black uppercase tracking-tight",
                                                                                    isLoading ? "skeleton h-4 w-16" : `${bmiData.borderColor} ${bmiData.bgColor} ${bmiData.color}`
                                                                                )}>
                                                                                    {bmiData.status}
                                                                                </div>
                                                                            </div>
                                                                        ) : <div className="text-[10px] font-black text-[var(--color-text-muted)] italic">No data</div>}
                                                                    </motion.div>

                                                                    {/* Activity Card */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                                        className="p-3 sm:p-4 glass bg-white/40 dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 shadow-lg backdrop-blur-md"
                                                                    >
                                                                        <div className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Activity Level</div>
                                                                        <div className="text-xs sm:text-sm font-black text-[var(--color-text-main)] capitalize mt-2 truncate">
                                                                            {isLoading ? <SkeletonLoader className="h-5 w-20" /> : (selectedProfile.activity_level?.replace(/_/g, ' ') || 'N/A')}
                                                                        </div>
                                                                    </motion.div>

                                                                    {/* Allergies Card */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                                        className="col-span-1 sm:col-span-2 lg:col-span-1 p-3 sm:p-4 glass bg-white/40 dark:bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 shadow-lg backdrop-blur-md"
                                                                    >
                                                                        <div className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Primary Allergies</div>
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {isLoading ? (
                                                                                <SkeletonLoader className="h-5 w-24" />
                                                                            ) : (
                                                                                (selectedProfile.allergies?.filter(Boolean) || []).length > 0 ? (
                                                                                    selectedProfile.allergies.filter(Boolean).map((allergy, idx) => (
                                                                                        <span key={`${allergy}-${idx}`} className="px-2 py-1 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap backdrop-blur-md shadow-sm">
                                                                                            {allergy}
                                                                                        </span>
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="text-[10px] font-black text-emerald-500 italic">None Reported</span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                </div>
                                                            </motion.div>

                                                            {/* Clinical Intelligence Dashboard */}
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                className="mt-6 pt-6 border-t border-[var(--color-divider)]"
                                                            >
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <Activity size={14} className="text-[var(--color-primary)]" />
                                                                    <h3 className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-widest">Clinical Intelligence</h3>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                    {clinicalPatterns.map((alert, idx) => (
                                                                        <motion.div
                                                                            key={idx}
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            transition={{ delay: idx * 0.1 }}
                                                                            className={cn(
                                                                                "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                                                                                alert.severity === 'critical' ? "bg-red-50/30 dark:bg-red-900/5 border-red-100 dark:border-red-900/10" :
                                                                                    alert.severity === 'high' ? "bg-orange-50/30 dark:bg-orange-900/5 border-orange-100 dark:border-orange-900/10" :
                                                                                        alert.severity === 'med' ? "bg-amber-50/30 dark:bg-amber-900/5 border-amber-100 dark:border-amber-900/10" :
                                                                                            "bg-emerald-50/30 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/10"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <alert.icon size={14} className={cn(
                                                                                    alert.severity === 'critical' ? "text-red-500" :
                                                                                        alert.severity === 'high' ? "text-orange-600" :
                                                                                            alert.severity === 'med' ? "text-amber-500" :
                                                                                                "text-emerald-500"
                                                                                )} />
                                                                                <span className={cn(
                                                                                    "text-[8px] font-black uppercase tracking-tighter",
                                                                                    alert.severity === 'critical' ? "text-red-600" :
                                                                                        alert.severity === 'high' ? "text-orange-600" :
                                                                                            alert.severity === 'med' ? "text-amber-600" :
                                                                                                "text-emerald-600"
                                                                                )}>
                                                                                    {alert.severity}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[10px] font-black uppercase tracking-tight text-[var(--color-text-main)] mb-0.5">
                                                                                    {alert.title}
                                                                                </div>

                                                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] leading-tight">
                                                                                    {alert.desc}
                                                                                </p>
                                                                            </div>
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>

                                                            {/* 2. CLINICAL & MEDICAL RECORDS */}
                                                            <div className="space-y-6">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[var(--color-divider)] pb-4 gap-4 sm:gap-0">
                                                                    <div>
                                                                        <h3 className="font-black text-lg md:text-xl text-[var(--color-secondary)] uppercase tracking-tight">Clinical & Medical Records</h3>
                                                                        <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold uppercase">Comprehensive medical history and current status</p>
                                                                    </div>
                                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                                        {isClinicalEditing && (
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                onClick={() => {
                                                                                    setIsClinicalEditing(false);
                                                                                    if (selectedProfile) {
                                                                                        setClinicalForm({
                                                                                            child_name: selectedProfile.child_name || '',
                                                                                            gender: selectedProfile.gender || '',
                                                                                            date_of_birth: selectedProfile.date_of_birth?.split('T')[0] || '',
                                                                                            activity_level: selectedProfile.activity_level || '',
                                                                                            height_cm: selectedProfile.height_cm || '',
                                                                                            weight_kg: selectedProfile.weight_kg || '',
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
                                                                                }}
                                                                                className="flex-1 sm:flex-none text-xs font-black uppercase"
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            variant={isClinicalEditing ? "primary" : "outline"}
                                                                            onClick={() => isClinicalEditing ? handleClinicalSave() : setIsClinicalEditing(true)}
                                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                                                                        >
                                                                            {isClinicalEditing ? <Save size={16} /> : <Edit2 size={16} />}
                                                                            <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{isClinicalEditing ? "Save" : "Edit"}</span>
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Edit Form for Bio Info if in edit mode */}
                                                                {isClinicalEditing && (
                                                                    <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-3xl border-2 border-blue-100 dark:border-blue-500/20 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300">
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
                                                                                max={new Date().toISOString().split('T')[0]}
                                                                                value={clinicalForm.date_of_birth}
                                                                                onChange={(e) => setClinicalForm({ ...clinicalForm, date_of_birth: e.target.value })}
                                                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest ml-1">Waist (cm)</label>
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                value={clinicalForm.waist_circumference}
                                                                                onChange={(e) => setClinicalForm({ ...clinicalForm, waist_circumference: e.target.value })}
                                                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                                                placeholder="Optional"
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
                                                                                    <div className="relative">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setIsAllergyDropdownOpen(!isAllergyDropdownOpen)}
                                                                                            className={cn(
                                                                                                "w-full h-11 px-4 flex items-center justify-between rounded-xl border-2 transition-all cursor-pointer bg-[var(--color-bg-page)]",
                                                                                                isAllergyDropdownOpen ? "border-red-400 ring-4 ring-red-400/10" : "border-[var(--color-divider)]"
                                                                                            )}
                                                                                        >
                                                                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate">
                                                                                                <Plus size={14} className="inline mr-2" /> <span className="truncate">Add Allergy...</span>
                                                                                            </span>
                                                                                            <ChevronDown size={14} className={cn("transition-transform duration-200 text-[var(--color-text-muted)] flex-shrink-0", isAllergyDropdownOpen && "rotate-180")} />
                                                                                        </button>

                                                                                        {isAllergyDropdownOpen && (
                                                                                            <>
                                                                                                <div
                                                                                                    className="fixed inset-0 z-40"
                                                                                                    onClick={() => setIsAllergyDropdownOpen(false)}
                                                                                                />
                                                                                                <motion.div
                                                                                                    initial={{ opacity: 0, y: -10 }}
                                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                                    className="absolute top-full left-0 w-full mt-2 p-2 bg-white dark:bg-slate-900 border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-thin"
                                                                                                >
                                                                                                    {ALLERGY_OPTIONS.map(option => {
                                                                                                        const current = clinicalForm.allergies || [];
                                                                                                        const isSelected = current.includes(option);
                                                                                                        if (isSelected) return null;

                                                                                                        return (
                                                                                                            <button
                                                                                                                key={option}
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    if (option === 'None') {
                                                                                                                        setClinicalForm({ ...clinicalForm, allergies: ['None'] });
                                                                                                                    } else {
                                                                                                                        let newAllergies = current.filter(a => a !== 'None');
                                                                                                                        newAllergies.push(option);
                                                                                                                        setClinicalForm({ ...clinicalForm, allergies: newAllergies });
                                                                                                                    }
                                                                                                                    setIsAllergyDropdownOpen(false);
                                                                                                                }}
                                                                                                                className="w-full text-left p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] transition-colors border-l-4 border-transparent hover:border-red-400"
                                                                                                            >
                                                                                                                {option}
                                                                                                            </button>
                                                                                                        );
                                                                                                    })}
                                                                                                    {ALLERGY_OPTIONS.every(o => (clinicalForm.allergies || []).includes(o)) && (
                                                                                                        <div className="p-4 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase italic">
                                                                                                            All allergies selected
                                                                                                        </div>
                                                                                                    )}
                                                                                                </motion.div>
                                                                                            </>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {((clinicalForm.allergies || []).filter(Boolean).length === 0 || ((clinicalForm.allergies || []).filter(Boolean).length === 1 && (clinicalForm.allergies || []).filter(Boolean)[0] === "None")) ? (
                                                                                            <div className="px-3 py-1.5 rounded-lg border-2 border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20 text-green-600 text-[9px] font-black uppercase tracking-widest">None</div>
                                                                                        ) : (
                                                                                            (clinicalForm.allergies || []).filter(Boolean).map((allergy, idx) => (
                                                                                                <div
                                                                                                    key={`${allergy}-${idx}`}
                                                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.1em] transition-all animate-in zoom-in-95 duration-200 ${allergy === 'None'
                                                                                                        ? 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-100 dark:border-green-900/30'
                                                                                                        : 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/30'
                                                                                                        }`}
                                                                                                >
                                                                                                    {allergy}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            const current = clinicalForm.allergies || [];
                                                                                                            const updated = current.filter(a => a !== allergy);
                                                                                                            setClinicalForm({ ...clinicalForm, allergies: updated });
                                                                                                        }}
                                                                                                        className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                                                                                                    >
                                                                                                        <X size={10} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))
                                                                                        )}
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
                                                                                        {((selectedProfile.allergies || []).filter(Boolean).length === 0 || ((selectedProfile.allergies || []).filter(Boolean).length === 1 && (selectedProfile.allergies || []).filter(Boolean)[0] === "None")) ? (
                                                                                            <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-black uppercase border border-green-100 dark:border-green-900/30">None</span>
                                                                                        ) : (
                                                                                            (selectedProfile.allergies || []).filter(Boolean).map((a, idx) => (
                                                                                                <span
                                                                                                    key={`${a}-${idx}`}
                                                                                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${a === 'None'
                                                                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/30'
                                                                                                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/30'
                                                                                                        }`}
                                                                                                >
                                                                                                    {a}
                                                                                                </span>
                                                                                            ))
                                                                                        )}
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
                                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/30 bg-white dark:bg-[var(--color-bg-card)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:border-emerald-500 transition-all"
                                                                                >
                                                                                    <option value="" className="bg-[var(--color-bg-card)]">Select vaccine...</option>
                                                                                    {vaccinationTypes.map(t => (
                                                                                        <option key={t.id} value={t.id} className="bg-[var(--color-bg-card)]">{t.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest ml-1">Date Administered</label>
                                                                                <input
                                                                                    type="date"
                                                                                    max={new Date().toISOString().split('T')[0]}
                                                                                    value={newVaccine.date}
                                                                                    onChange={(e) => setNewVaccine({ ...newVaccine, date: e.target.value })}
                                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/30 bg-white dark:bg-[var(--color-bg-card)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:border-emerald-500 transition-all"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest ml-1">Batch # / Notes</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={newVaccine.notes}
                                                                                    onChange={(e) => setNewVaccine({ ...newVaccine, notes: e.target.value })}
                                                                                    placeholder="e.g. Batch #7721-A"
                                                                                    className="w-full p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/30 bg-white dark:bg-[var(--color-bg-card)] text-sm font-bold text-[var(--color-text-main)] outline-none focus:border-emerald-500 transition-all"
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
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[var(--color-divider)] pb-4 gap-4 sm:gap-0">
                                                                    <div>
                                                                        <h3 className="font-black text-lg md:text-xl text-[var(--color-primary)] uppercase tracking-tight">Growth & Development Trends</h3>
                                                                        <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-bold uppercase">Longitudinal height and weight tracking</p>
                                                                    </div>
                                                                    <div className="w-full sm:w-auto">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="w-full sm:w-auto h-10 sm:h-8 text-xs sm:text-[10px] font-black border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white uppercase tracking-widest flex items-center justify-center"
                                                                            onClick={() => setIsGrowthModalOpen(true)}
                                                                        >
                                                                            <Plus size={14} className="mr-2" /> Log New Growth Data
                                                                        </Button>
                                                                    </div>
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
                                                                                    <ResponsiveContainer width="99%" height={250} minWidth={0} debounce={50}>
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
                                                                                    <ResponsiveContainer width="99%" height={250} minWidth={0} debounce={50}>
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

                                                            {/* GROWTH HISTORY LIST (DELETABLE) */}
                                                            <div className="bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] overflow-hidden mb-6">
                                                                <div className="px-6 py-4 border-b border-[var(--color-divider)] bg-[var(--color-bg-page)] flex justify-between items-center">
                                                                    <h4 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                                                                        <Calendar size={14} className="text-[var(--color-primary)]" /> Growth Record Timeline
                                                                    </h4>
                                                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase">{growthLogs.length} Entries</span>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left">
                                                                        <thead>
                                                                            <tr className="border-b border-[var(--color-divider)] bg-gray-50/50 dark:bg-white/5">
                                                                                <th className="px-6 py-3 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date Recorded</th>
                                                                                <th className="px-6 py-3 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Height (cm)</th>
                                                                                <th className="px-6 py-3 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Weight (kg)</th>
                                                                                <th className="px-6 py-3 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Status</th>
                                                                                <th className="px-6 py-3 text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-[var(--color-divider)]">
                                                                            {[...growthLogs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at)).map(log => (
                                                                                <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors group">
                                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                                        <span className="text-xs font-bold text-[var(--color-text-main)]">
                                                                                            {new Date(log.logged_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                                        <span className="text-xs font-black text-[var(--color-secondary)]">{log.height_cm} cm</span>
                                                                                    </td>
                                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                                        <span className="text-xs font-black text-[var(--color-primary)]">{log.weight_kg} kg</span>
                                                                                    </td>
                                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                                        {log.clinical_analysis && (
                                                                                            <div className="flex gap-1">
                                                                                                <span className={cn(
                                                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                                                                                    log.clinical_analysis.weight.status === 'Normal' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                                                )}>
                                                                                                    W: {log.clinical_analysis.weight.status}
                                                                                                </span>
                                                                                                <span className={cn(
                                                                                                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                                                                                    log.clinical_analysis.height.status === 'Normal' ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                                                                                                )}>
                                                                                                    H: {log.clinical_analysis.height.status}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => {
                                                                                                setEditingGrowthLog(log.id);
                                                                                                setEditGrowthForm({
                                                                                                    height_cm: log.height_cm,
                                                                                                    weight_kg: log.weight_kg,
                                                                                                    logged_at: new Date(log.logged_at).toISOString().split('T')[0]
                                                                                                });
                                                                                                setIsEditGrowthModalOpen(true);
                                                                                            }}
                                                                                            className="h-8 w-8 p-0 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-full transition-all"
                                                                                        >
                                                                                            <Edit2 size={14} />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => handleDeleteGrowthLog(log.id)}
                                                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                            {growthLogs.length === 0 && (
                                                                                <tr>
                                                                                    <td colSpan="5" className="px-6 py-12 text-center text-xs text-[var(--color-text-muted)] italic">
                                                                                        No growth history logs recorded yet.
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl border-2 border-green-100 dark:border-green-800/30">
                                                                <h4 className="font-black text-green-800 dark:text-green-300 uppercase tracking-widest text-xs mb-2">Clinical Insights Summary</h4>
                                                                <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
                                                                    Currently tracking <strong>{rules.length} active nutrition rules</strong> for this profile. All clinical parameters and growth metrics are up to date as of {new Date().toLocaleDateString()}.
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* TAB: LOG HISTORY (Date-Grouped) */}
                                                    {activeTab === 'history' && (() => {
                                                        if (logsLoading) {
                                                            return (
                                                                <div className="flex flex-col items-center justify-center min-h-[400px] w-full space-y-4">
                                                                    <div className="w-8 h-8 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                                                                    <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] animate-pulse">Loading clinical history...</p>
                                                                </div>
                                                            );
                                                        }

                                                        const uniqueDates = Object.keys(logs.reduce((acc, log) => {
                                                            const date = new Date(log.logged_at).toLocaleDateString();
                                                            acc[date] = true;
                                                            return acc;
                                                        }, {})).sort((a, b) => new Date(b) - new Date(a));

                                                        return (
                                                            <div className="animate-in fade-in duration-500 flex flex-col md:flex-row gap-8 min-h-[600px]">
                                                                {/* LEFT SIDEBAR: DATE SELECTION (Timeline) */}
                                                                <div className="w-full md:w-72 flex-shrink-0 space-y-4">
                                                                    {/* DESKTOP TIMELINE: Hidden on Mobile */}
                                                                    <div className="hidden md:block">
                                                                        <div className="sticky top-[140px] lg:top-8 z-20 bg-[var(--color-bg-page)]/95 backdrop-blur-xl -mx-4 px-4 py-4 lg:mx-0 lg:px-0 lg:py-0 lg:static lg:bg-transparent transition-all border-b lg:border-none border-[var(--color-divider)]">
                                                                            <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] px-2 mb-3">Clinical Timeline</h3>
                                                                            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[700px] scrollbar-hide pb-2 md:pb-0">
                                                                                {uniqueDates.map(date => {
                                                                                    const isSelected = selectedHistoryDate === date;
                                                                                    const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === date);
                                                                                    return (
                                                                                        <button
                                                                                            key={date}
                                                                                            onClick={() => setSelectedHistoryDate(date)}
                                                                                            className={cn(
                                                                                                "flex-shrink-0 flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left shadow-sm w-full",
                                                                                                isSelected
                                                                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg scale-[1.02]'
                                                                                                    : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50'
                                                                                            )}
                                                                                        >
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className={cn(
                                                                                                    "w-3 h-3 rounded-full border-2 shadow-sm transition-colors",
                                                                                                    isSelected ? "border-white/50" : "border-white dark:border-zinc-800",
                                                                                                    dayStatuses[date] === 'danger' ? 'bg-red-500' :
                                                                                                        dayStatuses[date] === 'warning' ? 'bg-amber-500' :
                                                                                                            dayStatuses[date] === 'success' ? 'bg-emerald-500' :
                                                                                                                'bg-gray-300'
                                                                                                )} />
                                                                                                <div className="text-left">
                                                                                                    <div className={cn("text-xs md:text-sm font-black tracking-tight", isSelected ? 'text-white' : 'text-[var(--color-text-main)]')}>{date}</div>
                                                                                                    <div className={cn("text-[9px] font-bold uppercase tracking-tighter mt-0.5", isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]')}>
                                                                                                        {dayLogs.length} Entries • {Math.round(dayLogs.reduce((s, l) => s + (l.total_calories || 0), 0))} kcal
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                                {uniqueDates.length === 0 && (
                                                                                    <div className="p-8 text-center text-[var(--color-text-muted)] italic text-sm">No log history available.</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* MOBILE TIMELINE: Hidden on Desktop */}
                                                                    <div className="block md:hidden space-y-3">
                                                                        {/* CUSTOM DROPDOWN SELECTOR */}
                                                                        <div className="relative w-full z-30">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setIsMobileDateDropdownOpen(!isMobileDateDropdownOpen)}
                                                                                className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-sm hover:border-[var(--color-primary)]/50 transition-all font-semibold active:scale-[0.98]"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={cn(
                                                                                        "w-3 h-3 rounded-full border-2 shadow-sm",
                                                                                        selectedHistoryDate && dayStatuses[selectedHistoryDate] === 'danger' ? 'bg-red-500' :
                                                                                            selectedHistoryDate && dayStatuses[selectedHistoryDate] === 'warning' ? 'bg-amber-500' :
                                                                                                selectedHistoryDate && dayStatuses[selectedHistoryDate] === 'success' ? 'bg-emerald-500' :
                                                                                                    'bg-gray-300'
                                                                                    )} />
                                                                                    <div className="text-left">
                                                                                        <span className="text-xs font-black tracking-tight text-[var(--color-text-main)]">
                                                                                            {selectedHistoryDate ? selectedHistoryDate : 'Select Clinical Date'}
                                                                                        </span>
                                                                                        {selectedHistoryDate && (
                                                                                            <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest ml-2.5">
                                                                                                ({logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).length} Logs)
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <ChevronDown size={16} className={cn("text-[var(--color-text-muted)] transition-transform duration-200", isMobileDateDropdownOpen ? "rotate-180 text-[var(--color-primary)]" : "")} />
                                                                            </button>

                                                                            <AnimatePresence>
                                                                                {isMobileDateDropdownOpen && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0, y: -8 }}
                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                        exit={{ opacity: 0, y: -8 }}
                                                                                        transition={{ duration: 0.15 }}
                                                                                        className="absolute left-0 right-0 mt-2 max-h-[260px] overflow-y-auto bg-[var(--color-bg-card)]/98 backdrop-blur-xl border-2 border-[var(--color-divider)] rounded-2xl shadow-xl p-2 z-40 scrollbar-none"
                                                                                    >
                                                                                        {uniqueDates.map(date => {
                                                                                            const isSelected = selectedHistoryDate === date;
                                                                                            const dayLogs = logs.filter(l => new Date(l.logged_at).toLocaleDateString() === date);
                                                                                            return (
                                                                                                <button
                                                                                                    key={date}
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        setSelectedHistoryDate(date);
                                                                                                        setIsMobileDateDropdownOpen(false);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "w-full flex items-center justify-between p-3 my-0.5 rounded-xl transition-all text-left text-xs font-semibold",
                                                                                                        isSelected
                                                                                                            ? 'bg-[var(--color-primary)] text-white font-black shadow-md'
                                                                                                            : 'hover:bg-[var(--color-primary)]/10 text-[var(--color-text-main)]'
                                                                                                    )}
                                                                                                >
                                                                                                    <div className="flex items-center gap-2.5">
                                                                                                        <div className={cn(
                                                                                                            "w-2.5 h-2.5 rounded-full border border-white/20",
                                                                                                            dayStatuses[date] === 'danger' ? 'bg-red-500' :
                                                                                                                dayStatuses[date] === 'warning' ? 'bg-amber-500' :
                                                                                                                    dayStatuses[date] === 'success' ? 'bg-emerald-500' :
                                                                                                                        'bg-gray-300'
                                                                                                        )} />
                                                                                                        <span>{date}</span>
                                                                                                    </div>
                                                                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]')}>
                                                                                                        {dayLogs.length} Entries • {Math.round(dayLogs.reduce((s, l) => s + (l.total_calories || 0), 0))} kcal
                                                                                                    </span>
                                                                                                </button>
                                                                                            );
                                                                                        })}
                                                                                        {uniqueDates.length === 0 && (
                                                                                            <div className="p-4 text-center text-xs text-[var(--color-text-muted)] italic">No dates available.</div>
                                                                                        )}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>

                                                                        {/* ULTRA COMPACT HORIZONTAL CALENDAR PILL SWIPER */}
                                                                        {uniqueDates.length > 0 && (
                                                                            <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x px-2 w-full">
                                                                                <div className="w-1.5 shrink-0" />
                                                                                {uniqueDates.map(date => {
                                                                                    const isSelected = selectedHistoryDate === date;
                                                                                    const dateObj = new Date(date);
                                                                                    const monthStr = dateObj.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
                                                                                    const dayStr = dateObj.getDate();

                                                                                    return (
                                                                                        <button
                                                                                            key={date}
                                                                                            type="button"
                                                                                            onClick={() => setSelectedHistoryDate(date)}
                                                                                            className={cn(
                                                                                                "flex-shrink-0 snap-start w-[64px] h-[68px] flex flex-col items-center justify-between p-2 rounded-2xl border-2 transition-all relative shadow-sm",
                                                                                                isSelected
                                                                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg scale-105'
                                                                                                    : 'bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/40'
                                                                                            )}
                                                                                        >
                                                                                            <span className={cn("text-[8px] font-black uppercase tracking-wider", isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]')}>
                                                                                                {monthStr}
                                                                                            </span>
                                                                                            <span className={cn("text-base font-black tracking-tight leading-none", isSelected ? 'text-white' : 'text-[var(--color-text-main)]')}>
                                                                                                {dayStr}
                                                                                            </span>
                                                                                            <div className={cn(
                                                                                                "w-1.5 h-1.5 rounded-full border-xs",
                                                                                                isSelected ? "border-white/30" : "border-white dark:border-zinc-800",
                                                                                                dayStatuses[date] === 'danger' ? 'bg-red-500' :
                                                                                                    dayStatuses[date] === 'warning' ? 'bg-amber-500' :
                                                                                                        dayStatuses[date] === 'success' ? 'bg-emerald-500' :
                                                                                                            'bg-gray-300'
                                                                                            )} />
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                                <div className="w-1.5 shrink-0" />
                                                                            </div>
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
                                                                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                                                        <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                                                                            <Activity size={12} />
                                                                                            <span className="text-[9px] font-black uppercase tracking-widest">Analytics Active</span>
                                                                                        </div>
                                                                                        {logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate && l.status === 'pending').length > 0 && (
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                onClick={() => handleVerifyAllForDay(selectedHistoryDate)}
                                                                                                className="flex-1 sm:flex-none h-7 px-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] hover:text-white transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center"
                                                                                            >
                                                                                                <Check size={12} className="mr-1" />
                                                                                                Verify All ({logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate && l.status === 'pending').length})
                                                                                            </Button>
                                                                                        )}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            onClick={() => handleClearLogsForDay(selectedHistoryDate)}
                                                                                            className="flex-1 sm:flex-none h-7 px-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20 hover:bg-red-600 hover:text-white transition-all group font-black text-[9px] uppercase tracking-widest flex items-center justify-center"
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
                                                                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{v.rule_type === 'min' ? 'Min Goal' : 'Limit'} {v.limit}{v.unit}</span>
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
                                                                                            <div className={`text-xl font-black ${stat.color} dark:brightness-125`}>{formatValue(stat.value, user?.nutrient_precision)} <span className="text-[10px] opacity-70">{stat.unit}</span></div>
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

                                                                                <div className="grid grid-cols-1 gap-3">
                                                                                    {logs.filter(l => new Date(l.logged_at).toLocaleDateString() === selectedHistoryDate).sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at)).map(log => (
                                                                                        <div
                                                                                            key={log.id}
                                                                                            onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                                                            className="group relative bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-divider)] hover:border-[var(--color-primary)]/50 transition-all overflow-hidden flex h-24 md:h-40 cursor-pointer shadow-sm hover:shadow-md"
                                                                                        >
                                                                                            <div className="w-24 md:w-48 h-full relative overflow-hidden flex-shrink-0">
                                                                                                <img src={log.image_url} alt="Meal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded-md text-[7px] font-black text-white uppercase tracking-widest">
                                                                                                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="p-3 sm:p-6 flex-grow flex flex-col justify-between min-w-0">
                                                                                                <div>
                                                                                                    <div className="flex items-center justify-between mb-0.5 gap-2">
                                                                                                        <h5 className="text-[10px] sm:text-sm font-black text-[var(--color-secondary)] uppercase tracking-tight truncate">{log.meal_category}</h5>
                                                                                                        <div className={cn(
                                                                                                            "px-1.5 py-0.5 rounded-full text-[6px] sm:text-[8px] font-black uppercase tracking-widest whitespace-nowrap",
                                                                                                            (log.status === 'verified' || log.status === 'reviewed') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' :
                                                                                                                log.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50' :
                                                                                                                    'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50'
                                                                                                        )}>
                                                                                                            {(log.status === 'verified' || log.status === 'reviewed') ? 'Verified' : log.status === 'rejected' ? 'Correction Requested' : 'Pending'}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <p className="text-[10px] sm:text-sm font-bold text-[var(--color-text-main)] line-clamp-1">
                                                                                                        {log.nutritionist_review?.meal_summary || log.ai_analysis?.meal_summary || "Meal Entry"}
                                                                                                    </p>
                                                                                                    <div className="flex gap-3 mt-1.5">
                                                                                                        <div className="flex flex-col">
                                                                                                            <span className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Cals</span>
                                                                                                            <span className="text-[10px] font-black text-[var(--color-text-main)]">{log.total_calories || 0}</span>
                                                                                                        </div>
                                                                                                        <div className="flex flex-col">
                                                                                                            <span className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Cons</span>
                                                                                                            <span className="text-[10px] font-black text-blue-600">
                                                                                                                {log.consumption_percent === 100 ? 'Full' :
                                                                                                                    log.consumption_percent === 75 ? '3/4' :
                                                                                                                        log.consumption_percent === 50 ? '1/2' :
                                                                                                                            log.consumption_percent === 25 ? '1/4' :
                                                                                                                                'None'}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
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
                                                        );
                                                    })()}

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

                                                            {/* Rejections Sent Section */}
                                                            {logs.filter(l => l.status === 'rejected').length > 0 && (
                                                                <div className="mt-8 pt-8 border-t border-[var(--color-divider)]">
                                                                    <div className="flex justify-between items-center mb-4">
                                                                        <h3 className="font-bold text-lg text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                                                            <AlertCircle size={20} className="text-rose-600 dark:text-rose-400 animate-pulse" />
                                                                            Rejections Sent (Awaiting Parent Correction)
                                                                        </h3>
                                                                        <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-rose-200 dark:border-rose-900/50">
                                                                            {logs.filter(l => l.status === 'rejected').length} Correction{logs.filter(l => l.status === 'rejected').length > 1 ? 's' : ''} Requested
                                                                        </span>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                        {logs.filter(l => l.status === 'rejected').map(log => (
                                                                            <Card
                                                                                key={log.id}
                                                                                onClick={() => { setSelectedLogForReview(log); setIsReviewOpen(true); }}
                                                                                className="hover:shadow-xl transition-all cursor-pointer border-2 border-rose-200 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/10 dark:bg-rose-950/5 overflow-hidden group"
                                                                            >
                                                                                <CardContent className="p-0">
                                                                                    <div className="h-40 relative overflow-hidden">
                                                                                        <img src={log.image_url} alt="Meal" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                                                        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors" />
                                                                                        <div className="absolute top-3 right-3">
                                                                                            <span className="bg-rose-600 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                                                                <Clock size={10} />
                                                                                                Correction Pending
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="absolute bottom-3 left-3">
                                                                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">{new Date(log.logged_at).toLocaleDateString()}</p>
                                                                                            <p className="text-white font-black uppercase text-xs">{log.meal_category}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="p-4 space-y-2">
                                                                                        <p className="text-sm font-bold text-[var(--color-text-main)] line-clamp-1">
                                                                                            {log.nutritionist_review?.meal_summary || log.ai_analysis?.meal_summary || 'Meal Log'}
                                                                                        </p>

                                                                                        {/* Clinician feedback comment */}
                                                                                        <div className="p-2.5 bg-rose-100/40 dark:bg-rose-950/20 border-l-2 border-rose-500 rounded-r-xl">
                                                                                            <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-0.5">Your Feedback:</p>
                                                                                            <p className="text-xs text-[var(--color-text-main)] italic line-clamp-2">
                                                                                                "{log.nutritionist_review?.comment || 'Please correct meal details.'}"
                                                                                            </p>
                                                                                        </div>

                                                                                        <div className="flex justify-between items-center pt-2 border-t border-[var(--color-divider)]">
                                                                                            <span className="text-[10px] text-[var(--color-text-muted)] font-bold">{log.total_calories || 0} kcal</span>
                                                                                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">View Details →</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </CardContent>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {activeTab === 'adime' && (
                                                        <>
                                                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 sm:p-6 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                                                                    <h3 className="font-bold text-base sm:text-lg text-[var(--color-secondary)] flex items-center gap-2">
                                                                        <MessageSquare size={18} className="text-blue-600 shrink-0" /> ADIME Clinical Note
                                                                    </h3>

                                                                    <div className="flex items-center gap-3">
                                                                        {/* Sync Status Indicator */}
                                                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-white/5 rounded-full border border-[var(--color-divider)]">
                                                                            <div className={cn(
                                                                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                                syncStatus.type === 'saving' ? 'bg-amber-500' :
                                                                                    syncStatus.type === 'saved' ? 'bg-emerald-500' : 'bg-gray-300'
                                                                            )} />
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                                                {syncStatus.type === 'saving' ? 'Syncing...' :
                                                                                    syncStatus.type === 'saved' ? `Saved ${syncStatus.lastSaved ? format(syncStatus.lastSaved, 'HH:mm') : ''}` :
                                                                                        'Draft Idle'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>


                                                                {/* Unified Template Selector Dropdown */}
                                                                <div className="mb-6 space-y-1.5 w-full sm:max-w-xs">
                                                                    <div className="relative">
                                                                        <select
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === 'copy_forward') {
                                                                                    handleCopyLastAdime();
                                                                                } else if (val) {
                                                                                    handleApplyAdimeTemplate(val);
                                                                                }
                                                                                e.target.value = ''; // Reset selection
                                                                            }}
                                                                            className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-white dark:bg-slate-900 text-xs font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-sm"
                                                                            defaultValue=""
                                                                        >
                                                                            <option value="" disabled>Choose ADIME Template...</option>
                                                                            {CLINICAL_ADIME_TEMPLATES.map(t => (
                                                                                <option key={t.name} value={t.content} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                                                                                    + {t.name}
                                                                                </option>
                                                                            ))}
                                                                            {adimeNotes.length > 0 && (
                                                                                <option value="copy_forward" className="bg-white dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 font-bold">
                                                                                    📋 Copy Forward (Last Note)
                                                                                </option>
                                                                            )}
                                                                        </select>
                                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-600 dark:text-blue-400">
                                                                            <ChevronDown size={14} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <form onSubmit={handleAddAdimeNote} className="space-y-6">
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2 block">Clinical ADIME Note</label>
                                                                        <div className={`bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 transition-all ${focusedField === 'assessment' ? 'border-[var(--color-primary)] shadow-md scale-[1.01]' : 'border-[var(--color-divider)]'}`}>
                                                                            <ReactQuill
                                                                                ref={el => editorRefs.current['assessment'] = el}
                                                                                theme="snow"
                                                                                value={newAdime.assessment}
                                                                                onChange={(val) => setNewAdime({ ...newAdime, assessment: val })}
                                                                                onFocus={() => setFocusedField('assessment')}
                                                                                modules={{ toolbar: true }}
                                                                                placeholder="Enter full clinical ADIME documentation here..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            type="submit"
                                                                            disabled={savingAdime || !Object.values(newAdime).some(v => v && v.replace(/<[^>]*>/g, '').trim().length > 0)}
                                                                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-black uppercase text-xs tracking-widest px-8 py-4 h-auto shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:grayscale"
                                                                        >
                                                                            {savingAdime ? (
                                                                                <>
                                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    Saving Record...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Save size={18} /> Save ADIME Note
                                                                                </>
                                                                            )}
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
                                                                        <div key={note.id} className={cn(
                                                                            "p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-white/5 space-y-3 relative group transition-all",
                                                                            note.is_optimistic && "opacity-50 grayscale pointer-events-none"
                                                                        )}>
                                                                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs font-bold text-blue-600 uppercase">ADIME RECORD</span>
                                                                                    {note.is_optimistic && (
                                                                                        <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full animate-pulse uppercase tracking-tighter">Syncing...</span>
                                                                                    )}
                                                                                </div>
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
                                                                                    <div className="space-y-1">
                                                                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Clinical Note</label>
                                                                                        <div className="bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 border-[var(--color-divider)]">
                                                                                            <ReactQuill
                                                                                                theme="snow"
                                                                                                value={editAdimeForm.assessment}
                                                                                                onChange={(val) => setEditAdimeForm({ ...editAdimeForm, assessment: val })}
                                                                                                modules={{ toolbar: true }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2 pt-2">
                                                                                        <Button variant="ghost" type="button" onClick={() => setEditingAdimeId(null)} className="text-xs font-black uppercase">Cancel</Button>
                                                                                        <Button type="submit" className="bg-blue-600 text-white text-xs font-black uppercase px-6">Update Record</Button>
                                                                                    </div>
                                                                                </form>
                                                                            ) : (
                                                                                <div className="space-y-4">
                                                                                    <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-[var(--color-divider)] shadow-inner">
                                                                                        <p className="text-[10px] font-black text-[var(--color-primary)] uppercase mb-3 tracking-widest border-b border-[var(--color-divider)] pb-2">Unified ADIME Documentation</p>
                                                                                        <div className="ql-snow">
                                                                                            <div
                                                                                                className="ql-editor !p-0 !min-h-0 text-sm clinical-content"
                                                                                                dangerouslySetInnerHTML={{ __html: note.assessment || '<em class="text-[var(--color-text-muted)] opacity-60">No clinical data recorded.</em>' }}
                                                                                            />
                                                                                        </div>
                                                                                        {(note.diagnosis || note.intervention || note.monitoring || note.evaluation) && (
                                                                                            <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-divider)] opacity-60">
                                                                                                <p className="text-[9px] font-bold uppercase text-[var(--color-text-muted)] mb-2">Legacy Multi-field Data Detected</p>
                                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                                    {['diagnosis', 'intervention', 'monitoring', 'evaluation'].map(f => note[f] && (
                                                                                                        <div key={f} className="text-[10px] p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                                                                                                            <span className="font-black uppercase text-[var(--color-primary)] mr-1 block mb-1">{f}:</span>
                                                                                                            <div className="ql-snow">
                                                                                                                <div className="ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: note[f] }} />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* TAB: NOTES */}
                                                    {activeTab === 'notes' && (
                                                        <>
                                                            <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800/30">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <h3 className="font-bold text-lg text-[var(--color-secondary)] flex items-center gap-2">
                                                                        <StickyNote size={20} className="text-[var(--color-primary)]" /> Client Observation Notes
                                                                    </h3>

                                                                    {/* Sync Status Indicator (Mini) */}
                                                                    <div className="flex items-center gap-1.5 opacity-60">
                                                                        <div className={cn(
                                                                            "w-1 h-1 rounded-full",
                                                                            syncStatus.type === 'saving' ? 'bg-amber-500 animate-pulse' :
                                                                                syncStatus.type === 'saved' ? 'bg-emerald-500' : 'bg-transparent'
                                                                        )} />
                                                                        <span className="text-[8px] font-bold uppercase tracking-tighter text-[var(--color-text-muted)]">
                                                                            {syncStatus.type === 'saving' ? 'Saving' : syncStatus.type === 'saved' ? 'Draft' : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>


                                                                <form onSubmit={handleAddNote} className="space-y-3">
                                                                    <div className={`bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 transition-all ${focusedField === 'notes' ? 'border-[var(--color-primary)] shadow-md scale-[1.01]' : 'border-[var(--color-divider)]'}`}>
                                                                        <ReactQuill
                                                                            ref={el => editorRefs.current['notes'] = el}
                                                                            theme="snow"
                                                                            value={newNote}
                                                                            onChange={setNewNote}
                                                                            onFocus={() => setFocusedField('notes')}
                                                                            modules={{ toolbar: true }}
                                                                            placeholder="Add a new observation, milestone, or follow-up note..."
                                                                        />
                                                                    </div>
                                                                    <div className="flex justify-end pt-2">
                                                                        <Button type="submit" disabled={!newNote || newNote.replace(/<[^>]*>/g, '').trim().length === 0} className="bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/20">
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
                                                                        <div key={note.id} className={cn(
                                                                            "p-5 border rounded-xl relative group hover:shadow-md transition-all",
                                                                            note.is_pinned ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40' : 'bg-white dark:bg-white/5 border-[var(--color-divider)]',
                                                                            note.is_optimistic && "opacity-50 grayscale pointer-events-none"
                                                                        )}>
                                                                            {note.is_optimistic ? (
                                                                                <span className="absolute top-2 right-4 text-[10px] font-black text-amber-600 uppercase flex items-center gap-1 animate-pulse">Syncing...</span>
                                                                            ) : note.is_pinned && (
                                                                                <span className="absolute top-2 right-4 text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase flex items-center gap-1">📌 Pinned</span>
                                                                            )}

                                                                            {editingNoteId === note.id ? (
                                                                                <form onSubmit={handleUpdateNote} className="space-y-3">
                                                                                    <div className="bg-white dark:bg-white/5 rounded-xl overflow-hidden border-2 border-[var(--color-primary)]">
                                                                                        <ReactQuill
                                                                                            theme="snow"
                                                                                            value={editNoteForm}
                                                                                            onChange={setEditNoteForm}
                                                                                            modules={{ toolbar: true }}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <Button variant="ghost" type="button" onClick={() => setEditingNoteId(null)} className="text-xs font-black uppercase">Cancel</Button>
                                                                                        <Button type="submit" disabled={!editNoteForm || editNoteForm.replace(/<[^>]*>/g, '').trim().length === 0} className="bg-[var(--color-primary)] text-white text-xs font-black uppercase px-6 shadow-lg shadow-emerald-500/20">Update Note</Button>
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
                                                                                                className={`h-8 w-8 p-0 rounded-full transition-colors ${note.is_pinned ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40' : 'text-gray-400 hover:text-[var(--color-primary)]'}`}
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
                                                        </>
                                                    )}

                                                    {/* TAB: INSIGHTS */}
                                                    {activeTab === 'insights' && (
                                                        <InsightsTab selectedProfile={selectedProfile} logs={logs} />
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
                                                                                                onChange={(e) => {
                                                                                                    const cat = e.target.value;
                                                                                                    let unit = editRuleForm.rule_unit;
                                                                                                    if (cat === 'Calories') unit = 'kcal';
                                                                                                    else if (['Protein', 'Carbohydrates', 'Fats'].includes(cat)) unit = 'g';
                                                                                                    else if (cat === 'Fluid/Water') unit = 'ml';

                                                                                                    setEditRuleForm({ ...editRuleForm, category: cat, rule_unit: unit });
                                                                                                }}
                                                                                                className="w-full p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                                                                                            >
                                                                                                {['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Fluid/Water', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
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
                                                                                                    className={cn(
                                                                                                        "w-16 p-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-xs font-bold outline-none focus:border-[var(--color-primary)] text-center",
                                                                                                        ['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Sugar', 'Sodium', 'Fluid/Water'].includes(editRuleForm.category) ? "opacity-50" : ""
                                                                                                    )}
                                                                                                    placeholder="Unit"
                                                                                                    disabled={['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Sugar', 'Sodium', 'Fluid/Water'].includes(editRuleForm.category)}
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
                                                                                // Standard Clinical Units
                                                                                if (cat === 'Calories') unit = 'kcal';
                                                                                else if (['Protein', 'Carbohydrates', 'Fats'].includes(cat)) unit = 'g';
                                                                                else if (cat === 'Fluid/Water') unit = 'ml';
                                                                                else if (cat === 'Other') unit = '';

                                                                                setNewRule({ ...newRule, category: cat, rule_unit: unit });
                                                                            }}
                                                                        >
                                                                            <option>Calories</option>
                                                                            <option>Protein</option>
                                                                            <option>Carbohydrates</option>
                                                                            <option>Fats</option>
                                                                            <option>Fluid/Water</option>
                                                                            <option>Other</option>
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
                                                                                className={cn(
                                                                                    "w-24 p-2 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-main)]",
                                                                                    ['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Sugar', 'Sodium', 'Fluid/Water'].includes(newRule.category) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                                                                )}
                                                                                value={newRule.rule_unit}
                                                                                onChange={(e) => setNewRule({ ...newRule, rule_unit: e.target.value })}
                                                                                disabled={['Calories', 'Protein', 'Carbohydrates', 'Fats', 'Sugar', 'Sodium', 'Fluid/Water'].includes(newRule.category)}
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
                                                        <div className="space-y-6 animate-in fade-in duration-500">
                                                            {/* PLANNER HEADER & NAV */}
                                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--color-bg-page)] dark:bg-white/5 p-6 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                                                                <div>
                                                                    <h3 className="font-black text-xl text-[var(--color-text-main)] uppercase tracking-tight flex items-center gap-3">
                                                                        <ChefHat className="text-[var(--color-primary)]" size={24} />
                                                                        Weekly Clinical Planner
                                                                    </h3>
                                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                                                                        Week of {format(currentWeekStart, 'MMMM d, yyyy')} — {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                                    <div className="flex items-center bg-[var(--color-bg-card)] rounded-2xl border-2 border-[var(--color-divider)] p-1">
                                                                        <button
                                                                            onClick={handlePrevWeek}
                                                                            className="p-2 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-main)] hover:text-[var(--color-primary)] rounded-xl transition-all"
                                                                        >
                                                                            <ArrowLeft size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={handleThisWeek}
                                                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] hover:text-[var(--color-primary)]"
                                                                        >
                                                                            Today
                                                                        </button>
                                                                        <button
                                                                            onClick={handleNextWeek}
                                                                            className="p-2 hover:bg-[var(--color-primary)]/10 text-[var(--color-text-main)] hover:text-[var(--color-primary)] rounded-xl transition-all rotate-180"
                                                                        >
                                                                            <ArrowLeft size={18} />
                                                                        </button>
                                                                    </div>
                                                                    {/* SAVE WEEK AS TEMPLATE */}
                                                                    {mealPlan.length > 0 && (
                                                                        <Button
                                                                            onClick={() => setIsSaveTemplateModalOpen(true)}
                                                                            variant="outline"
                                                                            className="w-full md:w-auto h-11 px-4 rounded-2xl border-[var(--color-divider)] text-[var(--color-text-main)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider bg-[var(--color-bg-card)]"
                                                                        >
                                                                            <BookmarkPlus size={18} /> Save as Template
                                                                        </Button>
                                                                    )}

                                                                    {/* LOAD WEEKLY MEAL TEMPLATE */}
                                                                    {mealTemplates.length > 0 && (
                                                                        <div className="relative group/meal-template flex-grow md:flex-none">
                                                                            <Button
                                                                                variant="outline"
                                                                                className="w-full md:w-auto h-11 px-4 rounded-2xl border-[var(--color-divider)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider bg-[var(--color-bg-card)]"
                                                                            >
                                                                                <ListFilter size={18} /> Load Template
                                                                            </Button>
                                                                            <div className="absolute top-full right-0 pt-2 w-80 opacity-0 invisible group-hover/meal-template:opacity-100 group-hover/meal-template:visible transition-all z-50">
                                                                                <div className="bg-white dark:bg-[#1a1a1a] border-2 border-[var(--color-divider)] rounded-2xl shadow-xl overflow-hidden">
                                                                                    <div className="px-3 py-2 bg-[var(--color-primary)]/10 border-b border-[var(--color-divider)] text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1">
                                                                                        <span>🍽️ Weekly Meal Templates</span>
                                                                                    </div>
                                                                                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                                                                                        {mealTemplates.map(t => (
                                                                                            <div
                                                                                                key={t.id}
                                                                                                className="p-3 border-b border-[var(--color-divider)] last:border-0 hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors group/mitem flex justify-between items-start gap-2"
                                                                                                onClick={() => handleApplyMealTemplate(t.id)}
                                                                                            >
                                                                                                <div className="flex-grow min-w-0">
                                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                                        <span className="text-xs font-black text-[var(--color-text-main)] group-hover/mitem:text-[var(--color-primary)] transition-colors line-clamp-1">{t.name}</span>
                                                                                                        {t.is_default && (
                                                                                                            <span className="px-1.5 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[8px] font-black uppercase tracking-wider rounded-md border border-[var(--color-primary)]/20 shrink-0">Starter</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed line-clamp-2">{t.description}</div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/mitem:opacity-100 transition-opacity">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleOpenTemplateEditor(t);
                                                                                                        }}
                                                                                                        className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                                                                                                        title="Edit Template"
                                                                                                    >
                                                                                                        <Edit2 size={12} />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={(e) => handleDeleteMealTemplate(t.id, e)}
                                                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                                                        title="Delete Template"
                                                                                                    >
                                                                                                        <Trash2 size={12} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <Button
                                                                        onClick={() => {
                                                                            setConfirmDialog({
                                                                                isOpen: true,
                                                                                title: 'Clear Weekly Plan',
                                                                                message: 'Are you sure you want to clear all planned meals for this child? This cannot be undone.',
                                                                                onConfirm: handleClearPlan
                                                                            });
                                                                        }}
                                                                        variant="ghost"
                                                                        className="flex-grow md:flex-none h-11 px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl border-2 border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* THE WEEKLY GRID - DESKTOP ONLY */}
                                                            <div className="hidden md:block bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] overflow-hidden shadow-sm relative">
                                                                {/* Scrolling Indicator for Desktop */}
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none md:hidden">
                                                                    <div className="bg-[var(--color-primary)] text-white p-2 rounded-full shadow-lg animate-pulse">
                                                                        <ArrowLeft size={16} className="rotate-180" />
                                                                    </div>
                                                                </div>

                                                                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--color-primary)]/20">
                                                                    <table className="w-full border-collapse min-w-[1400px]">
                                                                        <thead>
                                                                            <tr className="bg-[var(--color-bg-page)]/50 border-b-2 border-[var(--color-divider)]">
                                                                                <th className="p-4 w-36 border-r-2 border-[var(--color-divider)] sticky left-0 bg-[var(--color-bg-page)] z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                                                    <div className="text-[10px] font-black text-[var(--color-secondary)] uppercase tracking-widest">Time / Day</div>
                                                                                </th>
                                                                                {weekDays.map(day => (
                                                                                    <th key={day.toString()} className={cn(
                                                                                        "p-4 border-r-2 border-[var(--color-divider)] last:border-r-0 transition-colors",
                                                                                        isSameDay(day, new Date()) ? "bg-[var(--color-primary)]/10" : ""
                                                                                    )}>
                                                                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{format(day, 'EEEE')}</div>
                                                                                        <div className={cn(
                                                                                            "text-lg font-black mt-1",
                                                                                            isSameDay(day, new Date()) ? "text-[var(--color-primary)]" : "text-[var(--color-text-main)]"
                                                                                        )}>
                                                                                            {format(day, 'MMM d')}
                                                                                        </div>
                                                                                        {/* Daily Totals in Header */}
                                                                                        {(() => {
                                                                                            const dayMeals = mealPlan.filter(m => isSameDay(parseISO(m.date), day));
                                                                                            const totalCal = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
                                                                                            return (
                                                                                                <div className={cn(
                                                                                                    "mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                                                                                                    totalCal > 0
                                                                                                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                                                                                                        : "bg-white/50 dark:bg-black/20 border-[var(--color-divider)]"
                                                                                                )}>
                                                                                                    <Activity size={12} />
                                                                                                    <span className="text-[10px] font-black uppercase tracking-tighter">{totalCal || 0} kcal</span>
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                                                                                <tr key={type} className="border-b-2 border-[var(--color-divider)] last:border-b-0 group">
                                                                                    <td className="p-4 border-r-2 border-[var(--color-divider)] bg-[var(--color-bg-page)]/30 group-hover:bg-[var(--color-bg-page)]/50 transition-colors sticky left-0 z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                                                            <span className="text-[10px] font-black text-[var(--color-secondary)] uppercase tracking-widest">{type}</span>
                                                                                            <div className="h-9 w-9 rounded-xl bg-white dark:bg-white/5 border border-[var(--color-divider)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/30 transition-all shadow-sm">
                                                                                                <Utensils size={16} />
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    {weekDays.map(day => {
                                                                                        const dayMeals = mealPlan.filter(m => isSameDay(parseISO(m.date), day) && m.meal_type === type);
                                                                                        return (
                                                                                            <td key={day.toString()} className={cn(
                                                                                                "p-3 border-r-2 border-[var(--color-divider)] last:border-r-0 align-top hover:bg-[var(--color-primary)]/5 transition-all relative group/slot min-h-[160px]",
                                                                                                isSameDay(day, new Date()) ? "bg-[var(--color-primary)]/5" : ""
                                                                                            )}>
                                                                                                <div className="space-y-2">
                                                                                                    {dayMeals.map(meal => (
                                                                                                        <div key={meal.id} className="p-4 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-divider)] shadow-sm hover:shadow-xl hover:border-[var(--color-primary)]/50 transition-all group/meal relative">
                                                                                                            <div className="flex justify-between items-start mb-2">
                                                                                                                <div className="text-[11px] font-black text-[var(--color-text-main)] uppercase tracking-tight leading-tight line-clamp-2">{meal.recipe_name}</div>
                                                                                                                <div className="flex items-center gap-1 opacity-0 group-hover/meal:opacity-100 transition-all shrink-0">
                                                                                                                    <button
                                                                                                                        onClick={() => handleEditMeal(meal)}
                                                                                                                        className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-all"
                                                                                                                        title="Edit Meal"
                                                                                                                    >
                                                                                                                        <Edit2 size={13} />
                                                                                                                    </button>
                                                                                                                    <button
                                                                                                                        onClick={() => handleDeleteMeal(meal.id)}
                                                                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                                                                                        title="Delete Meal"
                                                                                                                    >
                                                                                                                        <Trash2 size={13} />
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                                                                                    {meal.calories || '--'} kcal
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                                                                                    {meal.protein_g || '--'}g P
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}

                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            setSelectedDateForMeal(format(day, 'yyyy-MM-dd'));
                                                                                                            setMealForm(prev => ({ ...prev, meal_type: type }));
                                                                                                            setIsMealModalOpen(true);
                                                                                                        }}
                                                                                                        className="w-full py-4 border-2 border-dashed border-[var(--color-divider)] rounded-2xl text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all group/add flex flex-col items-center justify-center gap-1.5 min-h-[60px]"
                                                                                                    >
                                                                                                        <Plus size={16} className="group-hover/add:scale-125 transition-transform" />
                                                                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/slot:opacity-100 transition-opacity">Schedule {type}</span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        );
                                                                                    })}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            {/* THE WEEKLY PLANNER - MOBILE ONLY */}
                                                            <div className="block md:hidden space-y-4">
                                                                {/* Day Selection Tab Strip */}
                                                                <div className="flex gap-2 overflow-x-auto pb-2.5 -mx-4 px-4 scrollbar-none snap-x whitespace-nowrap">
                                                                    {weekDays.map((day, i) => {
                                                                        const isSelected = activePlannerDay === i;
                                                                        const isToday = isSameDay(day, new Date());
                                                                        const dayMeals = mealPlan.filter(m => isSameDay(parseISO(m.date), day));
                                                                        const totalCal = dayMeals.reduce((s, m) => s + (m.calories || 0), 0);
                                                                        return (
                                                                            <button
                                                                                key={day.toString()}
                                                                                onClick={() => setActivePlannerDay(i)}
                                                                                className={cn(
                                                                                    "flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all w-[72px] text-center select-none shadow-sm snap-start",
                                                                                    isSelected
                                                                                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-emerald-500/20 scale-[1.02]"
                                                                                        : "bg-[var(--color-bg-card)] border-[var(--color-divider)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]/50",
                                                                                    isToday && !isSelected ? "border-[var(--color-primary)]/30" : ""
                                                                                )}
                                                                            >
                                                                                <span className={cn("text-[9px] font-black uppercase tracking-wider block", isSelected ? "text-white/80" : "text-[var(--color-text-muted)]")}>{format(day, 'EEE')}</span>
                                                                                <span className="text-sm font-black mt-0.5">{format(day, 'd')}</span>
                                                                                {totalCal > 0 ? (
                                                                                    <span className={cn(
                                                                                        "text-[7px] font-black mt-1 px-1 py-0.5 rounded-md border tracking-tighter",
                                                                                        isSelected
                                                                                            ? "bg-white/20 text-white border-white/20"
                                                                                            : "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20"
                                                                                    )}>
                                                                                        {totalCal} kcal
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[7px] font-bold mt-1 opacity-40 uppercase tracking-tighter">0 kcal</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Vertical schedule slots for active selected day */}
                                                                <div className="space-y-4">
                                                                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
                                                                        const selectedDayDate = weekDays[activePlannerDay];
                                                                        const dayMeals = mealPlan.filter(m => isSameDay(parseISO(m.date), selectedDayDate) && m.meal_type === type);
                                                                        return (
                                                                            <div key={type} className="bg-[var(--color-bg-card)] rounded-3xl border-2 border-[var(--color-divider)] p-5 space-y-4 shadow-sm">
                                                                                <div className="flex justify-between items-center border-b border-[var(--color-divider)] pb-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="h-8 w-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                                                                            <Utensils size={14} />
                                                                                        </div>
                                                                                        <span className="text-xs font-black text-[var(--color-secondary)] uppercase tracking-wider">{type}</span>
                                                                                    </div>
                                                                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest bg-[var(--color-bg-page)] px-2.5 py-1 rounded-full border border-[var(--color-divider)]">
                                                                                        {dayMeals.length} Scheduled
                                                                                    </span>
                                                                                </div>

                                                                                {dayMeals.length > 0 ? (
                                                                                    <div className="space-y-3">
                                                                                        {dayMeals.map(meal => (
                                                                                            <div key={meal.id} className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex justify-between items-center shadow-sm">
                                                                                                <div className="min-w-0 pr-2">
                                                                                                    <div className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-tight line-clamp-1">{meal.recipe_name}</div>
                                                                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                                                                            {meal.calories || '--'} kcal
                                                                                                        </span>
                                                                                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                                                                            {meal.protein_g || '--'}g P
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                                    <button
                                                                                                        onClick={() => handleEditMeal(meal)}
                                                                                                        className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-all border border-transparent hover:border-[var(--color-primary)]/20"
                                                                                                        title="Edit Meal"
                                                                                                    >
                                                                                                        <Edit2 size={14} />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleDeleteMeal(meal.id)}
                                                                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100/20"
                                                                                                        title="Delete Meal"
                                                                                                    >
                                                                                                        <Trash2 size={14} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-[10px] text-center text-[var(--color-text-muted)] italic py-2">
                                                                                        No meal scheduled for this slot.
                                                                                    </div>
                                                                                )}

                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedDateForMeal(format(selectedDayDate, 'yyyy-MM-dd'));
                                                                                        setMealForm(prev => ({ ...prev, meal_type: type }));
                                                                                        setIsMealModalOpen(true);
                                                                                    }}
                                                                                    className="w-full py-3.5 border-2 border-dashed border-[var(--color-divider)] rounded-2xl text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-bg-page)]/50"
                                                                                >
                                                                                    <Plus size={14} /> Schedule {type}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* FOOTER INFO */}
                                                            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-amber-100 dark:border-amber-800/30 flex gap-4 items-start">
                                                                <div className="p-3 bg-amber-100 dark:bg-amber-800/50 rounded-2xl text-amber-600 dark:text-amber-400">
                                                                    <AlertCircle size={20} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest text-xs mb-1">Weekly Planning Guidelines</h4>
                                                                    <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                                                                        Ensure the total daily calories across all slots align with the child's clinical targets. Parents will see this schedule on their dashboard in real-time. Use the <strong>"Insights"</strong> tab to verify the nutritional balance of your proposed plan.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TAB: PORTION EXCHANGE */}
                                                    {activeTab === 'portions' && (
                                                        <div className="space-y-6 animate-in fade-in duration-500">
                                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-white/5 p-5 rounded-[1.5rem] border-2 border-[var(--color-divider)] shadow-sm">
                                                                <div>
                                                                    <h3 className="font-black text-lg text-[var(--color-secondary)] uppercase tracking-tight flex items-center gap-2">
                                                                        <Table className="text-[var(--color-primary)]" size={20} />
                                                                        Portion Exchange Matrix
                                                                    </h3>
                                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] mt-2 uppercase tracking-widest opacity-70">
                                                                        Medical Grade Portion Distribution Plan
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {portionTemplates.length > 0 && (() => {
                                                                        const universalTemplates = portionTemplates.filter(t => !t.nutritionist_id);
                                                                        const customTemplates = portionTemplates.filter(t => t.nutritionist_id);
                                                                        return (
                                                                            <div className="relative group/template">
                                                                                <Button variant="outline" className="h-9 px-3 rounded-lg border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-transparent">
                                                                                    <ListFilter size={14} /> Load Template
                                                                                </Button>
                                                                                <div className="absolute top-full right-0 pt-2 w-72 opacity-0 invisible group-hover/template:opacity-100 group-hover/template:visible transition-all z-50">
                                                                                    <div className="bg-white dark:bg-[#1a1a1a] border-2 border-[var(--color-divider)] rounded-2xl shadow-xl overflow-hidden">
                                                                                        <div className="max-h-80 overflow-y-auto scrollbar-thin">
                                                                                            {universalTemplates.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-[var(--color-divider)] text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                                                                                        <span>🌿 Clinical Standards</span>
                                                                                                    </div>
                                                                                                    {universalTemplates.map(t => (
                                                                                                        <div
                                                                                                            key={t.id}
                                                                                                            className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-divider)] hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors"
                                                                                                            onClick={() => applyPortionTemplate(t)}
                                                                                                        >
                                                                                                            <span className="text-xs font-bold text-[var(--color-text-main)] truncate pr-2">{t.template_name}</span>
                                                                                                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[8px] font-black uppercase tracking-tight rounded-md border border-emerald-200 dark:border-emerald-800/20">
                                                                                                                Universal
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {customTemplates.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="px-3 py-2 bg-[var(--color-bg-page)]/80 border-b border-[var(--color-divider)] text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1">
                                                                                                        <span>👤 Your Saved Templates</span>
                                                                                                    </div>
                                                                                                    {customTemplates.map(t => (
                                                                                                        <div
                                                                                                            key={t.id}
                                                                                                            className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-divider)] last:border-b-0 hover:bg-[var(--color-primary)]/5 group/titem cursor-pointer transition-colors"
                                                                                                            onClick={() => applyPortionTemplate(t)}
                                                                                                        >
                                                                                                            <span className="text-xs font-bold text-[var(--color-text-main)] truncate pr-2">{t.template_name}</span>
                                                                                                            <button
                                                                                                                onClick={(e) => { e.stopPropagation(); setTemplateToDelete(t); }}
                                                                                                                className="text-red-400 hover:text-red-600 opacity-0 group-hover/titem:opacity-100 transition-opacity p-1 bg-red-50 dark:bg-red-900/20 rounded-md"
                                                                                                            >
                                                                                                                <Trash2 size={12} />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    <Button
                                                                        onClick={() => setIsTemplateModalOpen(true)}
                                                                        variant="outline"
                                                                        className="h-9 px-3 rounded-lg border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-transparent"
                                                                        title="Save current matrix as a template"
                                                                    >
                                                                        <BookmarkPlus size={14} /> Save Template
                                                                    </Button>

                                                                    <Button
                                                                        onClick={handleSavePortions}
                                                                        disabled={isSavingPortions}
                                                                        className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                                                    >
                                                                        {isSavingPortions ? 'Saving...' : <><Save size={14} /> Update Matrix</>}
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* PORTION GRID / MOBILE CARDS */}
                                                            <div className="w-full">
                                                                {/* DESKTOP MATRIX */}
                                                                <div className="hidden lg:block bg-white dark:bg-white/5 rounded-[1.5rem] border-2 border-[var(--color-divider)] overflow-hidden shadow-sm">
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full border-collapse min-w-[900px]">
                                                                            <thead>
                                                                                <tr className="bg-[var(--color-bg-page)]/50 border-b-2 border-[var(--color-divider)]">
                                                                                    <th className="p-4 text-left w-40 border-r-2 border-[var(--color-divider)] sticky left-0 bg-[var(--color-bg-page)] z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                                                        <span className="text-[9px] font-black text-[var(--color-secondary)] uppercase tracking-[0.2em]">Food Item</span>
                                                                                    </th>
                                                                                    {['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner'].map(meal => (
                                                                                        <th key={meal} className="p-4 text-center border-r-2 border-[var(--color-divider)] last:border-r-0">
                                                                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em]">{meal}</span>
                                                                                        </th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {[
                                                                                    { id: 'vegetables', label: 'Vegetables', icon: <Leaf size={14} />, unit: '1/2 cup' },
                                                                                    { id: 'fruit', label: 'Fruit', icon: <Apple size={14} />, unit: '1 pc/slice' },
                                                                                    { id: 'milk', label: 'Milk', icon: <Milk size={14} />, unit: '1 cup' },
                                                                                    { id: 'rice', label: 'Rice/Carbs', icon: <Zap size={14} />, unit: '1/2 cup' },
                                                                                    { id: 'meat', label: 'Meat/Protein', icon: <Beef size={14} />, unit: '30-40g' },
                                                                                    { id: 'fat', label: 'Fat/Oil', icon: <Droplets size={14} />, unit: '1 tsp' }
                                                                                ].map(item => (
                                                                                    <tr key={item.id} className="border-b-2 border-[var(--color-divider)] last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors group">
                                                                                        <td className="p-4 border-r-2 border-[var(--color-divider)] sticky left-0 bg-white dark:bg-[#1a1a1a] z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="p-2 bg-[var(--color-bg-page)] rounded-xl text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                                                                                    {item.icon}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <div className="text-[11px] font-black text-[var(--color-text-main)] uppercase tracking-tight">{item.label}</div>
                                                                                                    <div className="text-[9px] font-bold text-[var(--color-text-muted)] mt-0.5 opacity-60">1 serving = {item.unit}</div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </td>
                                                                                        {['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner'].map(meal => (
                                                                                            <td key={meal} className="p-4 border-r-2 border-[var(--color-divider)] last:border-r-0 relative">
                                                                                                <AutocompleteMatrixCell
                                                                                                    value={portionMatrix.find(r => r.meal_type === meal)?.[item.id]}
                                                                                                    onChange={(val) => updatePortionCell(meal, item.id, val)}
                                                                                                    item={item}
                                                                                                />
                                                                                            </td>
                                                                                        ))}
                                                                                    </tr>
                                                                                ))}
                                                                                {/* Special Row for Sugar — plain clinical text note, NOT connected to rule engine */}
                                                                                <tr className="bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                                                                                    <td className="p-4 border-r-2 border-amber-200 dark:border-amber-800/30 sticky left-0 bg-amber-50 dark:bg-amber-900/10 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-xl text-amber-500">
                                                                                                <AlertCircle size={14} />
                                                                                            </div>
                                                                                            <div>
                                                                                                <div className="text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-tight">Sugar / Clinical Note</div>
                                                                                                <div className="text-[9px] font-bold text-amber-600/70 dark:text-amber-400/60 mt-0.5">Text only · no rule engine</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td colSpan="5" className="p-3 border-t border-amber-100 dark:border-amber-800/20">
                                                                                        <textarea
                                                                                            rows={2}
                                                                                            className="w-full bg-transparent border-0 text-sm font-bold text-amber-900 dark:text-amber-200 focus:ring-0 placeholder:text-amber-700/30 dark:placeholder:text-amber-300/30 italic resize-none overflow-y-auto scrollbar-hide py-2"
                                                                                            placeholder="e.g. Limit intake of sugar, sugary products and sweetened beverages"
                                                                                            value={portionMatrix.find(r => r.meal_type === 'Breakfast')?.sugar || ''}
                                                                                            onChange={(e) => {
                                                                                                updatePortionCell('Breakfast', 'sugar', e.target.value);
                                                                                            }}
                                                                                        />
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>

                                                                {/* MOBILE MEAL CARDS */}
                                                                <div className="block lg:hidden space-y-4">
                                                                    {['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner'].map(meal => (
                                                                        <div key={meal} className="bg-white dark:bg-white/5 rounded-[1.5rem] border-2 border-[var(--color-divider)] overflow-hidden shadow-sm">
                                                                            <div className="bg-[var(--color-bg-page)] p-3 border-b-2 border-[var(--color-divider)] text-center shadow-inner">
                                                                                <span className="font-black text-[var(--color-primary)] uppercase tracking-widest text-[11px]">{meal}</span>
                                                                            </div>
                                                                            <div className="divide-y-2 divide-[var(--color-divider)]">
                                                                                {[
                                                                                    { id: 'vegetables', label: 'Vegetables', icon: <Leaf size={14} />, unit: '1/2 cup' },
                                                                                    { id: 'fruit', label: 'Fruit', icon: <Apple size={14} />, unit: '1 pc/slice' },
                                                                                    { id: 'milk', label: 'Milk', icon: <Milk size={14} />, unit: '1 cup' },
                                                                                    { id: 'rice', label: 'Rice/Carbs', icon: <Zap size={14} />, unit: '1/2 cup' },
                                                                                    { id: 'meat', label: 'Meat/Protein', icon: <Beef size={14} />, unit: '30-40g' },
                                                                                    { id: 'fat', label: 'Fat/Oil', icon: <Droplets size={14} />, unit: '1 tsp' }
                                                                                ].map(item => (
                                                                                    <div key={item.id} className="flex items-stretch bg-white dark:bg-[#1a1a1a]">
                                                                                        <div className="flex items-center gap-2 p-3 w-1/2 border-r-2 border-[var(--color-divider)]">
                                                                                            <div className="p-1.5 bg-[var(--color-bg-page)] rounded-lg text-[var(--color-primary)] shrink-0">
                                                                                                {item.icon}
                                                                                            </div>
                                                                                            <div className="min-w-0">
                                                                                                <div className="text-[10px] font-black text-[var(--color-text-main)] uppercase tracking-tight truncate">{item.label}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="w-1/2 relative bg-[var(--color-bg-page)]/30">
                                                                                            <AutocompleteMatrixCell
                                                                                                value={portionMatrix.find(r => r.meal_type === meal)?.[item.id]}
                                                                                                onChange={(val) => updatePortionCell(meal, item.id, val)}
                                                                                                item={item}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {/* Mobile Sugar / Clinical Note Card — plain text only, NOT connected to rule engine */}
                                                                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[1.5rem] border-2 border-amber-200 dark:border-amber-800/30 overflow-hidden shadow-sm">
                                                                        <div className="p-3 border-b-2 border-amber-200 dark:border-amber-800/30 flex items-center justify-center gap-2">
                                                                            <AlertCircle size={14} className="text-amber-500" />
                                                                            <div className="text-center">
                                                                                <h4 className="font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest text-[11px]">Sugar / Clinical Note</h4>
                                                                                <p className="text-[9px] font-bold text-amber-600/60 dark:text-amber-400/50 mt-0.5">Text only · displayed as warning to parents</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-1">
                                                                            <textarea
                                                                                rows={2}
                                                                                className="w-full bg-transparent border-0 p-3 text-sm font-bold text-amber-900 dark:text-amber-100 focus:ring-0 outline-none placeholder:text-amber-700/40 resize-none"
                                                                                placeholder="e.g. Limit intake of sugar, sugary products..."
                                                                                value={portionMatrix.find(r => r.meal_type === 'Breakfast')?.sugar || ''}
                                                                                onChange={(e) => updatePortionCell('Breakfast', 'sugar', e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* EXCHANGE GUIDE TOOLTIP */}
                                                            <div className="p-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-800/30">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-2xl text-blue-600 dark:text-blue-400">
                                                                        <Info size={24} />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-black text-blue-800 dark:text-blue-300 uppercase tracking-[0.2em] text-xs mb-2">Standard Exchange Guide</h4>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Vegetables</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 1/2 cup cooked OR 1 cup raw</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Rice & Carbs</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 1/2 cup rice OR 1.5 slices bread</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Milk</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 1 cup (250 mL) low fat milk</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Meat/Protein</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 30-40g (Size of a matchbox)</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Fruit</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 1 medium pc OR 1 slice (40-60g)</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-widest block">Fat & Oil</span>
                                                                                <p className="text-[11px] font-bold text-blue-800/70 dark:text-blue-400/70 leading-relaxed">1 serving = 1 tsp (5 mL) vegetable oil</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Final Closing of Tab Content Container */}
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

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
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsGrowthModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="flex-1">Update Growth</Button>
                        </div>
                    </form>
                </Modal>

                {/* EDIT GROWTH MODAL */}
                <Modal
                    isOpen={isEditGrowthModalOpen}
                    onClose={() => setIsEditGrowthModalOpen(false)}
                    title="Edit Growth Record"
                >
                    <form onSubmit={handleUpdateGrowthLog} className="space-y-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex gap-3">
                            <Info className="text-blue-500 shrink-0" size={20} />
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                                Correcting historical data will automatically recalculate clinical percentiles and Z-scores for this date.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 px-1">Recorded Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
                                    <input
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        required
                                        value={editGrowthForm.logged_at}
                                        onChange={(e) => setEditGrowthForm({ ...editGrowthForm, logged_at: e.target.value })}
                                        className="w-full pl-12 pr-4 h-12 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 px-1">Height (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        placeholder="e.g. 110.5"
                                        value={editGrowthForm.height_cm}
                                        onChange={(e) => setEditGrowthForm({ ...editGrowthForm, height_cm: e.target.value })}
                                        className="w-full px-4 h-12 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 px-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        placeholder="e.g. 18.2"
                                        value={editGrowthForm.weight_kg}
                                        onChange={(e) => setEditGrowthForm({ ...editGrowthForm, weight_kg: e.target.value })}
                                        className="w-full px-4 h-12 bg-[var(--color-bg-page)] border-2 border-[var(--color-divider)] rounded-2xl focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditGrowthModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="flex-1 bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20">Save Changes</Button>
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
                        fetchAllClientPending();
                        setIsReviewOpen(false);
                        showNotif("Meal log verified and clinical status updated", "success");
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
                        <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] overflow-hidden">
                            <div className="overflow-x-auto">
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
                        </div>
                        <Button variant="outline" className="w-full font-black uppercase text-[10px] py-4 rounded-2xl" onClick={() => setIsVelocityModalOpen(false)}>Close Ledger</Button>
                    </div>
                </Modal>


                <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Save Portion Template">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Template Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)]"
                                placeholder="e.g. 1500 kcal Diabetic Plan"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90" onClick={handleSaveTemplate}>Save Template</Button>
                        </div>
                    </div>
                </Modal>

                <ConfirmDialog
                    isOpen={!!templateToDelete}
                    title="Delete Template"
                    message={`Are you sure you want to delete the template "${templateToDelete?.template_name}"?`}
                    onConfirm={executeDeleteTemplate}
                    onCancel={() => setTemplateToDelete(null)}
                />

                {/* Edit Meal Modal */}
                {editingMeal && (
                    <Modal
                        isOpen={isMealEditModalOpen}
                        onClose={() => setIsMealEditModalOpen(false)}
                        title="Edit Meal Plan Entry"
                    >
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Recipe Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                    value={editingMeal.recipe_name}
                                    onChange={(e) => setEditingMeal(prev => ({ ...prev, recipe_name: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Meal Type</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingMeal.meal_type}
                                        onChange={(e) => setEditingMeal(prev => ({ ...prev, meal_type: e.target.value }))}
                                    >
                                        <option value="Breakfast">Breakfast</option>
                                        <option value="Lunch">Lunch</option>
                                        <option value="Dinner">Dinner</option>
                                        <option value="Snack">Snack</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Calories (kcal)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingMeal.calories}
                                        onChange={(e) => setEditingMeal(prev => ({ ...prev, calories: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Protein (g)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingMeal.protein_g}
                                        onChange={(e) => setEditingMeal(prev => ({ ...prev, protein_g: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Carbs (g)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingMeal.carbs_g}
                                        onChange={(e) => setEditingMeal(prev => ({ ...prev, carbs_g: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Fats (g)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingMeal.fats_g}
                                        onChange={(e) => setEditingMeal(prev => ({ ...prev, fats_g: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 border-t border-[var(--color-divider)] pt-4">
                                <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs font-black uppercase tracking-wider" onClick={() => setIsMealEditModalOpen(false)}>Cancel</Button>
                                <Button className="flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-xl h-11 text-xs font-black uppercase tracking-wider" onClick={handleSaveEditedMeal}>Save Changes</Button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Save Week as Template Modal */}
                <Modal
                    isOpen={isSaveTemplateModalOpen}
                    onClose={() => setIsSaveTemplateModalOpen(false)}
                    title="Save Week as Template"
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Template Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                placeholder="e.g. Active Toddler Summer Plan"
                                value={newTemplateForm.name}
                                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Target Age Group</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                placeholder="e.g. 1-2 years"
                                value={newTemplateForm.target_age}
                                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, target_age: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Description</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all min-h-[80px]"
                                placeholder="Describe the focus or dietary rules for this weekly plan..."
                                value={newTemplateForm.description}
                                onChange={(e) => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="flex gap-3 border-t border-[var(--color-divider)] pt-4">
                            <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs font-black uppercase tracking-wider" onClick={() => setIsSaveTemplateModalOpen(false)}>Cancel</Button>
                            <Button className="flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-xl h-11 text-xs font-black uppercase tracking-wider" onClick={handleSaveWeekAsTemplate}>Save Template</Button>
                        </div>
                    </div>
                </Modal>

                {/* Template Editor Modal */}
                {editingTemplate && (
                    <Modal
                        isOpen={isTemplateEditorOpen}
                        onClose={() => setIsTemplateEditorOpen(false)}
                        title={`Edit Template: ${editingTemplate.name}`}
                        maxWidth="max-w-[96vw] 2xl:max-w-[1600px]"
                    >
                        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--color-bg-page)]/50 rounded-2xl border border-[var(--color-divider)]">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Template Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        value={editingTemplate.name}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Target Age Group</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        placeholder="e.g. 1-2 years"
                                        value={editingTemplate.target_age || ''}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, target_age: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border-2 border-[var(--color-divider)] bg-white dark:bg-white/5 text-sm font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all"
                                        placeholder="Brief description"
                                        value={editingTemplate.description || ''}
                                        onChange={(e) => setEditingTemplate(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto border-2 border-[var(--color-divider)] rounded-2xl bg-white dark:bg-[#1a1a1a]">
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-[var(--color-bg-page)] border-b-2 border-[var(--color-divider)]">
                                            <th className="p-3 text-left text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider w-28">Type</th>
                                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                                <th key={day} className="p-3 text-left text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">{day}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-divider)]">
                                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                                            <tr key={type} className="hover:bg-[var(--color-primary)]/5 transition-colors">
                                                <td className="p-3 font-black text-[10px] text-[var(--color-secondary)] uppercase tracking-widest bg-[var(--color-bg-page)]/20 border-r border-[var(--color-divider)]">
                                                    {type}
                                                </td>
                                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                                                    if (!editingTemplate.days) editingTemplate.days = {};
                                                    if (!editingTemplate.days[day]) editingTemplate.days[day] = [];
                                                    let meal = editingTemplate.days[day].find(m => m.meal_type === type);
                                                    if (!meal) {
                                                        meal = { meal_type: type, recipe_name: '', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
                                                        editingTemplate.days[day].push(meal);
                                                    }
                                                    return (
                                                        <td key={day} className="p-2 border-r border-[var(--color-divider)] last:border-r-0 align-top">
                                                            <div className="space-y-1.5">
                                                                <input
                                                                    type="text"
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-divider)] bg-white dark:bg-white/5 text-[11px] font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all placeholder:opacity-30"
                                                                    placeholder="Recipe Name"
                                                                    value={meal.recipe_name || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditingTemplate(prev => {
                                                                            const updated = { ...prev };
                                                                            const target = updated.days[day].find(m => m.meal_type === type);
                                                                            target.recipe_name = val;
                                                                            return updated;
                                                                        });
                                                                    }}
                                                                />
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-1.5 pr-4 py-1 rounded-md border border-[var(--color-divider)] bg-white dark:bg-white/5 text-[9px] font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder="Kcal"
                                                                            value={meal.calories === 0 || meal.calories === null ? '' : meal.calories}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                                                setEditingTemplate(prev => {
                                                                                    const updated = { ...prev };
                                                                                    const target = updated.days[day].find(m => m.meal_type === type);
                                                                                    target.calories = val;
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-1 text-[7px] text-[var(--color-text-muted)] font-black uppercase pointer-events-none">cal</span>
                                                                    </div>
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-1.5 pr-3 py-1 rounded-md border border-[var(--color-divider)] bg-white dark:bg-white/5 text-[9px] font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder="Pro"
                                                                            value={meal.protein_g === 0 || meal.protein_g === null ? '' : meal.protein_g}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                                                setEditingTemplate(prev => {
                                                                                    const updated = { ...prev };
                                                                                    const target = updated.days[day].find(m => m.meal_type === type);
                                                                                    target.protein_g = val;
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-1 text-[7px] text-[var(--color-text-muted)] font-black uppercase pointer-events-none">p</span>
                                                                    </div>
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-1.5 pr-3 py-1 rounded-md border border-[var(--color-divider)] bg-white dark:bg-white/5 text-[9px] font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder="Carb"
                                                                            value={meal.carbs_g === 0 || meal.carbs_g === null ? '' : meal.carbs_g}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                                                setEditingTemplate(prev => {
                                                                                    const updated = { ...prev };
                                                                                    const target = updated.days[day].find(m => m.meal_type === type);
                                                                                    target.carbs_g = val;
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-1 text-[7px] text-[var(--color-text-muted)] font-black uppercase pointer-events-none">c</span>
                                                                    </div>
                                                                    <div className="relative flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            className="w-full pl-1.5 pr-3 py-1 rounded-md border border-[var(--color-divider)] bg-white dark:bg-white/5 text-[9px] font-bold text-[var(--color-text-main)] focus:border-[var(--color-primary)] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                            placeholder="Fat"
                                                                            value={meal.fats_g === 0 || meal.fats_g === null ? '' : meal.fats_g}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                                                setEditingTemplate(prev => {
                                                                                    const updated = { ...prev };
                                                                                    const target = updated.days[day].find(m => m.meal_type === type);
                                                                                    target.fats_g = val;
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="absolute right-1 text-[7px] text-[var(--color-text-muted)] font-black uppercase pointer-events-none">f</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-[var(--color-divider)] pt-4">
                                <Button variant="outline" className="px-6 h-11 rounded-xl text-xs font-black uppercase tracking-wider" onClick={() => setIsTemplateEditorOpen(false)}>Cancel</Button>
                                <Button className="px-6 h-11 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-xl text-xs font-black uppercase tracking-wider" onClick={handleSaveEditedTemplate}>Save Template</Button>
                            </div>
                        </div>
                    </Modal>
                )}

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
        </div>
    );
}
