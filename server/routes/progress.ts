// ARCHITECT: сводка прогресса для «Обзора»: личные данные (сессии, сообщения, слова, результат теста уровня)
// читаются пользовательским клиентом под RLS, а агрегаты по usage_counters — сервисным ключом: таблица закрыта
// от клиента, поэтому каждая такая выборка обязана нести .eq(user_id) (§16.2, §16.5).
// ARCHITECT: метрики без честного источника не выдумываются: минуты практики, достижения и прогресс по режимам
// в схеме не измеряются, поэтому DTO отдаёт только измеримое, а экран показывает ровно его.
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Уровень и балл теста: набор колонок ровно тот, что нужен DTO (§16.13). */
const PlacementRowSchema = z.strictObject({
    level: z.enum(LEVELS),
    score: z.number().int().min(0).max(100),
});

const SessionRowSchema = z.strictObject({
    id: z.uuid(),
    tutor_id: z.string().min(1).max(64),
    mode: z.string().min(1).max(32),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
});

/** Строка счётчиков дня: date — календарный день БД, счётчики — неотрицательные целые. */
const CounterRowSchema = z.strictObject({
    date: z.string().min(1),
    messages_used: z.number().int().min(0),
    lessons_used: z.number().int().min(0),
});

/** Сводка сессии: те же поля, что отдаёт GET /api/sessions — история чата и список читают один контракт. */
export interface ProgressSessionDto {
    readonly id: string;
    readonly tutorId: string;
    readonly mode: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** Активность одного дня недели: сообщения пользователя за календарный день сервера. */
export interface ProgressDayDto {
    readonly date: string;
    readonly messages: number;
}

/** Сводка прогресса: только измеримые значения, все — из своих строк пользователя. */
export interface ProgressDto {
    readonly level: (typeof LEVELS)[number] | null;
    readonly score: number | null;
    readonly sessionsTotal: number;
    readonly messagesTotal: number;
    readonly wordsTotal: number;
    readonly wordsDueToday: number;
    readonly streakDays: number;
    readonly weeklyActivity: readonly ProgressDayDto[];
    readonly recentSessions: readonly ProgressSessionDto[];
}

const WEEK_DAYS = 7;
const RECENT_SESSION_LIMIT = 5;
/** Сколько дней назад вообще смотрим: серия длиннее трёх месяцев практически не встречается. */
const COUNTER_LOOKBACK = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;

/** Календарная дата сервера: тот же формат, что у usage_counters.date (Postgres считает день в UTC). */
function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

/** Сдвиг календарного дня: арифметика идёт по UTC, поэтому переходы месяца и года не ломают серию. */
function shiftDate(iso: string, days: number): string {
    return toIsoDate(new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS));
}

/**
 * Дни подряд с активностью. Серия считается от сегодня или от вчера: вчерашняя активность ещё держит счётчик,
 * иначе он обнулялся бы каждую полночь до первого урока.
 */
export function countStreak(activeDates: ReadonlySet<string>, today: string): number {
    let cursor = activeDates.has(today) ? today : shiftDate(today, -1);

    if (!activeDates.has(cursor)) return 0;

    let days = 0;

    while (activeDates.has(cursor) && days < COUNTER_LOOKBACK) {
        days += 1;
        cursor = shiftDate(cursor, -1);
    }

    return days;
}

/** Ровно семь дней подряд, заканчивая сегодня: дни без строки счётчика остаются нулями, а не пропусками. */
export function weeklyActivity(
    counters: readonly { readonly date: string; readonly messages_used: number }[],
    today: string
): ProgressDayDto[] {
    const messagesByDate = new Map(counters.map((row) => [row.date, row.messages_used]));
    const days: ProgressDayDto[] = [];

    for (let offset = WEEK_DAYS - 1; offset >= 0; offset -= 1) {
        const date = shiftDate(today, -offset);

        days.push({ date, messages: messagesByDate.get(date) ?? 0 });
    }

    return days;
}

/** Сводка пользователя: чтения под RLS и один сервисный агрегат по счётчикам дней. */
export function createProgressRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    // ARCHITECT: лимит чтения первым middleware, как у остальных чтений: поток отсекается до Supabase.
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "progress:read",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи.
    const tokenCache = createInMemoryTokenCache();

    // ARCHITECT: GET — безопасный метод: смысла запроса чтение не меняет, поэтому CSRF не применяется (как /api/sessions).
    router.get("/", readLimiter, async (req: Request, res: Response) => {
        const accessToken = getCookie(req, COOKIE_NAMES.accessToken);

        if (accessToken === undefined) {
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        let payload;

        try {
            payload = await verifyAccessToken(env, accessToken, tokenCache);
        } catch {
            // ARCHITECT: просроченный, поддельный и чужой токен отвечают одинаково, без деталей (§16.4).
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        const user = createUserClient(env, accessToken);

        // ARCHITECT: актуальный результат — последний по времени: таблица хранит историю замеров, поэтому
        // читается order + limit 1, а лишние поля отсекает strictObject.
        const placement = await user
            .from("placement_results")
            .select("level, score")
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (placement.error !== null) throw placement.error;

        const placementRow =
            placement.data === null ? null : PlacementRowSchema.safeParse(placement.data);

        if (placementRow !== null && !placementRow.success) throw placementRow.error;

        const sessionsCount = await user
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", payload.userId);

        if (sessionsCount.error !== null) throw sessionsCount.error;

        const recent = await user
            .from("sessions")
            .select("id, tutor_id, mode, created_at, updated_at")
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(RECENT_SESSION_LIMIT);

        if (recent.error !== null) throw recent.error;

        const recentRows = z.array(SessionRowSchema).safeParse(recent.data);

        if (!recentRows.success) throw recentRows.error;

        const wordsTotal = await user
            .from("vocabulary")
            .select("id", { count: "exact", head: true })
            .eq("user_id", payload.userId);

        if (wordsTotal.error !== null) throw wordsTotal.error;

        // ARCHITECT: «к повтору сегодня» — срок показа уже наступил: та же граница, что у экрана повторения.
        const wordsDue = await user
            .from("vocabulary")
            .select("id", { count: "exact", head: true })
            .eq("user_id", payload.userId)
            .lte("next_due_at", new Date().toISOString());

        if (wordsDue.error !== null) throw wordsDue.error;

        // ARCHITECT: у сообщений нет user_id: свои считаются вложенным фильтром lessons → sessions. RLS
        // messages_select_own и так отдаёт только свои строки, поэтому вложенный фильтр — вторая линия.
        const messagesCount = await user
            .from("messages")
            .select("id, lessons!inner(session_id, sessions!inner(user_id))", {
                count: "exact",
                head: true,
            })
            .eq("lessons.sessions.user_id", payload.userId)
            .eq("role", "user");

        if (messagesCount.error !== null) throw messagesCount.error;

        // ARCHITECT: счётчики дней закрыты от клиента: агрегаты идут сервисным ключом, но всегда с .eq(user_id) —
        // без него выборка вернула бы чужие дни (§16.5).
        const counters = await createServiceClient(env)
            .from("usage_counters")
            .select("date, messages_used, lessons_used")
            .eq("user_id", payload.userId)
            .order("date", { ascending: false })
            .limit(COUNTER_LOOKBACK);

        if (counters.error !== null) throw counters.error;

        const counterRows = z.array(CounterRowSchema).safeParse(counters.data);

        if (!counterRows.success) throw counterRows.error;

        const today = toIsoDate(new Date());
        const activeDates = new Set(
            counterRows.data
                .filter((row) => row.messages_used > 0 || row.lessons_used > 0)
                .map((row) => row.date)
        );

        const progress: ProgressDto = {
            level: placementRow === null ? null : placementRow.data.level,
            score: placementRow === null ? null : placementRow.data.score,
            sessionsTotal: sessionsCount.count ?? 0,
            messagesTotal: messagesCount.count ?? 0,
            wordsTotal: wordsTotal.count ?? 0,
            wordsDueToday: wordsDue.count ?? 0,
            streakDays: countStreak(activeDates, today),
            weeklyActivity: weeklyActivity(counterRows.data, today),
            recentSessions: recentRows.data.map((row) => ({
                id: row.id,
                tutorId: row.tutor_id,
                mode: row.mode,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            })),
        };

        res.status(200).json({ progress });
    });

    return router;
}
