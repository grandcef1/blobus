// ARCHITECT: Настройки — компактные, без иконок в заголовках, монохромные строки. Пять настроек (звук, язык
// интерфейса, язык объяснений, автокоррекция, озвучка) читаются и пишутся реальным API: источник правды —
// сервер, страница лишь показывает оптимистичное значение и откатывает его, если запрос не прошёл.
// ARCHITECT: язык интерфейса остаётся на store/language (сервер про него не знает), а язык объяснений и
// озвучка живут в preferences и уходят на сервер частичным патчем. Тариф приходит из ответа и меняет только
// описание озвучки: тумблер доступен обоим тарифам — free озвучивает голосом устройства.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchSettings, updateSettings } from "@/api/settings";
import type { SettingsPatch } from "@/api/settings";
import { ErrorState } from "@/components/shared/ErrorState";
import { SettingSelect } from "@/components/dashboard/SettingSelect";
import { SettingToggle } from "@/components/dashboard/SettingToggle";
import { SettingsSkeleton } from "@/components/dashboard/skeletons/SettingsSkeleton";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useLanguageStore } from "@/store/language";
import { toast } from "@/store/toast";
import type { SettingsState } from "@/types/settings";

const SETTINGS_KEY = ["settings"] as const;

// ARCHITECT: константы на модуле, а не в теле компонента: подписи языков одни и те же у языка интерфейса и
// языка объяснений, а описание озвучки выбирается по тарифу.
const LANGUAGE_OPTION_KEYS = {
    ru: "settings.preferences.language.ru",
    en: "settings.preferences.language.en",
    es: "settings.preferences.language.es",
} as const;

const VOICE_DESCRIPTION_KEYS = {
    free: "settings.preferences.voice.descriptionFree",
    pro: "settings.preferences.voice.descriptionPro",
} as const;

export function SettingsPage() {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const queryClient = useQueryClient();
    const currentLang = useLanguageStore((state) => state.lang);
    const setLanguage = useLanguageStore((state) => state.setLanguage);

    const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchSettings });

    // ARCHITECT: истёкшую сессию разбирает общий хук: один тост и один редирект на все запросы страницы.
    useAuthExpiry(query.error, query.isSuccess);

    const mutation = useMutation({
        mutationFn: updateSettings,
        // ARCHITECT: оптимистичный патч: меняется только присланное поле, а снимок возвращается при отказе —
        // при медленной сети интерфейс не ждёт ответа, но и не врёт при ошибке.
        onMutate: async (patch) => {
            await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
            const previous = queryClient.getQueryData<SettingsState>(SETTINGS_KEY);

            // ARCHITECT: патч накладывается на текущее состояние: тариф и незатронутые настройки целы.
            if (previous !== undefined) {
                queryClient.setQueryData<SettingsState>(SETTINGS_KEY, {
                    ...previous,
                    preferences: { ...previous.preferences, ...patch },
                });
            }

            return { previous };
        },
        onError: (error, _patch, context) => {
            if (context?.previous !== undefined) {
                queryClient.setQueryData(SETTINGS_KEY, context.previous);
            }

            // ARCHITECT: 401 разбирает useAuthExpiry — свой тост был бы вторым.
            if (!(error instanceof ApiError && error.statusCode === 401)) {
                toast.error(t("settings.error"));
            }
        },
        onSettled: () => {
            // ARCHITECT: после ответа кэш сверяется с сервером: оптимистичное значение могло разойтись.
            void queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
        },
    });

    if (query.isLoading) return <SettingsSkeleton />;

    if (query.isError || query.data === undefined) {
        return (
            <div className="min-h-screen bg-black p-4 md:p-6">
                <div className="mx-auto max-w-2xl">
                    <ErrorState
                        title={tCommon("states.error.title")}
                        description={tCommon("states.error.description")}
                        retryLabel={tCommon("states.error.reload")}
                        onRetry={() => void query.refetch()}
                    />
                </div>
            </div>
        );
    }

    const { preferences, plan } = query.data;
    // ARCHITECT: опции собираются один раз: обе строки языка показывают один и тот же список подписей.
    const languageOptions = SUPPORTED_LANGUAGES.map((code) => ({
        value: code,
        label: t(LANGUAGE_OPTION_KEYS[code]),
    }));
    const busy = mutation.isPending;

    const update = (patch: SettingsPatch): void => {
        // ARCHITECT: гард от параллельных: пока идёт мутация, второй клик игнорируется (§16.7).
        if (!busy) mutation.mutate(patch);
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
                            {t("settings.preferences.title")}
                        </h2>
                        <div className="space-y-2">
                            <SettingToggle
                                label={t("settings.preferences.soundEffects.label")}
                                description={t("settings.preferences.soundEffects.description")}
                                checked={preferences.soundEffects}
                                disabled={busy}
                                onChange={(checked) => update({ soundEffects: checked })}
                            />

                            <SettingSelect
                                label={t("settings.preferences.language.label")}
                                value={currentLang}
                                onChange={(value) => {
                                    const next = SUPPORTED_LANGUAGES.find((code) => code === value);
                                    if (next) setLanguage(next);
                                }}
                                options={languageOptions}
                            />

                            <SettingSelect
                                label={t("settings.preferences.explanationLanguage.label")}
                                value={preferences.explanationLocale}
                                onChange={(value) => {
                                    const next = SUPPORTED_LANGUAGES.find((code) => code === value);
                                    if (next) update({ explanationLocale: next });
                                }}
                                options={languageOptions}
                            />

                            <SettingToggle
                                label={t("settings.preferences.autoCorrection.label")}
                                description={t("settings.preferences.autoCorrection.description")}
                                checked={preferences.autoCorrection}
                                disabled={busy}
                                onChange={(checked) => update({ autoCorrection: checked })}
                            />

                            <SettingToggle
                                label={t("settings.preferences.voice.label")}
                                description={t(VOICE_DESCRIPTION_KEYS[plan])}
                                checked={preferences.voiceEnabled}
                                disabled={busy}
                                onChange={(checked) => update({ voiceEnabled: checked })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
