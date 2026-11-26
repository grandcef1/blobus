// ARCHITECT: доменный роутер чтения словаря: свои строки public.vocabulary читаются пользовательским клиентом
// под RLS select-own, а userId берётся только из проверенного access-токена, никогда из клиента (§16.2, §16.5).
// ARCHITECT: ответ PostgREST разбирается Zod и не покидает модуль (§16.13): наружу уходит только DTO без
// user_id; озвучки, уровня освоения и примеров в схеме нет, поэтому контракт согласован без них.
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

// ARCHITECT: строгая схема читаемого набора колонок: границы совпадают с CHECK-ами схемы (term 1..120,
// translation <=240, context <=500). strictObject отклоняет лишние ключи — набор ровно тот, что мы выбрали.
const VocabularyRowSchema = z.strictObject({
    id: z.uuid(),
    user_id: z.uuid(),
    term: z.string().min(1).max(120),
    translation: z.string().max(240).nullable(),
    context: z.string().max(500).nullable(),
    source_lesson_id: z.uuid().nullable(),
    stage: z.number().int().min(1).max(5),
    next_due_at: z.string().min(1),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
});

const VocabularyListSchema = z.array(VocabularyRowSchema);

type VocabularyRow = z.infer<typeof VocabularyRowSchema>;

// ARCHITECT: тело создания — только слово и его необязательные поля: user_id и source_lesson_id приходят
// не от клиента, а лишние поля отклоняет strictObject (§16.6).
const CreateVocabularySchema = z.strictObject({
    term: z.string().trim().min(1).max(120),
    translation: z.string().max(240).nullable().optional(),
    context: z.string().max(500).nullable().optional(),
});

// ARCHITECT: код Postgres «нарушение уникальности»: unique (user_id, lower(term)) — повтор слова не ошибка.
const UNIQUE_VIOLATION = "23505";

// ARCHITECT: повторение по Лейтнеру: интервалы в днях 1/3/7/14/30, интервал берётся по достигнутому шагу —
// «помню» на первом шаге откладывает слово на 3 дня. Пятый шаг последний: закреплённое слово повторяется
// через 90 дней и дальше с лестницы не сходит.
export const REVIEW_INTERVAL_DAYS: readonly number[] = [1, 3, 7, 14, 30];
export const REVIEW_MAX_STAGE = 5;
export const PINNED_INTERVAL_DAYS = 90;
const FORGOTTEN_INTERVAL_DAYS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Исход повторения: «помню» двигает слово на следующий шаг, «забыл» возвращает на первый. */
export type ReviewOutcome = "remembered" | "forgotten";

/** Новый шаг Лейтнера и интервал до следующего показа. */
export interface ReviewStep {
    readonly stage: number;
    readonly intervalDays: number;
}

/** Чистая функция перехода: без БД и текущего времени, поэтому проверяется unit-тестом. */
export function computeNextReview(stage: number, outcome: ReviewOutcome): ReviewStep {
    if (!Number.isInteger(stage) || stage < 1 || stage > REVIEW_MAX_STAGE) {
        throw new Error(`stage вне диапазона 1..${REVIEW_MAX_STAGE}`);
    }

    if (outcome === "forgotten") {
        return { stage: 1, intervalDays: FORGOTTEN_INTERVAL_DAYS };
    }

    const nextStage = Math.min(stage + 1, REVIEW_MAX_STAGE);
    // ARCHITECT: закреплённое слово (шаг 5) остаётся на пятом шаге и уходит на 90 дней, а не на 30.
    const intervalDays =
        stage === REVIEW_MAX_STAGE ? PINNED_INTERVAL_DAYS : REVIEW_INTERVAL_DAYS[nextStage - 1];

    return { stage: nextStage, intervalDays };
}

// ARCHITECT: тело повторения — только исход карточки; шаг и дату считает сервер, поэтому подменить их
// с клиента нельзя (strictObject отклоняет лишние поля).
const ReviewVocabularySchema = z.strictObject({
    reviewed: z.enum(["remembered", "forgotten"]),
});

/** Ответ записи: user_id наружу не уходит, null остаётся null. */
interface VocabularyEntry {
    readonly id: string;
    readonly term: string;
    readonly translation: string | null;
    readonly context: string | null;
    readonly sourceLessonId: string | null;
    readonly stage: number;
    readonly nextDueAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

function toVocabularyEntry(row: VocabularyRow): VocabularyEntry {
    return {
        id: row.id,
        term: row.term,
        translation: row.translation,
        context: row.context,
        sourceLessonId: row.source_lesson_id,
        stage: row.stage,
        nextDueAt: row.next_due_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: limit 50 — защита от неограниченного чтения; порядок под существующий
// vocabulary_user_created (user_id, created_at desc, id desc).
const READ_LIMIT = 50;
// ARCHITECT: лимит записи 30 за 15 минут: добавление слова — ручное действие, но скрипт не должен
// забивать словарь тысячами строк через service-role.
const WRITE_WINDOW_MS = 15 * 60_000;
const WRITE_MAX = 30;
// ARCHITECT: лимит повторения отдельный от добавления: карточки нажимаются часто, поэтому окно 15 мин / 60.
const REVIEW_WINDOW_MS = 15 * 60_000;
const REVIEW_MAX_REQUESTS = 60;

export function createVocabularyRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "vocabulary:read",
    });
    const writeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: WRITE_WINDOW_MS,
        max: WRITE_MAX,
        scope: "vocabulary:create",
    });
    const reviewLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: REVIEW_WINDOW_MS,
        max: REVIEW_MAX_REQUESTS,
        scope: "vocabulary:review",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
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

        // ARCHITECT: чтение под RLS select-own; userId только из токена, eq user_id — defense in depth поверх
        // RLS, а query-параметры клиента (?userId/?id) не читаются вовсе.
        const { data, error } = await createUserClient(env, accessToken)
            .from("vocabulary")
            .select(
                "id, user_id, term, translation, context, source_lesson_id, stage, next_due_at, created_at, updated_at"
            )
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(READ_LIMIT);

        if (error !== null) throw error;

        const parsed = VocabularyListSchema.safeParse(data);

        if (!parsed.success) throw parsed.error;

        // ARCHITECT: null из БД остаётся null — пустая строка соврала бы, что перевода нет именно такого.
        const vocabulary = parsed.data.map((row) => ({
            id: row.id,
            term: row.term,
            translation: row.translation,
            context: row.context,
            sourceLessonId: row.source_lesson_id,
            stage: row.stage,
            nextDueAt: row.next_due_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        res.status(200).json({ vocabulary });
    });

    // ARCHITECT: POST — мутация: лимитер -> validateCsrf -> обработчик, как в auth.ts/sessions.ts.
    router.post("/", writeLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        const parsed = CreateVocabularySchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: запись делает service-role (у authenticated только SELECT): владение задаётся
        // проверенным userId, source_lesson_id пока null — слова из уроков придут в фазе C.
        const client = createServiceClient(env);
        const columns =
            "id, user_id, term, translation, context, source_lesson_id, stage, next_due_at, created_at, updated_at";
        const inserted = await client
            .from("vocabulary")
            .insert({
                user_id: payload.userId,
                term: parsed.data.term,
                translation: parsed.data.translation ?? null,
                context: parsed.data.context ?? null,
            })
            .select(columns)
            .single();

        if (inserted.error !== null) {
            // ARCHITECT: unique (user_id, lower(term)) — повтор слова не ошибка: отдаём существующую запись
            // 200 (§16.7). Метасимволы LIKE экранируются, иначе term с % или _ нашёл бы чужую строку.
            if (inserted.error.code !== UNIQUE_VIOLATION) throw inserted.error;

            const escaped = parsed.data.term.replace(/[\\%_]/g, "\\$&");
            const existing = await client
                .from("vocabulary")
                .select(columns)
                .eq("user_id", payload.userId)
                .ilike("term", escaped)
                .single();

            if (existing.error !== null) throw existing.error;

            const row = VocabularyRowSchema.safeParse(existing.data);

            if (!row.success) throw row.error;

            res.status(200).json({ entry: toVocabularyEntry(row.data) });
            return;
        }

        const row = VocabularyRowSchema.safeParse(inserted.data);

        if (!row.success) throw row.error;

        res.status(201).json({ entry: toVocabularyEntry(row.data) });
    });

    // ARCHITECT: PATCH — исход повторения карточки: лимитер -> validateCsrf -> обработчик. Чтение и запись
    // идут service-role, поэтому владение держится на сравнении user_id с проверенным userId из токена;
    // чужое слово отвечает 404 так же, как несуществующее, чтобы не подтверждать его наличие (§16.4).
    router.patch("/:id", reviewLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        const id = z.uuid().safeParse(req.params.id);
        const reviewed = ReviewVocabularySchema.safeParse(req.body);

        if (!id.success || !reviewed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const client = createServiceClient(env);
        const columns =
            "id, user_id, term, translation, context, source_lesson_id, stage, next_due_at, created_at, updated_at";
        const current = await client
            .from("vocabulary")
            .select(columns)
            .eq("id", id.data)
            .maybeSingle();

        if (current.error !== null) throw current.error;

        const row = VocabularyRowSchema.safeParse(current.data);

        // ARCHITECT: отсутствующая строка и чужая строка неразличимы снаружи — оба 404 без деталей.
        if (!row.success || row.data.user_id !== payload.userId) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const step = computeNextReview(row.data.stage, reviewed.data.reviewed);
        const nextDueAt = new Date(Date.now() + step.intervalDays * DAY_MS).toISOString();
        const updated = await client
            .from("vocabulary")
            .update({ stage: step.stage, next_due_at: nextDueAt })
            .eq("id", row.data.id)
            .eq("user_id", payload.userId)
            .select(columns)
            .single();

        if (updated.error !== null) throw updated.error;

        const saved = VocabularyRowSchema.safeParse(updated.data);

        if (!saved.success) throw saved.error;

        res.status(200).json({ entry: toVocabularyEntry(saved.data) });
    });

    return router;
}
