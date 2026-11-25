// ARCHITECT: первый доменный роутер чтения: своя строка profiles читается пользовательским клиентом под
// RLS select-own, а userId берётся только из проверенного access-токена, никогда из клиента (§16.2, §16.5).
// ARCHITECT: ответ PostgREST читается как unknown и разбирается Zod, поэтому тип строки не покидает модуль
// (§16.13): наружу уходит явный DTO.
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

// ARCHITECT: nullable означает отсутствие строки профиля — аномалию контура, которую отдаём как 404 без
// деталей; иначе разбирается ровно набор колонок чтения.
const ProfileRowSchema = z
    .object({
        display_name: z.string(),
        locale: z.enum(["ru", "en", "es"]),
        daily_minutes: z.number().int(),
        created_at: z.string(),
        onboarding_completed_at: z.string().nullable(),
    })
    .nullable();

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как exchangeLimiter в auth.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;

export function createProfileRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "profile:read",
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
            .select("display_name, locale, daily_minutes, created_at, onboarding_completed_at")
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

        // ARCHITECT: наружу уходит только DTO: имена колонок и внутренний тип строки не проходят за границу.
        const profile = {
            displayName: parsed.data.display_name,
            locale: parsed.data.locale,
            dailyMinutes: parsed.data.daily_minutes,
            memberSince: parsed.data.created_at,
            onboardingCompleted: parsed.data.onboarding_completed_at !== null,
        };

        res.status(200).json({ profile });
    });

    return router;
}
