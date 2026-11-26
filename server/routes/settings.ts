// ARCHITECT: серверные настройки пользователя — те же два toggle, что рендерит SettingsPage: language живёт
// в profiles.locale, а theme/notifications контрактом не закреплены и в jsonb не пишутся.
// ARCHITECT: чтение идёт пользовательским клиентом под RLS select-own, запись — service-role: userId берётся
// только из проверенного токена, а колоночный grant update preferences клиенту не выдан (§16.2, §16.5).
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

// ARCHITECT: запись строгая — полный DTO из двух обязательных полей, лишние ключи отклоняет strictObject
// (§16.6); чтение терпит дефолт {} и лишние ключи, но неверный тип значения роняет разбор (§16.13).
const SettingsPatchSchema = z.strictObject({
    autoCorrection: z.boolean(),
    soundEffects: z.boolean(),
});

const PreferencesReadSchema = z.object({
    autoCorrection: z.boolean().default(true),
    soundEffects: z.boolean().default(true),
});

/** Контракт настроек: те же поля отдают GET и PATCH. */
interface SettingsDto {
    readonly autoCorrection: boolean;
    readonly soundEffects: boolean;
}

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: лимит записи строже чтения: переключение toggle — редкое действие, 20 за 15 минут хватает
// человеку и отсекает скрипт, перебирающий значения через service-role.
const WRITE_WINDOW_MS = 15 * 60_000;
const WRITE_MAX = 20;

export function createSettingsRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "settings:read",
    });
    const writeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: WRITE_WINDOW_MS,
        max: WRITE_MAX,
        scope: "settings:update",
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

        // ARCHITECT: чтение под RLS select-own; userId только из токена, клиентский id из query не читается
        // вовсе (§16.2, §16.5): даже при подставленном чужом id база вернёт только свою строку.
        const { data, error } = await createUserClient(env, accessToken)
            .from("profiles")
            .select("preferences")
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const parsed = PreferencesReadSchema.safeParse(data.preferences);

        // ARCHITECT: в колонке лежит недоверенный jsonb: неверный тип значения — аномалия данных, а не запроса,
        // поэтому разбор уходит в общий обработчик (500), а не в 400 (§16.13).
        if (!parsed.success) throw parsed.error;

        const settings: SettingsDto = parsed.data;

        res.status(200).json({ settings });
    });

    // ARCHITECT: PATCH — мутация: лимитер -> validateCsrf -> обработчик, как в profile.ts.
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

        const parsed = SettingsPatchSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: запись — полный replace обоих toggle, а не слияние с текущим jsonb: иначе выключенный
        // toggle нельзя было бы вернуть, а повтор того же тела не был бы идемпотентен (§16.6).
        const client = createServiceClient(env);
        const updated = await client
            .from("profiles")
            .update({ preferences: parsed.data })
            .eq("id", payload.userId);

        if (updated.error !== null) throw updated.error;

        // ARCHITECT: ответ PATCH — та же перечитанная из БД строка, что в GET: клиент видит сохранённое
        // значение, а не своё же тело.
        const { data, error } = await client
            .from("profiles")
            .select("preferences")
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const stored = PreferencesReadSchema.safeParse(data.preferences);

        if (!stored.success) throw stored.error;

        const settings: SettingsDto = stored.data;

        res.status(200).json({ settings });
    });

    return router;
}
