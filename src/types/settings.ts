// ARCHITECT: состояние настроек — общий тип формы и загрузчика: значения по умолчанию приходят от
// api/settings, поэтому страница описывает только разметку и обработчики.
// ARCHITECT: notifications и theme убраны: сервер хранит ровно четыре preference-ключа (profiles.preferences),
// язык интерфейса живёт в store/language, а тариф приходит с сервера только на чтение (entitlements).

import type { LanguageCode } from "@/lib/i18n";

/** Тариф: назначает сервер (биллинг), клиент читает его, чтобы менять описание озвучки. */
export type Plan = "free" | "pro";

export interface SettingsState {
    preferences: {
        soundEffects: boolean;
        autoCorrection: boolean;
        /** Язык объяснений: независим от языка интерфейса. */
        explanationLocale: LanguageCode;
        /** Озвучивание ответов репетитора: доступно обоим тарифам. */
        voiceEnabled: boolean;
    };
    plan: Plan;
}
