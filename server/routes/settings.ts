// ARCHITECT: серверные настройки пользователя — то, что рендерит SettingsPage: language живёт в
// profiles.locale и задаёт дефолт explanationLocale, а plan отдаётся рядом с настройками, хотя меняет его
// только биллинг. theme/notifications контрактом не закреплены и в jsonb не пишутся.
// ARCHITECT: чтение идёт пользовательским клиентом под RLS select-own, запись — service-role: userId берётся
// только из проверенного токена, а колоночного grant update на preferences и plan клиенту не выдано
// (§16.2, §16.5).
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

const LOCALES = ["ru", "en", "es"] as const;

/** Язык объяснений: тот же набор значений, что у profiles.locale. */
type ExplanationLocale = (typeof LOCALES)[number];
/** Тариф: клиент его только читает, план назначает сервер/биллинг (§16.9). */
type Plan = "free" | "pro";

// ARCHITECT: запись частичная — merge, а не replace: все поля optional, поэтому тело прежнего клиента
// ({soundEffects, autoCorrection}) остаётся валидным и не затирает остальные ключи. Лишние ключи, в том
// числе plan/id/userId, отклоняет strictObject, пустое тело — refine (§16.6).
const SettingsPatchSchema = z
    .strictObject({
        soundEffects: z.boolean().optional(),
        autoCorrection: z.boolean().optional(),
        explanationLocale: z.enum(LOCALES).optional(),
        voiceEnabled: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0);

// ARCHITECT: чтение терпит отсутствие ключей и лишние ключи, но неверный тип значения роняет разбор (§16.13);
// explanationLocale хранится только при явном выборе, иначе берётся язык интерфейса строки.
const PreferencesReadSchema = z.object({
    soundEffects: z.boolean().default(true),
    autoCorrection: z.boolean().default(true),
    explanationLocale: z.enum(LOCALES).optional(),
    voiceEnabled: z.boolean().default(false),
});

// ARCHITECT: слияние идёт по сырому объекту jsonb без подстановки дефолтов: иначе PATCH записывал бы в
// колонку значения, которых пользователь не выбирал, а повтор тела P-2 менял бы чужие ключи.
const PreferencesObjectSchema = z.record(z.string(), z.json());

type PreferencesObject = z.infer<typeof PreferencesObjectSchema>;

// ARCHITECT: план и язык приходят из строки, а не из токена: и то, и другое — серверные данные (§16.5).
const SettingsRowSchema = z.strictObject({
    preferences: z.unknown(),
    locale: z.enum(LOCALES),
    plan: z.enum(["free", "pro"]),
});

type SettingsRow = z.infer<typeof SettingsRowSchema>;

/** Контракт настроек: те же поля отдают GET и PATCH, plan идёт рядом с settings, а не внутри него. */
interface SettingsDto {
    readonly soundEffects: boolean;
    readonly autoCorrection: boolean;
    readonly explanationLocale: ExplanationLocale;
    readonly voiceEnabled: boolean;
}

/** Preferences-объект строки как есть: значения не подставляются, чужие ключи доживают до слияния. */
function toPreferencesObject(row: SettingsRow): PreferencesObject {
    const parsed = PreferencesObjectSchema.safeParse(row.preferences);

    if (!parsed.success) throw parsed.error;

    return parsed.data;
}

// ARCHITECT: маппер один на GET и PATCH: explanationLocale без сохранённого значения наследует язык
// интерфейса строки, поэтому «не выбрано» и «как в профиле» — одно и то же состояние.
function toSettingsDto(row: SettingsRow): SettingsDto {
    const parsed = PreferencesReadSchema.safeParse(row.preferences);

    // ARCHITECT: в колонке лежит недоверенный jsonb: неверный тип значения — аномалия данных, а не запроса,
    // поэтому разбор уходит в общий обработчик (500), а не в 400 (§16.13).
    if (!parsed.success) throw parsed.error;

    return {
        soundEffects: parsed.data.soundEffects,
        autoCorrection: parsed.data.autoCorrection,
        explanationLocale: parsed.data.explanationLocale ?? row.locale,
        voiceEnabled: parsed.data.voiceEnabled,
    };
}

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: лимит записи строже чтения: переключение toggle — редкое действие, 20 за 15 минут хватает
// человеку и отсекает скрипт, перебирающий значения через service-role.
const WRITE_WINDOW_MS = 15 * 60_000;
const WRITE_MAX = 20;

// ARCHITECT: набор читаемых колонок один на GET и PATCH: оба отдают один и тот же конверт.
const SELECTED_COLUMNS = "preferences, locale, plan";

/** Конверт настроек: plan идёт рядом с settings, а не внутри него — тариф не настройка пользователя. */
interface SettingsResponse {
    readonly settings: SettingsDto;
    readonly plan: Plan;
}

function toSettingsResponse(row: SettingsRow): SettingsResponse {
    return { settings: toSettingsDto(row), plan: row.plan };
}

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
            .select(SELECTED_COLUMNS)
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const row = SettingsRowSchema.safeParse(data);

        if (!row.success) throw row.error;

        res.status(200).json(toSettingsResponse(row.data));
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

        const client = createServiceClient(env);
        // ARCHITECT: merge требует текущего объекта, поэтому строка читается до записи: патч ложится поверх
        // сохранённых ключей, и прежнее тело P-2 не затирает настройки, которых в нём нет.
        const current = await client
            .from("profiles")
            .select(SELECTED_COLUMNS)
            .eq("id", payload.userId)
            .maybeSingle();

        if (current.error !== null) throw current.error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (current.data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const currentRow = SettingsRowSchema.safeParse(current.data);

        if (!currentRow.success) throw currentRow.error;

        // ARCHITECT: в запись идут только поля из проверенного патча: plan в схеме нет, поэтому тариф через
        // этот маршрут не меняется — его назначает биллинг (§16.2, §16.9).
        const merged: PreferencesObject = {
            ...toPreferencesObject(currentRow.data),
            ...parsed.data,
        };
        const updated = await client
            .from("profiles")
            .update({ preferences: merged })
            .eq("id", payload.userId);

        if (updated.error !== null) throw updated.error;

        // ARCHITECT: ответ PATCH — та же перечитанная из БД строка, что в GET: клиент видит сохранённое
        // значение, а не своё же тело.
        const { data, error } = await client
            .from("profiles")
            .select(SELECTED_COLUMNS)
            .eq("id", payload.userId)
            .maybeSingle();

        if (error !== null) throw error;

        // ARCHITECT: строку заводит триггер handle_new_user; её отсутствие — аномалия, отвечаем 404 без деталей.
        if (data === null) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        const row = SettingsRowSchema.safeParse(data);

        if (!row.success) throw row.error;

        res.status(200).json(toSettingsResponse(row.data));
    });

    return router;
}
