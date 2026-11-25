// ARCHITECT: первый доменный роутер чтения: своя строка profiles читается пользовательским клиентом под
// RLS select-own, а userId берётся только из проверенного access-токена, никогда из клиента (§16.2, §16.5).
// ARCHITECT: ответ PostgREST читается как unknown и разбирается Zod, поэтому тип строки не покидает модуль
// (§16.13): наружу уходит явный DTO.
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { ImageError, decodeAvatarDataUrl } from "../image.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

// ARCHITECT: nullable означает отсутствие строки профиля — аномалию контура, которую отдаём как 404 без
// деталей; иначе разбирается ровно набор колонок чтения. avatar_path опционален: PATCH-обработчик читает
// свой набор колонок без него, и схема не должна ломать его разбор.
const ProfileRowSchema = z
    .object({
        display_name: z.string(),
        locale: z.enum(["ru", "en", "es"]),
        daily_minutes: z.number().int(),
        avatar_path: z.string().nullable().optional(),
        created_at: z.string(),
        onboarding_completed_at: z.string().nullable(),
    })
    .nullable();

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как exchangeLimiter в auth.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: лимит обновления строже чтения: ручная правка профиля — редкое действие, 20 за 15 минут
// хватает на настройку, но отсекает скрипт, перебирающий значения через service-role.
const UPDATE_WINDOW_MS = 15 * 60_000;
const UPDATE_MAX = 20;

// ARCHITECT: тело обновления — только профильные колонки клиента: id, created_at и флаг онбординга
// неизменяемы, лишние ключи отклоняет strictObject (§16.6). Минимум одно поле — пустой PATCH бессмыслен.
const UpdateProfileSchema = z
    .strictObject({
        displayName: z.string().max(80).optional(),
        locale: z.enum(["ru", "en", "es"]).optional(),
        dailyMinutes: z.number().int().min(5).max(120).optional(),
    })
    .refine((value) => Object.keys(value).length > 0);

/** Патч строки profiles в именах колонок: собирается только из переданных полей. */
interface ProfilePatch {
    display_name?: string;
    locale?: "ru" | "en" | "es";
    daily_minutes?: number;
}

// ARCHITECT: тело загрузки — только data URL: картинка приходит одной строкой, multipart не вводим (§6.3).
const AvatarUploadSchema = z.strictObject({
    image: z.string().min(1).max(350_000),
});
const AVATAR_BUCKET = "avatars";
// ARCHITECT: лимит загрузок строже правки профиля: каждая запись — байты в storage, 10 за 15 минут хватает
// человеку и отсекает скрипт, забивающий бакет.
const AVATAR_WINDOW_MS = 15 * 60_000;
const AVATAR_MAX = 10;
// ARCHITECT: signed URL живёт 10 минут: этого хватает на загрузку страницы, а угнанная ссылка быстро протухает.
const AVATAR_SIGNED_URL_TTL_SECONDS = 600;

export function createProfileRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "profile:read",
    });
    const writeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: UPDATE_WINDOW_MS,
        max: UPDATE_MAX,
        scope: "profile:update",
    });
    const avatarLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: AVATAR_WINDOW_MS,
        max: AVATAR_MAX,
        scope: "profile:avatar",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
    const tokenCache = createInMemoryTokenCache();

    // ARCHITECT: GET — безопасный метод: смысла запроса чтение не меняет, поэтому CSRF не применяется (как /me).
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

        // ARCHITECT: чтение под RLS select-own; userId только из токена, клиентский id не принимается
        // (§16.2, §16.5): даже при подставленном чужом id база вернёт только свою строку.
        const { data, error } = await createUserClient(env, accessToken)
            .from("profiles")
            .select(
                "display_name, locale, daily_minutes, avatar_path, created_at, onboarding_completed_at"
            )
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        const parsed = ProfileRowSchema.safeParse(data);

        if (!parsed.success) throw parsed.error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (parsed.data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        // ARCHITECT: подписываем только свой объект: ключ генерил сервер с префиксом userId, поэтому чужой или
        // битый префикс не подписывается — иначе чтение профиля стало бы IDOR на чужую картинку (§16.5).
        let avatarUrl: string | null = null;
        const avatarPath = parsed.data.avatar_path;

        if (typeof avatarPath === "string" && avatarPath.startsWith(`${payload.userId}/`)) {
            const signed = await createServiceClient(env)
                .storage.from(AVATAR_BUCKET)
                .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_TTL_SECONDS);

            if (signed.error !== null) throw signed.error;

            avatarUrl = signed.data.signedUrl;
        }

        // ARCHITECT: наружу уходит только DTO: имена колонок и внутренний тип строки не проходят за границу.
        // providerAvatarUrl уже провалидирован при проверке токена, здесь повторно не проверяется.
        const profile = {
            displayName: parsed.data.display_name,
            locale: parsed.data.locale,
            dailyMinutes: parsed.data.daily_minutes,
            memberSince: parsed.data.created_at,
            onboardingCompleted: parsed.data.onboarding_completed_at !== null,
            avatarUrl,
            providerAvatarUrl: payload.providerAvatarUrl,
        };

        res.status(200).json({ profile });
    });

    // ARCHITECT: PATCH — мутация: лимитер -> validateCsrf -> обработчик, как в sessions.ts/vocabulary.ts.
    router.patch("/", writeLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        const parsed = UpdateProfileSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: патч собирается только из переданных полей: отсутствующее поле не затирается дефолтом.
        const patch: ProfilePatch = {};
        if (parsed.data.displayName !== undefined) patch.display_name = parsed.data.displayName;
        if (parsed.data.locale !== undefined) patch.locale = parsed.data.locale;
        if (parsed.data.dailyMinutes !== undefined) patch.daily_minutes = parsed.data.dailyMinutes;

        // ARCHITECT: обновление делает service-role (обходит колоночный grant): владение задаётся проверенным
        // userId из токена, клиентские id/userId в тело не принимаются — strictObject их отклоняет (§16.5).
        const { data, error } = await createServiceClient(env)
            .from("profiles")
            .update(patch)
            .eq("id", payload.userId)
            .select("display_name, locale, daily_minutes, created_at, onboarding_completed_at")
            .maybeSingle();

        if (error !== null) throw error;

        const row = ProfileRowSchema.safeParse(data);

        if (!row.success) throw row.error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (row.data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        // ARCHITECT: ответ — тот же DTO, что в GET: имена колонок и внутренний тип строки не покидают модуль.
        res.status(200).json({
            profile: {
                displayName: row.data.display_name,
                locale: row.data.locale,
                dailyMinutes: row.data.daily_minutes,
                memberSince: row.data.created_at,
                onboardingCompleted: row.data.onboarding_completed_at !== null,
            },
        });
    });

    // ARCHITECT: POST /avatar — картинка приходит data URL. Ключ объекта генерирует сервер и он начинается
    // с userId: префикс проверяется при чтении (B-7), оригинальное имя файла не используется (§16.10).
    router.post("/avatar", avatarLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        const parsed = AvatarUploadSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        let image;

        try {
            image = decodeAvatarDataUrl(parsed.data.image);
        } catch (error) {
            // ARCHITECT: детали отклонённой картинки наружу не уходят и в лог не пишутся — только 400 (§16.4, §16.11).
            if (error instanceof ImageError) {
                res.status(400).json(errorEnvelope("BAD_REQUEST", res));
                return;
            }

            throw error;
        }

        const client = createServiceClient(env);
        const { data, error } = await client
            .from("profiles")
            .select("avatar_path")
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const previousPath = data.avatar_path;
        const key = `${payload.userId}/${randomUUID()}.${image.ext}`;
        const uploaded = await client.storage
            .from(AVATAR_BUCKET)
            .upload(key, image.buffer, { contentType: image.mime, upsert: false });

        if (uploaded.error !== null) throw uploaded.error;

        // ARCHITECT: путь пишется только после успешной загрузки: битая ссылка в профиле хуже, чем мусор в бакете.
        const updated = await client
            .from("profiles")
            .update({ avatar_path: key })
            .eq("id", payload.userId);

        if (updated.error !== null) {
            // ARCHITECT: upload прошёл, запись нет — только что загруженный объект убирается best-effort,
            // чтобы в бакете не остался сирота; ошибка уходит в общий обработчик.
            await client.storage
                .from(AVATAR_BUCKET)
                .remove([key])
                .catch(() => undefined);

            throw updated.error;
        }

        // ARCHITECT: прежний объект удаляется после успешной записи нового и best-effort: сбой удаления не
        // валит запрос — иначе пользователь потерял бы уже сохранённый аватар.
        if (previousPath !== null && previousPath !== key) {
            await client.storage
                .from(AVATAR_BUCKET)
                .remove([previousPath])
                .catch(() => undefined);
        }

        res.status(200).json({ avatarPath: key });
    });

    // ARCHITECT: DELETE /avatar — идемпотентный сброс на дефолт. Сначала профиль теряет ссылку, затем
    // удаляется объект: обратный порядок оставил бы профиль со ссылкой на уже удалённый файл. Тело DELETE
    // не читается вовсе — чужой userId в нём игнорируется.
    router.delete("/avatar", avatarLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        const client = createServiceClient(env);
        const { data, error } = await client
            .from("profiles")
            .select("avatar_path")
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const previousPath = data.avatar_path;

        if (previousPath !== null) {
            const updated = await client
                .from("profiles")
                .update({ avatar_path: null })
                .eq("id", payload.userId);

            if (updated.error !== null) throw updated.error;

            // ARCHITECT: файл удаляется после успешного сброса ссылки и best-effort: сбой storage не валит
            // запрос — профиль уже без аватара, а объект можно убрать отдельной уборкой.
            await client.storage
                .from(AVATAR_BUCKET)
                .remove([previousPath])
                .catch(() => undefined);
        }

        res.status(200).json({ avatarPath: null });
    });

    return router;
}
