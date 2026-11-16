// ARCHITECT: SDK подключается именованными импортами в отдельном модуле: динамический импорт
// namespace тянул в чанк ВСЕ экспорты пакета (rrweb/Replay, tracing, интеграции роутеров) —
// sideEffects:false у @sentry/* позволяет сборщику выбросить неиспользуемое, но только при статическом
// связывании имён.
// ARCHITECT: @sentry/browser вместо @sentry/react: React-интеграции SDK (ErrorBoundary, роутеры,
// profiler) не используются — свой ErrorBoundary уже есть.

import { captureException, close, init } from "@sentry/browser";

export { captureException, close, init };

// ARCHITECT: типы событий выводим из опций init, а не импортируем из @sentry/core: не тянем типы
// транзитивной зависимости в наш код.
type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

export type SentryEvent = Parameters<NonNullable<SentryOptions["beforeSend"]>>[0];
export type SentryBreadcrumb = Parameters<NonNullable<SentryOptions["beforeBreadcrumb"]>>[0];