// ARCHITECT: маршруты сессии — единственное место, где сервер разговаривает с Supabase Auth: пароли и сессии
// хранит GoTrue, сервер только заворачивает токены в HttpOnly-куки и не строит второй системы паролей (§16.4).
// ARCHITECT: вход валидирует Zod со strictObject: неизвестные поля отклоняются, длины ограничены — тело
// запроса не уходит дальше, чем описано схемой (§16.6).
import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, clearCookie, getCookie, setCookie } from "../cookies.ts";
import { attachCsrfToken, createCsrfToken, validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

// ARCHITECT: политика пароля совпадает с фронтендом (src/lib/validation.ts: от 8 символов, заглавная,
// строчная и цифра), верхняя граница 72 байта — предел bcrypt в GoTrue. Схема применяется только к
// регистрации: у существующего пароля набор классов мог быть другим, логин проверяет лишь длину.
const PasswordSchema = z
    .string()
    .min(8)
    .max(72)
    .regex(/\p{Lu}/u)
    .regex(/\p{Ll}/u)
    .regex(/\p{Nd}/u);

// ARCHITECT: имя регистрации едет в метаданные GoTrue (options.data.full_name) и оттуда попадает в профиль
// через триггер handle_new_user: display_name одинаково заполняется у парольных и у OAuth-аккаунтов, а сам
// профиль остаётся единственным источником имени для интерфейса (§16.6).
const SignupSchema = z.strictObject({
    name: z.string().trim().min(1).max(80),
    email: z.email().max(254),
    password: PasswordSchema,
});
const LoginSchema = z.strictObject({
    email: z.email().max(254),
    password: z.string().min(1).max(72),
});
// ARCHITECT: обмен OAuth-пары принимает только два токена: лишние поля отклоняются, потому что тело — это
// ровно то, что вернул PKCE-танец, и ничего больше клиент присылать не должен (§16.6).
// ARCHITECT: нижняя граница refresh-токена — 8 символов, а не 20 из ТЗ: GoTrue отдаёт короткие
// непрозрачные токены (локальный стек — 12 символов, хостед такой же формат), и порог 20 отклонил бы
// любой настоящий обмен. Границы нужны только против мусора: подлинность всё равно решает Supabase.
const ExchangeSchema = z.strictObject({
    access_token: z.string().min(20).max(4096),
    refresh_token: z.string().min(8).max(512),
});

// ARCHITECT: ответ PostgREST о флаге читается как unknown и разбирается Zod: тип колонки не покидает модуль
// (§16.13). Nullable-строка означает отсутствие метки = онбординг не пройден.
const OnboardingFlagSchema = z
    .object({ onboarding_completed_at: z.string().nullable() })
    .nullable();

// ARCHITECT: тело отметки пустое: strictObject отклоняет любое поле, поэтому клиентский userId из тела не
// принимается (§16.6).
const EmptySchema = z.strictObject({});

/** Токены сессии в форме, которую ставят куки: тип Supabase за границы модуля не выходит (§16.13). */
interface SessionTokens {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresInSeconds: number;
}

/** Лимитеры перебора по маршрутам: считает тот, кто знает окружение, — app.ts. */
export interface AuthLimiters {
    readonly signup: RequestHandler;
    readonly login: RequestHandler;
    readonly refresh: RequestHandler;
    readonly logout: RequestHandler;
}

export interface AuthRouterOptions {
    readonly env: SupabaseEnv;
    readonly limiters: AuthLimiters;
}

// ARCHITECT: анонимный клиент — тот же user-клиент с publishable-ключом в роли Bearer: signUp,
// signInWithPassword и refreshSession уходят без пользовательского токена, отдельная фабрика не нужна.
function createAnonClient(env: SupabaseEnv) {
    return createUserClient(env, env.SUPABASE_PUBLISHABLE_KEY);
}

// ARCHITECT: единый срок refresh-куки — 30 дней для всех способов входа: HttpOnly + Secure + SameSite=Lax
// компенсируют персистентность, а сессионная кука только у пароля давала рассинхрон UX с OAuth.
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// ARCHITECT: access-кука живёт столько же, сколько токен (expires_in от GoTrue), refresh-кука —
// персистентная с единым сроком: сессия не теряется при закрытии вкладки, а срок совпадает с жизнью
// refresh-токена в Supabase, поэтому клиент не живёт дольше, чем сервер.
function setSessionCookies(
    res: Response,
    tokens: SessionTokens,
    refreshMaxAgeMs: number = REFRESH_COOKIE_MAX_AGE_MS
): void {
    setCookie(res, COOKIE_NAMES.accessToken, tokens.accessToken, {
        maxAge: tokens.expiresInSeconds * 1000,
    });
    setCookie(res, COOKIE_NAMES.refreshToken, tokens.refreshToken, { maxAge: refreshMaxAgeMs });
}

/** Снимает обе куки сессии: выход и проваленный refresh не должны оставлять негодные токены. */
function clearSessionCookies(res: Response): void {
    clearCookie(res, COOKIE_NAMES.accessToken);
    clearCookie(res, COOKIE_NAMES.refreshToken);
}

// ARCHITECT: ротация CSRF при смене состояния аутентификации — старый токен не должен переживать логин и
// выход (session fixation), поэтому выписываем новый на тех же атрибутах, что attachCsrfToken.
function rotateCsrfToken(res: Response): void {
    setCookie(res, COOKIE_NAMES.csrfToken, createCsrfToken(), { httpOnly: false });
}

/** Явный маппинг сессии GoTrue в куки: за границы модуля тип Session не выходит (§16.13). */
function toSessionTokens(session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}): SessionTokens {
    return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresInSeconds: session.expires_in,
    };
}

/**
 * Читает флаг завершения онбординга пользовательским клиентом под RLS select-own: ответ PostgREST
 * разбирается Zod, поэтому тип строки за границы модуля не выходит (§16.13).
 */
async function fetchOnboardingCompleted(
    env: SupabaseEnv,
    accessToken: string,
    userId: string
): Promise<boolean> {
    const { data, error } = await createUserClient(env, accessToken)
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", userId)
        .maybeSingle();

    if (error !== null) throw error;

    const parsed = OnboardingFlagSchema.safeParse(data);

    if (!parsed.success) throw parsed.error;

    // ARCHITECT: строки нет — аномалия контура (профиль заводит триггер): считаем онбординг непройденным,
    // а не падаем; иначе onboarding_completed_at !== null.
    if (parsed.data === null) return false;

    return parsed.data.onboarding_completed_at !== null;
}

// ARCHITECT: лимит обмена OAuth-парой живёт здесь, а не рядом с остальными лимитерами: app.ts вне задачи, а
// ключ маршрута и его защита должны читаться вместе. Счёт в памяти — как у прочих лимитов (только дев-режим
// и тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore).
const OAUTH_EXCHANGE_WINDOW_MS = 15 * 60_000;
const OAUTH_EXCHANGE_MAX = 20;

// ARCHITECT: лимит отметки завершения онбординга живёт здесь же и inline по образцу exchangeLimiter.
// Счёт в памяти — дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore.
const ONBOARDING_COMPLETE_WINDOW_MS = 15 * 60_000;
const ONBOARDING_COMPLETE_MAX = 10;

export function createAuthRouter(options: AuthRouterOptions): Router {
    const { env, limiters } = options;
    const router = Router();
    const exchangeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: OAUTH_EXCHANGE_WINDOW_MS,
        max: OAUTH_EXCHANGE_MAX,
        scope: "auth:oauth-exchange",
    });
    const onboardingCompleteLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: ONBOARDING_COMPLETE_WINDOW_MS,
        max: ONBOARDING_COMPLETE_MAX,
        scope: "auth:onboarding-complete",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр приложения: /me не ходит в Supabase на каждый запрос,
    // а срок записи ограничивает сам verifyAccessToken (min от ttl кэша и exp токена).
    const tokenCache = createInMemoryTokenCache();

    // ARCHITECT: порядок middleware везде один — лимитер, затем validateCsrf, затем обработчик. Лимит идёт
    // первым, чтобы поток без CSRF-пары отсекался до валидации тела и до обращений в Supabase.
    router.get("/csrf", attachCsrfToken, (_req: Request, res: Response) => {
        const token: unknown = res.locals.csrfToken;

        res.json({ csrfToken: typeof token === "string" ? token : "" });
    });

    // ARCHITECT: публичный список включённых OAuth-провайдеров: клиент рисует кнопки входа по ответу
    // сервера и не решает сам, что разрешено (§16.2). В теле только имена — ни ключей, ни адресов (§16.3).
    // ARCHITECT: ответ кэшируется: список меняется вместе с конфигурацией деплоя, а читается на каждом
    // открытии формы входа; тело зависит только от конфигурации, поэтому public-кэш безопасен (§16.7).
    router.get("/providers", (_req: Request, res: Response) => {
        res.setHeader("Cache-Control", "public, max-age=300");
        res.json({ providers: [...(env.AUTH_OAUTH_PROVIDERS ?? [])] });
    });

    router.post("/signup", limiters.signup, validateCsrf, async (req: Request, res: Response) => {
        const parsed = SignupSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const { error } = await createAnonClient(env).auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,
            // ARCHITECT: имя уходит метаданными, а не отдельным письмом в профиль: строку profiles заводит
            // триггер handle_new_user, и чужая запись в неё невозможна (§16.5).
            options: { data: { full_name: parsed.data.name } },
        });

        // ARCHITECT: занятый e-mail получает тот же код, тело и набор кук, что свободный, иначе регистрация
        // становится проверкой существования аккаунта (§16.4); сессию выдаёт только логин, поэтому
        // Set-Cookie в обоих случаях пуст и ответы неразличимы.
        if (error !== null && error.code !== "user_already_exists") {
            if (typeof error.status === "number" && error.status >= 400 && error.status < 500) {
                res.status(400).json(errorEnvelope("BAD_REQUEST", res));
                return;
            }

            // ARCHITECT: 5xx и обрыв связи уходят в общий обработчик: сбой GoTrue не выдаётся за ошибку клиента.
            throw error;
        }

        res.status(200).json({ status: "ok" });
    });

    router.post("/login", limiters.login, validateCsrf, async (req: Request, res: Response) => {
        const parsed = LoginSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const { data, error } = await createAnonClient(env).auth.signInWithPassword(parsed.data);

        // ARCHITECT: истёкший пароль, несуществующий e-mail и неподтверждённая почта отвечают одним и тем же
        // 401 без деталей: по разнице ответов аккаунты энумерировались бы (§16.4).
        if (error !== null) {
            if (typeof error.status === "number" && error.status >= 400 && error.status < 500) {
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            throw error;
        }

        if (data.session === null || data.user === null) {
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        // ARCHITECT: флаг читается до установки кук: сбой чтения отдаёт 500 и не оставляет сессию в браузере.
        const onboardingCompleted = await fetchOnboardingCompleted(
            env,
            data.session.access_token,
            data.user.id
        );

        setSessionCookies(res, toSessionTokens(data.session));
        // ARCHITECT: ротация CSRF на логине: токен, выданный до аутентификации, не переезжает в сессию.
        rotateCsrfToken(res);

        res.status(200).json({
            user: { id: data.user.id, email: data.user.email ?? null, onboardingCompleted },
        });
    });

    router.post("/refresh", limiters.refresh, validateCsrf, async (req: Request, res: Response) => {
        const refreshToken = getCookie(req, COOKIE_NAMES.refreshToken);

        if (refreshToken === undefined) {
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        const { data, error } = await createAnonClient(env).auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error !== null || data.session === null) {
            if (error !== null && (typeof error.status !== "number" || error.status >= 500)) {
                throw error;
            }

            // ARCHITECT: негодный refresh-токен снимаем сразу: иначе клиент будет ходить с ним до истечения
            // куки и получать тот же 401.
            clearSessionCookies(res);
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        // ARCHITECT: ротация — GoTrue отдаёт новую пару токенов, старый refresh-токен становится негодным.
        setSessionCookies(res, toSessionTokens(data.session));

        res.status(200).json({ status: "ok" });
    });

    router.post("/logout", limiters.logout, validateCsrf, async (req: Request, res: Response) => {
        const accessToken = getCookie(req, COOKIE_NAMES.accessToken);

        clearSessionCookies(res);
        // ARCHITECT: заодно меняем CSRF: после выхода оставшийся токен не должен работать в следующей сессии.
        rotateCsrfToken(res);

        // ARCHITECT: украденный refresh-токен не должен переживать выход, поэтому сессия отзывается на сервере
        // (scope local — только текущая: другие устройства пользователя не разлогиниваются). Сбой отзыва
        // выход не валит: куки уже сняты, а 401 здесь означал бы лишь «сессии и так нет».
        if (accessToken !== undefined) {
            await createServiceClient(env)
                .auth.admin.signOut(accessToken, "local")
                .catch(() => undefined);
        }

        res.status(200).json({ status: "ok" });
    });

    router.get("/me", async (req: Request, res: Response) => {
        const accessToken = getCookie(req, COOKIE_NAMES.accessToken);

        if (accessToken === undefined) {
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        let payload;

        try {
            payload = await verifyAccessToken(env, accessToken, tokenCache);
        } catch {
            // ARCHITECT: просроченный, поддельный и чужой токен отвечают одинаково, без деталей (§16.4):
            // shortcut: недоступность Supabase при проверке тоже даёт 401 — различать причины
            // verifyAccessToken не умеет, поправить вместе с его кодами ошибок.
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        // ARCHITECT: флаг читается на каждый вызов (свежесть), кэш покрывает только верификацию токена;
        // +1 запрос по первичному ключу — осознанно.
        const onboardingCompleted = await fetchOnboardingCompleted(
            env,
            accessToken,
            payload.userId
        );

        // ARCHITECT: наружу уходит только DTO: id и адрес из проверенного токена, без aud и exp.
        res.status(200).json({
            user: { id: payload.userId, email: payload.email, onboardingCompleted },
        });
    });

    // ARCHITECT: OAuth-обмен: браузер приносит пару токенов из PKCE-танца с Supabase, сервер её проверяет и
    // выдаёт свои HttpOnly-куки — второй источник сессии в браузере не остаётся. Логи без токенов и email:
    // здесь нет ни одной записи в лог, а общий обработчик печатает только имя ошибки, статус и код (§16.11).
    router.post(
        "/oauth/exchange",
        exchangeLimiter,
        validateCsrf,
        async (req: Request, res: Response) => {
            const parsed = ExchangeSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json(errorEnvelope("BAD_REQUEST", res));
                return;
            }

            const accessToken = parsed.data.access_token;
            let verifiedId: string;

            try {
                // ARCHITECT: подлинность пары решает Supabase Auth, не клиент: verifyAccessToken спрашивает
                // GoTrue, и подделанный access-токен отсекается до обмена (§16.4).
                verifiedId = (await verifyAccessToken(env, accessToken, tokenCache)).userId;
            } catch {
                clearSessionCookies(res);
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            const { data, error } = await createUserClient(env, accessToken).auth.refreshSession({
                refresh_token: parsed.data.refresh_token,
            });

            if (error !== null || data.session === null || data.user === null) {
                if (error !== null && (typeof error.status !== "number" || error.status >= 500)) {
                    // ARCHITECT: 5xx и обрыв связи — не 401: сбой GoTrue не должен выглядеть как «токены
                    // негодны», иначе инцидент у провайдера неотличим от атаки.
                    throw error;
                }

                clearSessionCookies(res);
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            // ARCHITECT: пара токенов обязана принадлежать одному пользователю: refresh-токен чужого
            // аккаунта рядом с нашим access-токеном превратил бы обмен в подмену сессии (§16.4, IDOR-класс).
            if (data.user.id !== verifiedId) {
                clearSessionCookies(res);
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            // ARCHITECT: флаг читается до установки кук: сбой чтения отдаёт 500 и не оставляет сессию.
            const onboardingCompleted = await fetchOnboardingCompleted(
                env,
                data.session.access_token,
                data.user.id
            );

            setSessionCookies(res, toSessionTokens(data.session));
            // ARCHITECT: как и на логине, CSRF ротируется: токен, выданный до аутентификации, не переезжает
            // в новую сессию.
            rotateCsrfToken(res);

            res.status(200).json({
                user: { id: data.user.id, email: data.user.email ?? null, onboardingCompleted },
            });
        }
    );

    // ARCHITECT: service-role обходит RLS, владение enforced в коде проверенным userId (§16.5); маршрут
    // временно живёт в auth-роутере как состояние пользователя сессии, доменный profile-роутер — отдельная
    // задача (§16.13).
    router.post(
        "/onboarding-complete",
        onboardingCompleteLimiter,
        validateCsrf,
        async (req: Request, res: Response) => {
            const parsed = EmptySchema.safeParse(req.body ?? {});

            if (!parsed.success) {
                res.status(400).json(errorEnvelope("BAD_REQUEST", res));
                return;
            }

            const accessToken = getCookie(req, COOKIE_NAMES.accessToken);

            if (accessToken === undefined) {
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            let userId: string;

            try {
                userId = (await verifyAccessToken(env, accessToken, tokenCache)).userId;
            } catch {
                // ARCHITECT: просроченный, поддельный и чужой токен отвечают одинаково, куки не снимаем — как /me.
                res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
                return;
            }

            // ARCHITECT: идемпотентность: .is(..., null) обновляет только непройденную строку, поэтому повтор
            // меняет 0 строк и всё равно отвечает 200, а метка времени при повторе не переписывается.
            const { error } = await createServiceClient(env)
                .from("profiles")
                .update({ onboarding_completed_at: new Date().toISOString() })
                .eq("id", userId)
                .is("onboarding_completed_at", null);

            if (error !== null) throw error;

            res.status(200).json({ status: "ok" });
        }
    );

    return router;
}
