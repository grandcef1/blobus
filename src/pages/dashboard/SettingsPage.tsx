// ARCHITECT: Страница настроек пользователя

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Moon, Volume2, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsPage() {
    const [notifications, setNotifications] = useState({
        dailyReminder: true,
        weeklyProgress: true,
        newFeatures: false,
        marketingEmails: false,
    });

    const [preferences, setPreferences] = useState({
        theme: 'dark',
        soundEffects: true,
        language: 'en',
        autoCorrection: true,
    });

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[#f0f0f5]">Settings</h1>
                    <p className="mt-1 text-[#f0f0f5]/50">
                        Manage your preferences and notifications
                    </p>
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <Bell className="size-6 text-[#f0f0f5]/60" />
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Notifications</h2>
                    </div>

                    <div className="space-y-4">
                        <SettingToggle
                            label="Daily reminders"
                            description="Get reminded to practice every day"
                            checked={notifications.dailyReminder}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, dailyReminder: checked })
                            }
                        />
                        <SettingToggle
                            label="Weekly progress reports"
                            description="Receive a summary of your weekly progress"
                            checked={notifications.weeklyProgress}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, weeklyProgress: checked })
                            }
                        />
                        <SettingToggle
                            label="New features"
                            description="Be notified when we launch new features"
                            checked={notifications.newFeatures}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, newFeatures: checked })
                            }
                        />
                        <SettingToggle
                            label="Marketing emails"
                            description="Receive tips and promotional offers"
                            checked={notifications.marketingEmails}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, marketingEmails: checked })
                            }
                        />
                    </div>
                </motion.div>

                {/* Preferences */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <Moon className="size-6 text-[#f0f0f5]/60" />
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Preferences</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-3">
                                <Moon className="size-5 text-[#f0f0f5]/50" />
                                <div>
                                    <p className="font-medium text-[#f0f0f5]">Theme</p>
                                    <p className="text-sm text-[#f0f0f5]/40">Choose your preferred theme</p>
                                </div>
                            </div>
                            <select
                                value={preferences.theme}
                                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="system">System</option>
                            </select>
                        </div>

                        <SettingToggle
                            label="Sound effects"
                            description="Play sounds for notifications and interactions"
                            icon={Volume2}
                            checked={preferences.soundEffects}
                            onChange={(checked) =>
                                setPreferences({ ...preferences, soundEffects: checked })
                            }
                        />

                        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-3">
                                <Globe className="size-5 text-[#f0f0f5]/50" />
                                <div>
                                    <p className="font-medium text-[#f0f0f5]">Language</p>
                                    <p className="text-sm text-[#f0f0f5]/40">Interface language</p>
                                </div>
                            </div>
                            <select
                                value={preferences.language}
                                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="en">English</option>
                                <option value="ru">Русский</option>
                                <option value="es">Español</option>
                            </select>
                        </div>

                        <SettingToggle
                            label="Auto-correction"
                            description="Automatically correct grammar mistakes in chat"
                            icon={Shield}
                            checked={preferences.autoCorrection}
                            onChange={(checked) =>
                                setPreferences({ ...preferences, autoCorrection: checked })
                            }
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Toggle Component
interface SettingToggleProps {
    label: string;
    description: string;
    icon?: typeof Bell;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function SettingToggle({
    label,
    description,
    icon: Icon,
    checked,
    onChange,
}: SettingToggleProps) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="size-5 text-[#f0f0f5]/50" />}
                <div>
                    <p className="font-medium text-[#f0f0f5]">{label}</p>
                    <p className="text-sm text-[#f0f0f5]/40">{description}</p>
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    checked ? 'bg-[#f0f0f5]' : 'bg-white/10'
                )}
            >
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={cn(
                        'absolute top-0.5 size-5 rounded-full bg-black',
                        checked ? 'left-[22px]' : 'left-0.5'
                    )}
                />
            </button>
        </div>
    );
}