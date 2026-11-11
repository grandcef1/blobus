// ARCHITECT: Настройки — компактные, без иконок в заголовках,
// монохромные toggle'и

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingsState {
    notifications: {
        dailyReminder: boolean;
        weeklyProgress: boolean;
        newFeatures: boolean;
        marketingEmails: boolean;
    };
    preferences: {
        theme: "dark" | "light" | "system";
        soundEffects: boolean;
        language: "ru" | "en" | "es";
        autoCorrection: boolean;
    };
}

export function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState>({
        notifications: {
            dailyReminder: true,
            weeklyProgress: true,
            newFeatures: false,
            marketingEmails: false,
        },
        preferences: {
            theme: "dark",
            soundEffects: true,
            language: "ru",
            autoCorrection: true,
        },
    });

    const updateNotification = (key: keyof SettingsState["notifications"], value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value },
        }));
    };

    const updatePreference = (key: keyof SettingsState["preferences"], value: string | boolean) => {
        setSettings((prev) => ({
            ...prev,
            preferences: { ...prev.preferences, [key]: value },
        }));
    };

    return (
        <div className="min-h-screen bg-black p-4 md:p-6">
            <div className="mx-auto max-w-2xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Настройки</h1>
                </motion.header>

                <div className="space-y-4">
                    <div className="rounded-2xl bg-[#111113] p-5">
                        <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            Уведомления
                        </h2>
                        <div className="space-y-2">
                            <SettingToggle
                                label="Ежедневные напоминания"
                                description="Напоминание заниматься каждый день"
                                checked={settings.notifications.dailyReminder}
                                onChange={(checked) => updateNotification("dailyReminder", checked)}
                            />
                            <SettingToggle
                                label="Еженедельные отчёты"
                                description="Сводка прогресса за неделю"
                                checked={settings.notifications.weeklyProgress}
                                onChange={(checked) => updateNotification("weeklyProgress", checked)}
                            />
                            <SettingToggle
                                label="Новые функции"
                                description="Уведомления о запуске возможностей"
                                checked={settings.notifications.newFeatures}
                                onChange={(checked) => updateNotification("newFeatures", checked)}
                            />
                            <SettingToggle
                                label="Маркетинговые письма"
                                description="Советы и специальные предложения"
                                checked={settings.notifications.marketingEmails}
                                onChange={(checked) => updateNotification("marketingEmails", checked)}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            Предпочтения
                        </h2>
                        <div className="space-y-2">
                            <SettingSelect
                                label="Тема"
                                value={settings.preferences.theme}
                                onChange={(value) => updatePreference("theme", value)}
                                options={[
                                    { value: "dark", label: "Тёмная" },
                                    { value: "light", label: "Светлая" },
                                    { value: "system", label: "Системная" },
                                ]}
                            />
                            <SettingToggle
                                label="Звуковые эффекты"
                                description="Звуки при уведомлениях и действиях"
                                checked={settings.preferences.soundEffects}
                                onChange={(checked) => updatePreference("soundEffects", checked)}
                            />
                            <SettingSelect
                                label="Язык"
                                value={settings.preferences.language}
                                onChange={(value) => updatePreference("language", value)}
                                options={[
                                    { value: "ru", label: "Русский" },
                                    { value: "en", label: "English" },
                                    { value: "es", label: "Español" },
                                ]}
                            />
                            <SettingToggle
                                label="Автокоррекция"
                                description="Исправлять ошибки в чате автоматически"
                                checked={settings.preferences.autoCorrection}
                                onChange={(checked) => updatePreference("autoCorrection", checked)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SettingToggleProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
                <p className="mt-0.5 text-xs text-[#f0f0f5]/40">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={cn(
                    "relative ml-4 h-5 w-9 shrink-0 rounded-full transition-colors",
                    checked ? "bg-[#f0f0f5]" : "bg-[#1a1a1c]"
                )}
            >
                <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                        "absolute top-0.5 size-4 rounded-full",
                        checked ? "left-[18px] bg-black" : "left-0.5 bg-[#f0f0f5]/60"
                    )}
                />
            </button>
        </div>
    );
}

interface SettingSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

function SettingSelect({ label, value, onChange, options }: SettingSelectProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3">
            <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
                className="rounded-lg bg-[#1a1a1c] px-3 py-1.5 text-sm text-[#f0f0f5] focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}