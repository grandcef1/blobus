// ARCHITECT: Страница настроек пользователя.
// Полностью переведена на русский. Значение языка по умолчанию — 'ru'.

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
        language: 'ru',
        autoCorrection: true,
    });

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-3xl">
                {/* Шапка */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[#f0f0f5]">Настройки</h1>
                    <p className="mt-1 text-[#f0f0f5]/50">
                        Управляй своими предпочтениями и уведомлениями
                    </p>
                </motion.div>

                {/* Уведомления */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <Bell className="size-6 text-[#f0f0f5]/60" />
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Уведомления</h2>
                    </div>

                    <div className="space-y-4">
                        <SettingToggle
                            label="Ежедневные напоминания"
                            description="Получай напоминание заниматься каждый день"
                            checked={notifications.dailyReminder}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, dailyReminder: checked })
                            }
                        />
                        <SettingToggle
                            label="Еженедельные отчёты"
                            description="Получай сводку своего прогресса за неделю"
                            checked={notifications.weeklyProgress}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, weeklyProgress: checked })
                            }
                        />
                        <SettingToggle
                            label="Новые функции"
                            description="Узнавай первым о запуске новых возможностей"
                            checked={notifications.newFeatures}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, newFeatures: checked })
                            }
                        />
                        <SettingToggle
                            label="Маркетинговые письма"
                            description="Получай советы и специальные предложения"
                            checked={notifications.marketingEmails}
                            onChange={(checked) =>
                                setNotifications({ ...notifications, marketingEmails: checked })
                            }
                        />
                    </div>
                </motion.div>

                {/* Предпочтения */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <Moon className="size-6 text-[#f0f0f5]/60" />
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Предпочтения</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Тема */}
                        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-3">
                                <Moon className="size-5 text-[#f0f0f5]/50" />
                                <div>
                                    <p className="font-medium text-[#f0f0f5]">Тема</p>
                                    <p className="text-sm text-[#f0f0f5]/40">Выбери предпочитаемую тему</p>
                                </div>
                            </div>
                            <select
                                value={preferences.theme}
                                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                                aria-label="Выбор темы"
                                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="dark">Тёмная</option>
                                <option value="light">Светлая</option>
                                <option value="system">Системная</option>
                            </select>
                        </div>

                        {/* Звуковые эффекты */}
                        <SettingToggle
                            label="Звуковые эффекты"
                            description="Воспроизводить звуки при уведомлениях и действиях"
                            icon={Volume2}
                            checked={preferences.soundEffects}
                            onChange={(checked) =>
                                setPreferences({ ...preferences, soundEffects: checked })
                            }
                        />

                        {/* Язык */}
                        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-3">
                                <Globe className="size-5 text-[#f0f0f5]/50" />
                                <div>
                                    <p className="font-medium text-[#f0f0f5]">Язык</p>
                                    <p className="text-sm text-[#f0f0f5]/40">Язык интерфейса</p>
                                </div>
                            </div>
                            <select
                                value={preferences.language}
                                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                                aria-label="Выбор языка"
                                className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="ru">Русский</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                            </select>
                        </div>

                        {/* Автокоррекция */}
                        <SettingToggle
                            label="Автокоррекция"
                            description="Автоматически исправлять грамматические ошибки в чате"
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

// Компонент переключателя настройки
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
                type="button"
                onClick={() => onChange(!checked)}
                role="switch"
                aria-checked={checked}
                aria-label={label}
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