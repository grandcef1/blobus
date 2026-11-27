// ARCHITECT: доменный роутер чтения сессий: свои строки public.sessions читаются пользовательским клиентом
// под RLS select-own, а userId берётся только из проверенного access-токена, никогда из клиента (§16.2, §16.5).
// ARCHITECT: ответ PostgREST разбирается Zod и не покидает модуль (§16.13): наружу уходит только DTO без
// user_id и без названия сессии — этой колонки в схеме нет, и контракт согласован без неё.
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { writeSessionGreeting } from "../chat/greeting.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";
import { TUTORS, getTutorById } from "../tutorCatalog.ts";

// ARCHITECT: строгая схема читаемого набора колонок: границы совпадают с CHECK-ами схемы (mode 1..32,
// tutor_id 1..64). strictObject отклоняет лишние ключи — набор колонок ровно тот, что мы выбрали.
const SessionRowSchema = z.strictObject({
    id: z.uuid(),
    user_id: z.uuid(),
    tutor_id: z.string().min(1).max(64),
    mode: z.string().min(1).max(32),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
});

const SessionListSchema = z.array(SessionRowSchema);

// ARCHITECT: allowlist репетиторов выводится из каталога TUTORS: единый источник правды, поэтому список не
// может разойтись с тем, что отдаёт GET /api/tutors, и дубль значений исчез.
const TUTOR_ID_ALLOWLIST: ReadonlySet<string> = new Set(TUTORS.map((tutor) => tutor.id));
const MODE_ALLOWLIST: ReadonlySet<string> = new Set([
    "interview",
    "speaking",
    "grammar",
    "general",
]);

// ARCHITECT: тело создания — ровно два поля: user_id приходит из токена, а лишние поля отклоняет
// strictObject (§16.6). targetLevel в реальной схеме нет, поэтому в контракт не входит.
const CreateSessionSchema = z.strictObject({
    tutorId: z.string().min(1).max(64),
    mode: z.string().min(1).max(32),
});

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: limit 50 — защита от неограниченного чтения; порядок под существующий
// sessions_user_created_idx (user_id, created_at desc, id desc).
const READ_LIMIT = 50;
// ARCHITECT: лимит записи строже чтения: создание — мутация с обращением к service-role, 10 за 15 минут
// достаточно ручному выбору репетитора и отсекает скрипт, плодящий сессии.
const WRITE_WINDOW_MS = 15 * 60_000;
const WRITE_MAX = 10;

export function createSessionsRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "sessions:read",
    });
    const writeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: WRITE_WINDOW_MS,
        max: WRITE_MAX,
        scope: "sessions:create",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
    const tokenCache = createInMemoryTokenCache();

    // ARCHITECT: GET — безопасный метод: смысла запроса чтение не меняет, поэтому CSRF не применяется (как /api/profile).
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
            .from("sessions")
            .select("id, user_id, tutor_id, mode, created_at, updated_at")
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(READ_LIMIT);

        if (error !== null) throw error;

        const parsed = SessionListSchema.safeParse(data);

        if (!parsed.success) throw parsed.error;

        const sessions = parsed.data.map((row) => ({
            id: row.id,
            tutorId: row.tutor_id,
            mode: row.mode,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        res.status(200).json({ sessions });
    });

    // ARCHITECT: POST — мутация: порядок writeLimiter -> validateCsrf -> обработчик, как в auth.ts. Лимит идёт
    // первым, чтобы поток без CSRF-пары отсекался до валидации тела и до service-role.
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

        const parsed = CreateSessionSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: allowlist проверяется после схемы: неизвестный блобатар или режим — 400, а не строка в БД,
        // которую UI не отрендерит.
        if (!TUTOR_ID_ALLOWLIST.has(parsed.data.tutorId) || !MODE_ALLOWLIST.has(parsed.data.mode)) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: insert пишет service-role (у authenticated только SELECT): владение задаётся проверенным
        // userId из токена, а клиентский user_id из тела отсечён strictObject (§16.5).
        const { data, error } = await createServiceClient(env)
            .from("sessions")
            .insert({
                user_id: payload.userId,
                tutor_id: parsed.data.tutorId,
                mode: parsed.data.mode,
            })
            .select("id, user_id, tutor_id, mode, created_at, updated_at")
            .single();

        if (error !== null) throw error;

        const row = SessionRowSchema.safeParse(data);

        if (!row.success) throw row.error;

        // ARCHITECT: приветствие репетитора попадает в историю вместе с созданием сессии, поэтому первый экран
        // чата не пустой. Вставка best-effort: сессия уже создана, и сбой приветствия не должен её отменять —
        // ошибка гасится строкой лога без текста сообщения и PII (§16.11).
        const tutor = getTutorById(row.data.tutor_id);

        if (tutor !== undefined) {
            await writeSessionGreeting(createServiceClient(env), {
                userId: payload.userId,
                sessionId: row.data.id,
                tutor,
                mode: row.data.mode,
            }).catch(() =>
                console.log(JSON.stringify({ level: "warn", msg: "chat.greeting_failed" }))
            );
        }

        // ARCHITECT: ответ создания — тот же DTO, что в GET: user_id и служебные поля наружу не уходят.
        res.status(201).json({
            session: {
                id: row.data.id,
                tutorId: row.data.tutor_id,
                mode: row.data.mode,
                createdAt: row.data.created_at,
                updatedAt: row.data.updated_at,
            },
        });
    });

    return router;
}
