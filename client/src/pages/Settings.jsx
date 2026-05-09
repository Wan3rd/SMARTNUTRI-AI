import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import Notification from '../components/common/Notification';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Bell, Shield, Smartphone, Scale, UserCog, HelpCircle, ChevronRight, Key } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function Settings() {
    const { user, updatePreferences } = useAuth();
    const { setTheme, theme } = useTheme();
    const [message, setMessage] = useState({ type: 'success', text: '' });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reason') === 'force_reset') {
            setShowPasswordModal(true);
            setMessage({
                type: 'error',
                text: 'Security Policy: An administrator has requested a mandatory password update for your account.'
            });
        }
    }, [location]);

    const handlePreferenceChange = async (key, value, customMessage) => {
        const res = await updatePreferences({ [key]: value });
        if (res.success) {
            setMessage({ type: 'success', text: customMessage || 'Preference updated and saved' });
        } else {
            setMessage({ type: 'error', text: 'Failed to sync preference with server' });
        }
    };

    const handleThemeChange = async (newTheme) => {
        setTheme(newTheme);
        await handlePreferenceChange('theme', newTheme, `Theme changed to ${newTheme} mode`);
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
                        <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-full p-1 border border-gray-200 dark:border-zinc-700">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${theme === 'light' ? 'bg-white shadow text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                aria-label="Light Mode"
                            >
                                <Sun size={18} />
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${theme === 'dark' ? 'bg-zinc-600 shadow text-blue-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                aria-label="Dark Mode"
                            >
                                <Moon size={18} />
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
                }
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
            },
            {
                title: "Notifications",
                icon: Bell,
                items: [
                    {
                        label: "Critical Compliance Alerts",
                        desc: "Immediate push/email for high sodium/sugar violations",
                        toggle: true,
                        active: true,
                        onToggle: () => setMessage({ type: 'success', text: 'Alert preferences updated (UI Only)' })
                    },
                    { label: "Meal Reminders", desc: "Receive alerts for meal times", toggle: true },
                    { label: "Weekly Progress Report", desc: "Get a summary every Sunday", toggle: true },
                    { label: "Tips & Education", desc: "Daily health facts", toggle: true }
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
                    { label: "Data Export", desc: "Download your nutrition data", type: "link" },
                    { label: "Delete Account", desc: "Permanently remove your data", type: "danger" }
                ] : []),
            ]
        }
    ];

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

            <Notification
                key={message.text}
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ ...message, text: '' })}
            />

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </div>
    );
}
