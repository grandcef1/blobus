// ARCHITECT: гейт согласия для сторонних сервисов: пока consent.analytics === false или сборка не прод,
// компонент рендерит null — ни Sentry, ни Vercel Analytics не получают кода и не делают запросов.
// Согласие можно дать после загрузки: подписка на store включает сервисы без перезагрузки, отзыв — гасит.
// ARCHITECT: Vercel-компоненты подключены динамически (статический импорт клал бы их код в основной бандл
// до согласия). Оба трекают переходы SPA сами: README @vercel/analytics — «All page views are automatically
// tracked», у Speed Insights softNavs включён по умолчанию, поэтому ручной pageview дал бы дубли. Sentry
// живёт в отдельном чанке — его отсутствие в основном бандле видно по выводу сборки.

import { lazy, Suspense, useEffect } from "react";
import { SENTRY_DSN } from "@/lib/env";
import { sanitizeText, sanitizeUrl, setSentryTransport } from "@/lib/observability/report-error";
import type { SentryBreadcrumb, SentryEvent } from "@/lib/observability/sentry-client";
import { useConsentStore } from "@/store/consent";

const Analytics = lazy(() =>
    import("@vercel/analytics/react").then((module) => ({ default: module.Analytics }))
);

const SpeedInsights = lazy(() =>
    import("@vercel/speed-insights/react").then((module) => ({ default: module.SpeedInsights }))
);

type SentryClient = typeof import("@/lib/observability/sentry-client");

// ARCHITECT: перед отправкой событие чистится: почта, query и заголовки в Sentry не уходят.
function scrubEvent(event: SentryEvent): SentryEvent {
    return {
        ...event,
        message: event.message ? sanitizeText(event.message) : event.message,
        user: undefined,
        request: event.request
            ? {
                  ...event.request,
                  url: event.request.url ? sanitizeUrl(event.request.url) : event.request.url,
                  query_string: undefined,
                  headers: undefined,
                  cookies: undefined,
                  data: undefined,
              }
            : event.request,
        exception: event.exception
            ? {
                  ...event.exception,
                  values: event.exception.values?.map((entry) => ({
                      ...entry,
                      value: entry.value ? sanitizeText(entry.value) : entry.value,
                  })),
              }
            : event.exception,
    };
}

// ARCHITECT: из хлебных крошек остаются только навигация и ошибки: ui.input и console содержат
// пользовательский текст. Адреса навигации дополнительно теряют query.
const KEPT_BREADCRUMB_CATEGORIES = ["navigation", "exception"];

function keepBreadcrumb(breadcrumb: SentryBreadcrumb): SentryBreadcrumb | null {
    if (!breadcrumb.category || !KEPT_BREADCRUMB_CATEGORIES.includes(breadcrumb.category)) return null;
    if (!breadcrumb.data) return breadcrumb;

    const data: Record<string, unknown> = { ...breadcrumb.data };
    const from = data.from;
    const to = data.to;
    if (typeof from === "string") data.from = sanitizeUrl(from);
    if (typeof to === "string") data.to = sanitizeUrl(to);
    return { ...breadcrumb, data };
}

let sentryModule: SentryClient | null = null;

// ARCHITECT: Vercel-компоненты не удаляют внедрённые теги скриптов: при отзыве согласия снимаем их из DOM,
// иначе сбор продолжился бы до перезагрузки. shortcut: снимаются только эти два скрипта.
const VERCEL_SCRIPTS = 'script[src*="/insights/script.js"], script[src*="/speed-insights/script.js"]';

function removeVercelScripts(): void {
    document.querySelectorAll(VERCEL_SCRIPTS).forEach((node) => node.remove());
}

async function startSentry(): Promise<void> {
    const module = await import("@/lib/observability/sentry-client");
    module.init({
        dsn: SENTRY_DSN,
        environment: "production",
        // ARCHITECT: перф-трейсы не шлём: скорость даёт Speed Insights, а трейсы тратят квоту.
        tracesSampleRate: 0,
        // ARCHITECT: replay не используем — приватность и вес; нули фиксируют это явно.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // ARCHITECT: sendDefaultPii в v11 удалён — сбором управляет dataCollection. Перечисляем
        // отключённое явно: пользователь, cookie, заголовки, тела запросов, query, тексты ИИ.
        dataCollection: {
            userInfo: false,
            cookies: false,
            httpHeaders: false,
            httpBodies: [],
            urlQueryParams: false,
            databaseQueryData: false,
            genAI: { inputs: false, outputs: false },
        },
        beforeSend: scrubEvent,
        beforeBreadcrumb: keepBreadcrumb,
    });
    sentryModule = module;
    setSentryTransport((error) => module.captureException(error));
}

async function stopSentry(): Promise<void> {
    setSentryTransport(null);
    const module = sentryModule;
    sentryModule = null;
    if (module !== null) await module.close(2000);
}

export function Observability() {
    const analytics = useConsentStore((state) => state.analytics);
    const enabled = import.meta.env.PROD && analytics;

    useEffect(() => {
        if (!enabled) removeVercelScripts();
        return () => removeVercelScripts();
    }, [enabled]);

    useEffect(() => {
        if (!enabled || SENTRY_DSN === "") return;
        let cancelled = false;

        void startSentry()
            .then(() => {
                // ARCHITECT: согласие могли отозвать, пока грузился чанк SDK.
                if (cancelled) void stopSentry();
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            void stopSentry();
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <Suspense fallback={null}>
            <Analytics />
            <SpeedInsights />
        </Suspense>
    );
}
