// ARCHITECT: Настройки — компактные, без иконок в заголовках, монохромные toggle'и.
// ARCHITECT: значения читаются через useMockQuery, поэтому скелетон страницы — настоящее ожидание
// загрузки. Форма заводится из ответа на рендере: setState в теле эффекта запрещён правилом
// react-hooks/set-state-in-effect, а сверка по ссылке не даёт заводить её повторно.

import { useState } from "react";
import { motion } from "framer-motion";
import { fetchSettings } from "@/api/settings";
import { useMockQuery } from "@/hooks/useMockQuery";
import { SettingSelect } from "@/components/dashboard/SettingSelect";
import { SettingToggle } from "@/components/dashboard/SettingToggle";
import { SettingsSkeleton } from "@/components/dashboard/skeletons/SettingsSkeleton";
import type { SettingsState } from "@/types/settings";

export function SettingsPage() {
    const { data, isLoading } = useMockQuery(fetchSettings);
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [seededFrom, setSeededFrom] = useState<SettingsState | null>(null);

    if (data !== null && seededFrom !== data) {
        setSeededFrom(data);
        setSettings(data);
    }

    if (isLoading || settings === null) return <SettingsSkeleton />;

    const updateNotification = (key: keyof SettingsState["notifications"], value: boolean) => {
        setSettings((previous) =>
            previous === null
                ? previous
                : { ...previous, notifications: { ...previous.notifications, [key]: value } }
        );
    };

    const updatePreference = (key: keyof SettingsState["preferences"], value: string | boolean) => {
        setSettings((previous) =>
            previous === null
                ? previous
                : { ...previous, preferences: { ...previous.preferences, [key]: value } }
        );
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
