import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Bell, Shield, Smartphone, Scale, UserCog, HelpCircle, ChevronRight } from 'lucide-react';

export default function Settings() {
    const { setTheme, theme } = useTheme();

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
                                onClick={() => setTheme('light')}
                                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${theme === 'light' ? 'bg-white shadow text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                aria-label="Light Mode"
                            >
                                <Sun size={18} />
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 focus:outline-none ${theme === 'dark' ? 'bg-zinc-600 shadow text-blue-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                aria-label="Dark Mode"
                            >
                                <Moon size={18} />
                            </button>
                        </div>
                    )
                },
                { label: "Language", desc: "English (US)", type: "select" }
            ]
        },
        {
            title: "Nutrition & Units",
            icon: Scale,
            items: [
                { label: "Unit System", desc: "Metric (kg, cm)", toggle: true },
                { label: "Daily Calorie Goal", desc: "1,800 kcal", type: "link" },
                { label: "Dietary Restrictions", desc: "Peanut Allergy", type: "link" }
            ]
        },
        {
            title: "Notifications",
            icon: Bell,
            items: [
                { label: "Meal Reminders", desc: "Receive alerts for meal times", toggle: true },
                { label: "Weekly Progress Report", desc: "Get a summary every Sunday", toggle: true },
                { label: "Tips & Education", desc: "Daily health facts", toggle: true }
            ]
        },
        {
            title: "Account & Privacy",
            icon: Shield,
            items: [
                { label: "Change Password", type: "link" },
                { label: "Data Export", desc: "Download your nutrition data", type: "link" },
                { label: "Delete Account", desc: "Permanently remove your data", type: "danger" }
            ]
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Settings ⚙️</h1>
                <p className="text-[var(--color-text-muted)] mt-1">Manage app preferences and account details.</p>
            </div>

            {sections.map((section, idx) => (
                <Card key={idx}>
                    <CardHeader className="border-b border-[var(--color-divider)] pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <section.icon size={20} className="text-[var(--color-primary)]" />
                            {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {section.items.map((item, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b last:border-0 border-[var(--color-divider)]"
                            >
                                <div>
                                    <div className={`font-medium ${item.type === 'danger' ? 'text-red-500' : 'text-[var(--color-text-main)]'}`}>
                                        {item.label}
                                    </div>
                                    {item.desc && <div className="text-sm text-[var(--color-text-muted)]">{item.desc}</div>}
                                </div>

                                <div>
                                    {item.action ? (
                                        item.action
                                    ) : item.toggle ? (
                                        <div className="w-11 h-6 bg-[var(--color-primary)] rounded-full relative cursor-pointer">
                                            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm" />
                                        </div>
                                    ) : (
                                        <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <div className="text-center pt-8 text-sm text-[var(--color-text-muted)]">
                <p>SmartNutri-AI v1.0.0</p>
                <p>© 2026 SmartNutri Inc.</p>
            </div>
        </div>
    );
}
