/// <reference types="vite/client" />

declare module "*.css" {
    const content: string;
    export default content;
}

// ARCHITECT: переменные окружения объявлены явно: у ImportMetaEnv из vite/client есть index-сигнатура
// со значением any, и любое чтение import.meta.env.* проходило бы проверку типов молча (§5.3).
interface ImportMetaEnv {
    /** Публичный адрес сайта: canonical, og:url, sitemap. Фолбэк — https://blobus-ai.vercel.app */
    readonly VITE_SITE_URL?: string;
    /** Переключатель мок-API: строка "false" выключает моки, любое другое значение включает */
    readonly VITE_USE_MOCKS?: string;
    /** Приёмник отчётов об ошибках (first-party): пусто — канал выключен */
    readonly VITE_ERROR_LOG_ENDPOINT?: string;
    /** DSN Sentry: пусто — SDK не загружается. Публичный send-only ключ, не секрет. */
    readonly VITE_SENTRY_DSN?: string;
    // ARCHITECT: ключи ниже публичные (publishable-ключ Supabase и адрес проекта, не secret): они уходят в
    // браузер для PKCE-танца Google. Сужение этих же ключей в src/api/auth.ts остаётся совместимым и будет
    // убрано отдельной задачей.
    /** Режим входа: "real" — реальный /api/auth, любое другое значение — моки */
    readonly VITE_AUTH_MODE?: string;
    /** URL проекта Supabase: нужен браузеру только для PKCE-танца */
    readonly VITE_SUPABASE_URL?: string;
    /** Публикуемый ключ Supabase (никогда не секретный): нужен браузеру для PKCE-танца */
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
