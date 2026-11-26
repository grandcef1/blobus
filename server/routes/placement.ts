// ARCHITECT: тест уровня: вопросы уходят клиенту без верных ответов, а балл и уровень считает только сервер —
// клиентские score/level не принимаются вовсе (§16.2). Результат читается пользовательским клиентом под RLS
// select-own, а пишется сервисным ключом: userId берётся только из проверенного access-токена (§16.5).
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { QUESTIONS, QUESTION_IDS, computePlacement, publicQuestions } from "../placementCatalog.ts";
import type { PlacementLevel } from "../placementCatalog.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";

// ARCHITECT: строгая схема читаемой строки: границы совпадают с CHECK-ами placement_results (level A1-C2,
// score 0-100), а лишние ключи отклоняет strictObject — колонок выбрано ровно столько, сколько нужно DTO.
const PlacementRowSchema = z.strictObject({
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    score: z.number().int().min(0).max(100),
    created_at: z.string().min(1),
});

type PlacementRow = z.infer<typeof PlacementRowSchema>;

/** Контракт результата: те же поля отдают GET и POST, внутренние колонки наружу не уходят. */
interface PlacementResultDto {
    readonly level: PlacementLevel;
    readonly score: number;
    readonly createdAt: string;
}

// ARCHITECT: тело отправки — только ответы: score, level и userId выводятся на сервере, а лишние ключи
// отклоняет strictObject (§16.2, §16.6). Длина ровно как в банке: форма фиксированная, поэтому пропущенный
// вопрос 400-й, а не «меньше знаменатель, выше балл».
const SubmitSchema = z.strictObject({
    answers: z
        .array(
            z.strictObject({
                questionId: z.string().min(1).max(64),
                choice: z.number().int().min(0).max(3),
            })
        )
        .length(QUESTIONS.length),
});

// ARCHITECT: лимит чтения стоит первым middleware, чтобы поток отсекался до Supabase. Счёт в памяти —
// дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore (как в profile.ts).
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: лимит отправки строже чтения: тест проходят один раз, десяти попыток за 15 минут хватает
// человеку и не даёт скрипту перебирать ответы.
const WRITE_WINDOW_MS = 15 * 60_000;
const WRITE_MAX = 10;

const SELECTED_COLUMNS = "level, score, created_at";
/** Код Postgres «нарушение уникальности»: placement_results_user_id_unique держит один результат на юзера. */
const UNIQUE_VIOLATION = "23505";

type PlacementClient = ReturnType<typeof createUserClient>;

// ARCHITECT: маппер один на чтение и запись: форма строки БД не покидает роутер (§16.13).
function toResultDto(row: PlacementRow): PlacementResultDto {
    return { level: row.level, score: row.score, createdAt: row.created_at };
}
/** Строка результата из БД или null: строгий разбор, аномалия данных уходит в общий обработчик (500). */
async function readResultRow(
    client: PlacementClient,
    userId: string
): Promise<PlacementRow | null> {
    // ARCHITECT: актуальный результат — последний по времени: таблица хранит историю замеров, поэтому
    // читаем order + limit 1 (иначе maybeSingle упал бы на второй строке) — по индексу
    // placement_results_user_created (user_id, created_at desc, id desc).
    const { data, error } = await client
        .from("placement_results")
        .select(SELECTED_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error !== null) throw error;
    if (data === null) return null;

    const row = PlacementRowSchema.safeParse(data);

    if (!row.success) throw row.error;

    return row.data;
}

export function createPlacementRouter(options: { readonly env: SupabaseEnv }): Router {
    const { env } = options;
    const router = Router();
    const readLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "placement:read",
    });
    const writeLimiter = createRateLimiter({
        store: createMemoryRateLimitStore(),
        windowMs: WRITE_WINDOW_MS,
        max: WRITE_MAX,
        scope: "placement:submit",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
    const tokenCache = createInMemoryTokenCache();

    // ARCHITECT: GET — безопасный метод: смысла запроса чтение не меняет, поэтому CSRF не применяется.
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

        // ARCHITECT: чтение под RLS select-own: свой результат виден только владельцу (§16.5), а вопросы
        // приходят без correctIndex — верный ответ не покидает сервер (§16.2).
        const row = await readResultRow(createUserClient(env, accessToken), payload.userId);

        res.status(200).json({
            questions: publicQuestions(),
            completed: row !== null,
            result: row === null ? null : toResultDto(row),
        });
    });

    // ARCHITECT: POST — мутация: лимитер -> validateCsrf -> обработчик, как в profile.ts.
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

        const parsed = SubmitSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: форма отвечается целиком: множество id обязано совпасть с банком — без пропусков, дублей
        // и лишних, иначе клиент считал бы балл по выгодному ему подмножеству (§16.2). Порядок ответов
        // значения не имеет: скоринг идёт по id.
        const submitted = new Set(parsed.data.answers.map((answer) => answer.questionId));

        if (
            submitted.size !== QUESTIONS.length ||
            ![...submitted].every((questionId) => QUESTION_IDS.has(questionId))
        ) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        // ARCHITECT: владение задаётся только проверенным userId (§16.5): чужой id в теле отклоняет схема.
        const client = createServiceClient(env);
        const existing = await readResultRow(client, payload.userId);

        // ARCHITECT: повторная отправка идемпотентна: результат у пользователя один, поэтому сохраняется
        // уже посчитанный (пересдача — отдельная задача, не в C-0d1).
        if (existing !== null) {
            res.status(200).json({ result: toResultDto(existing) });
            return;
        }

        const outcome = computePlacement(parsed.data.answers);
        const inserted = await client
            .from("placement_results")
            .insert({ user_id: payload.userId, level: outcome.level, score: outcome.score })
            .select(SELECTED_COLUMNS)
            .single();

        if (inserted.error !== null) {
            // ARCHITECT: unique(user_id) — при гонке двух одновременных отправок вторая получает 23505: тогда
            // отдаём уже сохранённый результат, а не 500 (строгая идемпотентность, §16.9).
            if (inserted.error.code === UNIQUE_VIOLATION) {
                const raced = await readResultRow(client, payload.userId);

                if (raced !== null) {
                    res.status(200).json({ result: toResultDto(raced) });
                    return;
                }
            }

            throw inserted.error;
        }

        const row = PlacementRowSchema.safeParse(inserted.data);

        if (!row.success) throw row.error;

        // ARCHITECT: ответ — перечитанная из БД строка, а не посчитанная здесь: клиент видит ровно то, что
        // сохранилось, вместе со временем замера.
        res.status(200).json({ result: toResultDto(row.data) });
    });

    return router;
}
