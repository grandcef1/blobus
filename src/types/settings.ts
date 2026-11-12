// ARCHITECT: состояние настроек — общий тип формы и загрузчика: значения по умолчанию приходят от
// api/settings, поэтому страница описывает только разметку и обработчики.

export interface SettingsState {
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