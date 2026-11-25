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

/** Ответ записи: user_id наружу не уходит, null остаётся null. */
interface VocabularyEntry {
    readonly id: string;
    readonly term: string;
    readonly translation: string | null;
    readonly context: string | null;
    readonly sourceLessonId: string | null;
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
                "id, user_id, term, translation, context, source_lesson_id, created_at, updated_at"
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
            "id, user_id, term, translation, context, source_lesson_id, created_at, updated_at";
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

    return router;
}
