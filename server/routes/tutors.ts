// ARCHITECT: роутер статического каталога репетиторов: данные живут на сервере (server/tutorCatalog.ts),
// поэтому ответ не зависит ни от Supabase, ни от клиентских моков.
// ARCHITECT: каталог один для всех пользователей, но маршрут всё равно закрыт сессией: остальные доменные
// роутеры читаются только в пользовательском контексте, и лимитер считает чтения (§16.4, §16.7).
import { Router } from "express";
import type { Request, Response } from "express";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import type { SupabaseEnv } from "../supabase.ts";
import { TUTORS } from "../tutorCatalog.ts";
import type { Tutor, TutorPersonaTraits, TutorTraits } from "../tutorCatalog.ts";

/** Контракт репетитора наружу: ровно те поля, которые читает клиент, и ничего служебного. */
export interface TutorDto {
    readonly id: string;
    readonly name: string;
    // ARCHITECT: профиль голоса уходит вместе с карточкой: клиент выбирает голос озвучки по нему, а не по
    // порядку карточек или догадке (§16.2).
    readonly voiceId: string;
    readonly traits: TutorTraits;
    readonly persona: {
        readonly traits: TutorPersonaTraits;
        readonly teachingStyle: string;
        readonly story: string;
    };
}

// ARCHITECT: явный маппер вместо отдачи объекта каталога: наружу уходит новый объект из пяти полей,
// поэтому служебное поле каталога не утечёт в ответ, а правка ответа не тронет источник (массив tone
// копируется — это единственное изменяемое значение).
function toTutorDto(tutor: Tutor): TutorDto {
    return {
        id: tutor.id,
        name: tutor.name,
        voiceId: tutor.voiceId,
        traits: { ...tutor.traits, tone: [...tutor.traits.tone] },
        persona: { ...tutor.persona },
    };
}

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до проверки токена. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;

export function createTutorsRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "tutors:read",
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

        try {
            // ARCHITECT: payload не нужен — каталог одинаков для всех, — но ручательство за сессию обязательно:
            // без проверки токена маршрут стал бы публичным.
            await verifyAccessToken(env, accessToken, tokenCache);
        } catch {
            // ARCHITECT: просроченный, поддельный и чужой токен отвечают одинаково, без деталей (§16.4).
            res.status(401).json(errorEnvelope("UNAUTHORIZED", res));
            return;
        }

        res.status(200).json({ tutors: TUTORS.map(toTutorDto) });
    });

    return router;
}
