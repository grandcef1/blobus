// ARCHITECT: платный путь озвучки: синтез выполняет провайдер по нашему ключу, поэтому маршрут закрыт
// сессией, тарифом из entitlements и лимитером. Клиент присылает только текст и профиль голоса: план, userId
// и уровень берутся из проверенного токена и БД (§16.2, §16.9).
// ARCHITECT: отказ провайдера не подменяется другой моделью и не повторяется: клиент деградирует в текстовую
// реплику, а платного фолбэка у маршрута нет.
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createTtsClient } from "../ai/tts.ts";
import type { TtsClient } from "../ai/tts.ts";
import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";
import { VOICE_IDS } from "../tutorCatalog.ts";
import type { VoiceId } from "../tutorCatalog.ts";

/** Окружение озвучки: ключ OpenRouter есть только у сервера и приходит из composition root (§16.3). */
export interface TtsEnv extends SupabaseEnv {
    readonly OPENROUTER_API_KEY?: string;
}

// ARCHITECT: тело — ровно два поля: plan, userId и уровень клиент не присылает, их выводят из проверенного
// токена и entitlements, а лишние ключи отклоняет strictObject (§16.2, §16.6). voiceId ограничен allowlist
// каталога: голос провайдера по произвольной строке не заказывается.
export const TtsRequestSchema = z.strictObject({
    text: z.string().trim().min(1).max(600),
    voiceId: z.enum(VOICE_IDS),
});

/** Тариф приходит из БД и недоверен как любой ввод: неожидаемое значение — аномалия данных (§16.13). */
const PlanSchema = z.enum(["free", "pro"]);

// ARCHITECT: лимит тратится провайдером, поэтому он строже чтений: 20 синтезов за 5 минут хватает человеку
// и отсекает скрипт. Счёт в памяти — дев/тесты: инстансы Vercel не делят память.
const TTS_WINDOW_MS = 5 * 60_000;
const TTS_MAX = 20;

/** Конверт ответа: mp3 в base64 — клиент собирает data URL и играет его, отдельный блоб не нужен (§16.13). */
function toAudioEnvelope(
    bytes: Uint8Array,
    mimeType: string
): { readonly audio: string; readonly mimeType: string } {
    return { audio: Buffer.from(bytes).toString("base64"), mimeType };
}

export function createTtsRouter(options: { readonly env: TtsEnv }): Router {
    const { env } = options;
    const router = Router();
    // ARCHITECT: порядок middleware — лимитер, потом CSRF, потом обработчик: заказ без CSRF-пары отсекается
    // до Supabase и до провайдера (как в chat.ts).
    const limiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: TTS_WINDOW_MS,
        max: TTS_MAX,
        scope: "tts:synthesis",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
    const tokenCache = createInMemoryTokenCache();
    // ARCHITECT: без ключа роутер отвечает 500 и в провайдер не ходит: анонимный заказ недопустим (§16.3).
    const apiKey = env.OPENROUTER_API_KEY;
    const tts: TtsClient | null =
        apiKey === undefined || apiKey === "" ? null : createTtsClient({ apiKey });

    router.post("/", limiter, validateCsrf, async (req: Request, res: Response) => {
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

        const parsed = TtsRequestSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        if (tts === null) {
            res.status(500).json(errorEnvelope("INTERNAL", res));
            return;
        }

        // ARCHITECT: тариф читается из entitlements (его же читает биллинг), а не из тела запроса: клиент
        // планом не распоряжается (§16.2, §16.9).
        const entitlements = await createServiceClient(env).rpc("get_or_create_entitlements", {
            p_user_id: payload.userId,
        });

        if (entitlements.error !== null) throw entitlements.error;

        const plan = PlanSchema.safeParse(entitlements.data.plan);

        if (!plan.success) throw plan.error;

        // ARCHITECT: озвучка — платная возможность: на бесплатном тарифе отказ, а не «тихая» бесплатная
        // генерация за наш счёт (§16.9).
        if (plan.data !== "pro") {
            res.status(403).json(errorEnvelope("FORBIDDEN", res));
            return;
        }

        const voiceId: VoiceId = parsed.data.voiceId;
        const audio = await tts.synthesize({ text: parsed.data.text, voiceId });

        res.status(200).json(toAudioEnvelope(audio.bytes, audio.mimeType));
    });

    return router;
}
