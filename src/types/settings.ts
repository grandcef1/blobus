// ARCHITECT: состояние настроек — общий тип формы и загрузчика: значения по умолчанию приходят от
// api/settings, поэтому страница описывает только разметку и обработчики.
// ARCHITECT: notifications, theme и language убраны: сервер хранит ровно два toggle (preferences в
// profiles.preferences), а язык живёт в store/language — дублирующие поля были бы мёртвыми.

export interface SettingsState {
    preferences: {
        soundEffects: boolean;
        autoCorrection: boolean;
    };
}
