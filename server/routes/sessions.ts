// ARCHITECT: доменный роутер сессий: свои строки public.sessions читаются пользовательским клиентом под RLS
// select-own, а userId берётся только из проверенного access-токена, никогда из клиента (§16.2, §16.5).
// ARCHITECT: ответ PostgREST разбирается Zod и не покидает модуль (§16.13): наружу уходит только DTO без
// user_id. Название сессии задаёт пользователь (PATCH), у старых строк его нет — nullable.
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
// tutor_id 1..64, title 1..80 при непустом значении). strictObject отклоняет лишние ключи — набор ровно тот,
// что мы выбрали.
const SessionRowSchema = z.strictObject({
    id: z.uuid(),
    user_id: z.uuid(),
    title: z.string().min(1).max(80).nullable(),
    tutor_id: z.string().min(1).max(64),
    mode: z.string().min(1).max(32),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
});

const SessionListSchema = z.array(SessionRowSchema);

type SessionRow = z.infer<typeof SessionRowSchema>;

/** DTO сессии: user_id и служебные поля наружу не уходят, название остаётся nullable (§16.13). */
function toSessionDto(row: SessionRow) {
    return {
        id: row.id,
        title: row.title,
        tutorId: row.tutor_id,
        mode: row.mode,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

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

// ARCHITECT: тело правки — только название и репетитор: user_id приходит из токена, режим и уровень из меню не
// меняются (режим — часть личности сессии, уровень решает тест). refine требует хотя бы одно поле: пустая правка
// — ошибка клиента, а не no-op (§16.6). Пустая строка названия значит «вернуть производный заголовок».
const UpdateSessionSchema = z
    .strictObject({
        title: z.string().trim().max(80).nullable().optional(),
        tutorId: z.string().min(1).max(64).optional(),
    })
    .refine((value) => Object.keys(value).length > 0);

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
// ARCHITECT: управление своей сессией (название, репетитор, сброс, удаление) — отдельный счёт: переименование
// списка из нескольких строк не должно упираться в лимит создания, а скрипт сбрасывающий сессии — упираться.
const MANAGE_WINDOW_MS = 15 * 60_000;
const MANAGE_MAX = 30;

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
    const manageLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: MANAGE_WINDOW_MS,
        max: MANAGE_MAX,
        scope: "sessions:manage",
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
            .select("id, user_id, title, tutor_id, mode, created_at, updated_at")
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(READ_LIMIT);

        if (error !== null) throw error;

        const parsed = SessionListSchema.safeParse(data);

        if (!parsed.success) throw parsed.error;

        res.status(200).json({ sessions: parsed.data.map(toSessionDto) });
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
            .select("id, user_id, title, tutor_id, mode, created_at, updated_at")
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

        // ARCHITECT: ответ создания — тот же DTO, что в GET: user_id и служебные поля наружу не уходят, а
        // название на этом шаге пустое: его задаёт пользователь в шапке чата.
        res.status(201).json({ session: toSessionDto(row.data) });
    });

    // ARCHITECT: PATCH — правка своей сессии: порядок manageLimiter -> validateCsrf -> обработчик, как у создания.
    // Запись идёт пользовательским клиентом: апдейт-политика открывает только свою строку, а колоночный грант —
    // ровно title и tutor_id, поэтому переписать mode или user_id не сможет даже собственный код (§16.5).
    // Чужая и несуществующая сессия отвечают 404 одинаково (§16.4).
    router.patch("/:id", manageLimiter, validateCsrf, async (req: Request, res: Response) => {
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
        const parsed = UpdateSessionSchema.safeParse(req.body);

        if (!id.success || !parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: allowlist репетитора выводится из каталога: неизвестный id — 400, а не строка, которую UI
        // не отрендерит (как при создании сессии).
        const tutorId = parsed.data.tutorId;

        if (tutorId !== undefined && !TUTOR_ID_ALLOWLIST.has(tutorId)) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: пустая строка названия значит «снять название»: карточка и шапка вернутся к производному
        // заголовку «репетитор · режим».
        const title = parsed.data.title === "" ? null : parsed.data.title;
        const patch: { title?: string | null; tutor_id?: string } = {};

        if (title !== undefined) patch.title = title;
        if (tutorId !== undefined) patch.tutor_id = tutorId;

        const { data, error } = await createUserClient(env, accessToken)
            .from("sessions")
            .update(patch)
            .eq("id", id.data)
            .eq("user_id", payload.userId)
            .select("id, user_id, title, tutor_id, mode, created_at, updated_at")
            .maybeSingle();

        if (error !== null) throw error;

        const row = SessionRowSchema.safeParse(data);

        if (!row.success) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        res.status(200).json({ session: toSessionDto(row.data) });
    });

    // ARCHITECT: DELETE — сессия уходит вместе с уроками и сообщениями: каскад снимает внешний ключ on delete
    // cascade (core_learning). Пишет service-role, потому что delete-грантов у authenticated нет, но владение
    // задано условием в самом запросе — чужую строку удалить нельзя даже случайно (§16.5). Ноль удалённых строк
    // отвечает 404 без деталей.
    router.delete("/:id", manageLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        if (!id.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const { data, error } = await createServiceClient(env)
            .from("sessions")
            .delete()
            .eq("id", id.data)
            .eq("user_id", payload.userId)
            .select("id");

        if (error !== null) throw error;

        if ((data ?? []).length === 0) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        res.status(200).json({ status: "ok" });
    });

    // ARCHITECT: POST /:id/reset — очистка уроков и сообщений, сессия остаётся: уроки удаляются, сообщения уходят
    // каскадом. Владение проверяется выборкой своей строки, дальше пишет service-role (§16.5).
    // ARCHITECT: после очистки возвращается приветствие режима — так обещает интерфейс («останется приветствие
    // выбранного режима»), и чат не открывается пустым экраном. Сбой приветствия сессию не ломает: он гасится
    // строкой лога, как и при создании.
    router.post("/:id/reset", manageLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        if (!id.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const service = createServiceClient(env);
        // ARCHITECT: чужая и несуществующая сессия отвечают одинаково: 404 не подтверждает существование чужих
        // строк (§16.4).
        const current = await service
            .from("sessions")
            .select("id, user_id, tutor_id, mode")
            .eq("id", id.data)
            .eq("user_id", payload.userId)
            .maybeSingle();

        if (current.error !== null) throw current.error;

        if (current.data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const cleared = await service.from("lessons").delete().eq("session_id", current.data.id);

        if (cleared.error !== null) throw cleared.error;

        const tutor = getTutorById(current.data.tutor_id);

        if (tutor !== undefined) {
            await writeSessionGreeting(service, {
                userId: payload.userId,
                sessionId: current.data.id,
                tutor,
                mode: current.data.mode,
            }).catch(() =>
                console.log(JSON.stringify({ level: "warn", msg: "chat.greeting_failed" }))
            );
        }

        res.status(200).json({ status: "ok" });
    });

    return router;
}
