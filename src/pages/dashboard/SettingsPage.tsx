// ARCHITECT: Настройки — компактные, без иконок в заголовках, монохромные toggle'и.
// ARCHITECT: значения читаются через useMockQuery, поэтому скелетон страницы — настоящее ожидание
// загрузки. Форма заводится из ответа на рендере: setState в теле эффекта запрещён правилом
// react-hooks/set-state-in-effect, а сверка по ссылке не даёт заводить её повторно.

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { fetchSettings } from "@/api/settings";
import { useMockQuery } from "@/hooks/useMockQuery";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";
import { SettingSelect } from "@/components/dashboard/SettingSelect";
import { SettingToggle } from "@/components/dashboard/SettingToggle";
import { SettingsSkeleton } from "@/components/dashboard/skeletons/SettingsSkeleton";
import type { SettingsState } from "@/types/settings";

export function SettingsPage() {
    const { t } = useTranslation("dashboard");
    // ARCHITECT: язык интерфейса управляется общим стором (как футер-переключатель), а не муляжом
    // настроек, поэтому смена сразу применяет переводы и сохраняется в localStorage.
    const currentLang = useLanguageStore((state) => state.lang);
    const setLanguage = useLanguageStore((state) => state.setLanguage);
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
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("settings.title")}</h1>
                </motion.header>

                <div className="space-y-4">
                    <div className="rounded-2xl bg-[#111113] p-5">
                        <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            {t("settings.notifications.title")}
                        </h2>
                        <div className="space-y-2">
                            <SettingToggle
                                label={t("settings.notifications.dailyReminder.label")}
                                description={t("settings.notifications.dailyReminder.description")}
                                checked={settings.notifications.dailyReminder}
                                onChange={(checked) => updateNotification("dailyReminder", checked)}
                            />
                            <SettingToggle
                                label={t("settings.notifications.weeklyProgress.label")}
                                description={t("settings.notifications.weeklyProgress.description")}
                                checked={settings.notifications.weeklyProgress}
                                onChange={(checked) => updateNotification("weeklyProgress", checked)}
                            />
                            <SettingToggle
                                label={t("settings.notifications.newFeatures.label")}
                                description={t("settings.notifications.newFeatures.description")}
                                checked={settings.notifications.newFeatures}
                                onChange={(checked) => updateNotification("newFeatures", checked)}
                            />
                            <SettingToggle
                                label={t("settings.notifications.marketingEmails.label")}
                                description={t("settings.notifications.marketingEmails.description")}
                                checked={settings.notifications.marketingEmails}
                                onChange={(checked) => updateNotification("marketingEmails", checked)}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            {t("settings.preferences.title")}
                        </h2>
                        <div className="space-y-2">
                            <SettingSelect
                                label={t("settings.preferences.theme.label")}
                                value={settings.preferences.theme}
                                onChange={(value) => updatePreference("theme", value)}
                                options={[
                                    { value: "dark", label: t("settings.preferences.theme.dark") },
                                    { value: "light", label: t("settings.preferences.theme.light") },
                                    { value: "system", label: t("settings.preferences.theme.system") },
                                ]}
                            />
                            <SettingToggle
                                label={t("settings.preferences.soundEffects.label")}
                                description={t("settings.preferences.soundEffects.description")}
                                checked={settings.preferences.soundEffects}
                                onChange={(checked) => updatePreference("soundEffects", checked)}
                            />
                            <SettingSelect
                                label={t("settings.preferences.language.label")}
                                value={currentLang}
                                onChange={(value) => {
                                    const next = SUPPORTED_LANGUAGES.find((code) => code === value);
                                    if (next) setLanguage(next);
                                }}
                                options={[
                                    { value: "ru", label: t("settings.preferences.language.ru") },
                                    { value: "en", label: t("settings.preferences.language.en") },
                                    { value: "es", label: t("settings.preferences.language.es") },
                                ]}
                            />
                            <SettingToggle
                                label={t("settings.preferences.autoCorrection.label")}
                                description={t("settings.preferences.autoCorrection.description")}
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
