import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Bell, Shield, Smartphone, Scale, UserCog, HelpCircle, ChevronRight, Key } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeactivateAccountModal from '../components/DeactivateAccountModal';
import api from '../lib/api';
import MaintenanceModeModal from '../admin/components/MaintenanceModeModal';

export default function Settings() {
    const { user, updatePreferences } = useAuth();
    const { setTheme, theme } = useTheme();
    const { showNotification } = useNotification();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const location = useLocation();
    const [isPrinting, setIsPrinting] = useState(false);
    const [printData, setPrintData] = useState(null);

    useEffect(() => {
        if (isPrinting && printData) {
            const timer = setTimeout(() => {
                window.print();
                setIsPrinting(false);
                setPrintData(null);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isPrinting, printData]);

    useEffect(() => {
        const fetchHealth = async () => {
            if (user?.role === 'admin') {
                try {
                    const res = await api.get('/health');
                    setMaintenanceMode(res.data.maintenance ?? false);
                } catch (err) {
                    console.error("Failed to fetch system health");
                }
            }
        };
        fetchHealth();
    }, [user?.role]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reason') === 'force_reset') {
            setShowPasswordModal(true);
            showNotification('Security Policy: An administrator has requested a mandatory password update for your account.', 'error');
        }
    }, [location, showNotification]);

    const [isUpdating, setIsUpdating] = useState(false);

    const handlePreferenceChange = async (key, value, customMessage) => {
        setIsUpdating(true);
        try {
            const res = await updatePreferences({ [key]: value });
            if (res.success) {
                showNotification(customMessage || 'Preference updated and saved', 'success');
            } else {
                showNotification('Failed to sync preference with server', 'error');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleThemeChange = async (newTheme) => {
        if (isUpdating || theme === newTheme) return;
        setTheme(newTheme);
        await handlePreferenceChange('theme', newTheme, `Theme changed to ${newTheme} mode`);
    };

    const handleMaintenanceToggle = async () => {
        setShowMaintenanceModal(false);
        setMaintenanceLoading(true);
        try {
            const res = await api.patch('/admin/maintenance', { enabled: !maintenanceMode });
            setMaintenanceMode(res.data.maintenanceMode);
            showNotification(res.data.message, 'success');
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.message || 'Failed to toggle maintenance mode', 'error');
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const handleDataExport = async () => {
        try {
            showNotification('Compiling clinical data export, please wait...', 'success');
            const res = await api.get('/auth/export-data');
            
            let exportData = res.data;
            if (user?.research_anonymize) {
                const pId = user.id.substring(0, 4);
                const safeUser = {
                    ...exportData.data,
                    full_name: `Research_Parent_${pId}`,
                    email: `anonymized_${pId}@research.smartnutri.ai`,
                    phone: `[REDACTED]`,
                    profiles: exportData.data.profiles.map(profile => {
                        const cId = profile.id.substring(0, 4);
                        return {
                            ...profile,
                            child_name: `Subject_${cId}`,
                            date_of_birth: profile.date_of_birth ? `${profile.date_of_birth.split('-')[0]}-xx-xx` : null,
                            vaccinations: `[REDACTED]`,
                            medications: `[REDACTED]`,
                            daily_logs: profile.daily_logs.map(log => ({ ...log, notes: `[REDACTED]` })),
                            meal_logs: profile.meal_logs.map(log => ({ ...log, hidden_ingredients: `[REDACTED]` }))
                        };
                    })
                };
                exportData = {
                    ...exportData,
                    compliance_anonymized: true,
                    data: safeUser
                };
                showNotification('Data compiled with strict research de-identification!', 'success');
            }

            // Generate clean downloadable JSON blob
            const dataStr = JSON.stringify(exportData, null, 4);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `smartnutri_clinical_export_${user?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'caregiver'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            if (!user?.research_anonymize) {
                showNotification('Clinical history export downloaded successfully!', 'success');
            }
        } catch (err) {
            console.error("Export failed:", err);
            showNotification(err.response?.data?.message || 'Failed to export clinical data. Please try again.', 'error');
        }
    };

    const handlePrintSummary = async () => {
        try {
            showNotification('Compiling pediatrician medical summary report, please wait...', 'success');
            const res = await api.get('/auth/export-data');
            setPrintData(res.data.data);
            setIsPrinting(true);
        } catch (err) {
            console.error("Failed to compile print records:", err);
            showNotification(err.response?.data?.message || 'Failed to compile pediatrician report details.', 'error');
        }
    };

    const sections = [
        {
            title: "App Preferences",
            icon: Smartphone,
            items: [
                {
                    label: "Dark Mode",
                    desc: "Switch between light and dark themes",
                    action: (
                        <div className={`flex bg-gray-100 dark:bg-zinc-800 rounded-full p-1 border border-gray-200 dark:border-zinc-700 transition-opacity duration-300 ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <button
                                onClick={() => handleThemeChange('light')}
                                disabled={isUpdating}
                                className={`p-2 rounded-full transition-all duration-300 transform active:scale-95 focus:outline-none theme-button-hover ${theme === 'light' ? 'bg-white shadow text-yellow-500 scale-110 theme-button-active' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}`}
                                aria-label="Light Mode"
                            >
                                <Sun size={18} className="theme-icon-rotate" />
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                disabled={isUpdating}
                                className={`p-2 rounded-full transition-all duration-300 transform active:scale-95 focus:outline-none theme-button-hover ${theme === 'dark' ? 'bg-zinc-600 shadow text-blue-300 scale-110 theme-button-active' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}`}
                                aria-label="Dark Mode"
                            >
                                <Moon size={18} className="theme-icon-rotate" />
                            </button>
                        </div>
                    )
                },
                {
                    label: "Privacy Mode",
                    desc: "Blur patient names in shared environments",
                    toggle: true,
                    active: user?.privacy_mode,
                    onToggle: () => handlePreferenceChange('privacy_mode', !user?.privacy_mode, `Privacy mode ${!user?.privacy_mode ? 'enabled' : 'disabled'}`)
                },
                ...(user?.role !== 'admin' ? [
                    {
                        label: "Academic Research Mode",
                        desc: "Anonymize patient identity tags on exported data logs",
                        toggle: true,
                        active: user?.research_anonymize,
                        onToggle: () => handlePreferenceChange('research_anonymize', !user?.research_anonymize, `Research de-identification ${!user?.research_anonymize ? 'enabled' : 'disabled'}`)
                    }
                ] : [])
            ]
        },
        // Clinical sections hidden for Admins
        ...(user?.role !== 'admin' ? [
            {
                title: "Nutrition & Units",
                icon: Scale,
                items: [
                    {
                        label: "Unit System",
                        desc: user?.measurement_system === 'metric' ? "Metric (kg, cm)" : "Imperial (lbs, ft)",
                        action: (
                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-[var(--color-divider)]">
                                <button
                                    onClick={() => handlePreferenceChange('measurement_system', 'metric', 'Units updated to Metric')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.measurement_system === 'metric' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Metric
                                </button>
                                <button
                                    onClick={() => handlePreferenceChange('measurement_system', 'imperial', 'Units updated to Imperial')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.measurement_system === 'imperial' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Imperial
                                </button>
                            </div>
                        )
                    },
                    {
                        label: "Nutrient Precision",
                        desc: "Control decimal places for clinical data",
                        action: (
                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-[var(--color-divider)]">
                                <button
                                    onClick={() => handlePreferenceChange('nutrient_precision', 'whole', 'Precision set to Whole Numbers')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.nutrient_precision === 'whole' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Whole
                                </button>
                                <button
                                    onClick={() => handlePreferenceChange('nutrient_precision', 'decimal', 'Precision set to Decimals')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.nutrient_precision === 'decimal' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Decimal
                                </button>
                            </div>
                        )
                    }
                ]
            }
        ] : []),
        ...(user?.role === 'parent' ? [
            {
                title: "Notifications",
                icon: Bell,
                items: [
                    {
                        label: "Critical Compliance Alerts",
                        desc: "Immediate push/email for high sodium/sugar violations",
                        toggle: true,
                        active: user?.notif_compliance !== false,
                        onToggle: () => handlePreferenceChange('notif_compliance', user?.notif_compliance === false, `Critical Compliance Alerts ${user?.notif_compliance === false ? 'enabled' : 'disabled'}`)
                    },
                    {
                        label: "Meal Reminders",
                        desc: "Receive alerts for meal times",
                        toggle: true,
                        active: user?.notif_reminders !== false,
                        onToggle: () => handlePreferenceChange('notif_reminders', user?.notif_reminders === false, `Meal Reminders ${user?.notif_reminders === false ? 'enabled' : 'disabled'}`)
                    }
                ]
            }
        ] : []),
        {
            title: "Account & Privacy",
            icon: Shield,
            items: [
                {
                    label: "Change Password",
                    type: "link",
                    onClick: () => setShowPasswordModal(true)
                },
                ...(user?.role !== 'admin' ? [
                    {
                        label: "Data Export",
                        desc: "Download your nutrition data",
                        type: "link",
                        onClick: handleDataExport
                    },
                    ...(user?.role === 'parent' ? [
                        {
                            label: "Printable Medical Summary",
                            desc: "Download clinical report PDF for your pediatrician",
                            type: "link",
                            onClick: handlePrintSummary
                        }
                    ] : []),
                    { 
                        label: "Delete Account", 
                        desc: "Deactivate your account and clinical data", 
                        type: "danger",
                        onClick: () => setShowDeactivateModal(true)
                    }
                ] : []),
            ]
        },
        ...(user?.role === 'admin' ? [
            {
                title: "System Administration",
                icon: Shield,
                items: [
                    {
                        label: "Maintenance Mode",
                        desc: "Enable to instantly block all non-admin traffic. Use only during emergencies or upgrades.",
                        action: (
                            <button
                                onClick={() => setShowMaintenanceModal(true)}
                                disabled={maintenanceLoading}
                                className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${maintenanceMode ? 'bg-rose-500 shadow-rose-500/30' : 'bg-gray-300 dark:bg-zinc-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${maintenanceMode ? 'right-1 scale-110' : 'left-1'}`} />
                            </button>
                        )
                    }
                ]
            }
        ] : [])
    ];

    if (isPrinting && printData) {
        const child = printData.profiles?.[0];
        return (
            <div className="bg-white text-zinc-900 p-8 max-w-4xl mx-auto space-y-6 font-sans print:p-0 leading-relaxed min-h-screen">
                {/* Header */}
                <div className="border-b-4 border-emerald-600 pb-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-emerald-800 uppercase">SMARTNUTRI-AI</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Clinical-Grade Pediatric Nutrition Station</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-zinc-800 uppercase tracking-wider">PEDIATRIC HEALTH RECORD</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Generated: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Patient Information Grid */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 sm:p-5">
                    <h2 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-3">Patient & Guardian Vitals</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Caregiver Name</span>
                            <span className="font-black text-zinc-800 uppercase">{printData.full_name}</span>
                        </div>
                        <div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Patient Name</span>
                            <span className="font-black text-zinc-800 uppercase">{child?.child_name || "No active child profile"}</span>
                        </div>
                        <div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Gender / DOB</span>
                            <span className="font-black text-zinc-800 uppercase">
                                {child?.gender || "N/A"} • {child?.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : "N/A"}
                            </span>
                        </div>
                        <div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Allergen Overrides</span>
                            <span className="font-black text-red-600 uppercase">
                                {child?.allergies?.join(', ') || "None"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Clinical Growth Logs */}
                {child?.growth_logs && child.growth_logs.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="text-sm font-black uppercase text-zinc-700 tracking-wider flex items-center gap-2 border-b border-zinc-200 pb-1">
                            Growth Tracker History
                        </h2>
                        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                            <table className="w-full text-left text-xs min-w-[500px]">
                                <thead>
                                    <tr className="bg-zinc-50 font-bold text-zinc-500 border-b border-zinc-200 uppercase tracking-tight">
                                        <th className="p-3">Log Date</th>
                                        <th className="p-3">Weight (kg)</th>
                                        <th className="p-3">Height (cm)</th>
                                        <th className="p-3">BMI Vitals</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {child.growth_logs.map((log, index) => {
                                        const bmi = (log.weight_kg / Math.pow(log.height_cm / 100, 2)).toFixed(1);
                                        return (
                                            <tr key={index} className="text-zinc-700 border-b border-zinc-100 last:border-0">
                                                <td className="p-3 font-medium">{new Date(log.logged_at).toLocaleDateString()}</td>
                                                <td className="p-3 font-black">{log.weight_kg} kg</td>
                                                <td className="p-3 font-black">{log.height_cm} cm</td>
                                                <td className="p-3 font-bold uppercase">{bmi} (Pediatric)</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-400 text-xs italic border border-dashed border-zinc-200 rounded-xl p-4 text-center">
                        No child growth history recorded.
                    </div>
                )}

                {/* Meal Logs Adherence Logs */}
                {child?.meal_logs && child.meal_logs.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="text-sm font-black uppercase text-zinc-700 tracking-wider flex items-center gap-2 border-b border-zinc-200 pb-1">
                            Meal Intakes & Adherence Audit
                        </h2>
                        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                            <table className="w-full text-left text-[10px] min-w-[650px]">
                                <thead>
                                    <tr className="bg-zinc-50 font-bold text-zinc-500 border-b border-zinc-200 uppercase tracking-tight">
                                        <th className="p-3">Logged Date</th>
                                        <th className="p-3">Category</th>
                                        <th className="p-3">Nutrients (kcal/Protein/Sugar/Sodium)</th>
                                        <th className="p-3 text-center">Score</th>
                                        <th className="p-3">Compliance Alerts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {child.meal_logs.slice(0, 8).map((log, index) => (
                                        <tr key={index} className="text-zinc-700 border-b border-zinc-100 last:border-0">
                                            <td className="p-3 font-medium">{new Date(log.logged_at).toLocaleDateString()}</td>
                                            <td className="p-3 font-black uppercase text-emerald-700">{log.meal_category}</td>
                                            <td className="p-3 font-medium">
                                                {log.total_calories} kcal • {log.total_protein_g}g P • {log.total_sugar_g}g S • {log.total_sodium_mg}mg Na
                                            </td>
                                            <td className="p-3 font-black text-center text-sm">{log.compliance_score}%</td>
                                            <td className="p-3 font-bold uppercase text-red-600">
                                                {log.compliance_status === 'violation' ? 'HIGH SUGAR/SODIUM' : 'COMPLIANT'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-400 text-xs italic border border-dashed border-zinc-200 rounded-xl p-4 text-center">
                        No meal logs recorded.
                    </div>
                )}

                {/* ADIME Notes */}
                {child?.adime_notes && child.adime_notes.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="text-sm font-black uppercase text-zinc-700 tracking-wider flex items-center gap-2 border-b border-zinc-200 pb-1">
                            Practitioner ADIME Charts
                        </h2>
                        {child.adime_notes.slice(0, 2).map((note, index) => (
                            <div key={index} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 text-xs space-y-2">
                                <div className="flex justify-between border-b border-zinc-200 pb-1 mb-2 font-bold text-zinc-500 uppercase tracking-tight">
                                    <span>Registered Dietitian Assessment</span>
                                    <span>Logged: {new Date(note.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-bold text-zinc-400 uppercase tracking-tight">Assessment & Vitals</p>
                                        <p className="text-zinc-800 font-medium">{note.assessment || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-400 uppercase tracking-tight">Diagnosis & Inferences</p>
                                        <p className="text-zinc-800 font-medium">{note.diagnosis || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-200">
                                    <div>
                                        <p className="font-bold text-zinc-400 uppercase tracking-tight">Interventions</p>
                                        <p className="text-zinc-800 font-medium">{note.intervention || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-400 uppercase tracking-tight">Monitoring Charts</p>
                                        <p className="text-zinc-800 font-medium">{note.monitoring || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-400 uppercase tracking-tight">Evaluations</p>
                                        <p className="text-zinc-800 font-medium">{note.evaluation || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-zinc-400 text-xs italic border border-dashed border-zinc-200 rounded-xl p-4 text-center">
                        No dietitian ADIME progress clinical notes recorded.
                    </div>
                )}

                {/* Signatures */}
                <div className="pt-12 mt-12 border-t border-zinc-200 text-xs">
                    <div className="grid grid-cols-2 gap-12">
                        <div className="text-center space-y-12">
                            <div className="border-b border-zinc-400 mx-8"></div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Parent / Caregiver Signature</span>
                        </div>
                        <div className="text-center space-y-12">
                            <div className="border-b border-zinc-400 mx-8"></div>
                            <span className="font-bold text-zinc-400 block uppercase tracking-tight">Registered Dietitian (RND) Signature</span>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-8 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] opacity-80 border-t border-zinc-100">
                    <p>SmartNutri-AI v1.2.0 • HIPAA & DPA (RA 10173) Information Security Compliant Digest</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-20 px-4 sm:px-0">
            <div className="pt-2 sm:pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">Settings</h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">Manage app preferences and clinical configurations.</p>
            </div>

            {sections.map((section, idx) => (
                <Card key={idx} className="border-2 border-[var(--color-divider)] overflow-hidden shadow-sm rounded-2xl sm:rounded-3xl">
                    <CardHeader className="border-b border-[var(--color-divider)] p-4 sm:p-6 bg-gray-50/30 dark:bg-white/5">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black uppercase tracking-tight">
                            <section.icon size={20} className="text-[var(--color-primary)]" />
                            {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {section.items.map((item, i) => (
                            <div
                                key={i}
                                onClick={item.onClick}
                                className={`flex items-center justify-between p-4 sm:p-5 transition-all border-b last:border-0 border-[var(--color-divider)] ${item.onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''}`}
                            >
                                <div>
                                    <div className={`font-black uppercase text-xs sm:text-sm ${item.type === 'danger' ? 'text-red-500' : 'text-[var(--color-text-main)]'}`}>
                                        {item.label}
                                    </div>
                                    {item.desc && <div className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight mt-0.5">{item.desc}</div>}
                                </div>

                                <div>
                                    {item.action ? (
                                        item.action
                                    ) : item.toggle ? (
                                        <button
                                            onClick={item.onToggle}
                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${item.active ? 'bg-[var(--color-primary)]' : 'bg-gray-300 dark:bg-zinc-700'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${item.active ? 'right-1' : 'left-1 shadow-sm'}`} />
                                        </button>
                                    ) : (
                                        <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <div className="text-center pt-8 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] opacity-40">
                <p>SmartNutri-AI v1.2.0 • Clinical Engine</p>
                <p>© 2026 SmartNutri Inc.</p>
            </div>

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            <DeactivateAccountModal
                isOpen={showDeactivateModal}
                onClose={() => setShowDeactivateModal(false)}
            />

            <MaintenanceModeModal
                isOpen={showMaintenanceModal}
                onClose={() => setShowMaintenanceModal(false)}
                onConfirm={handleMaintenanceToggle}
                currentlyEnabled={maintenanceMode}
                isLoading={maintenanceLoading}
            />
        </div>
    );
}
