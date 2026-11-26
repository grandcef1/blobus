// ARCHITECT: роутер чата — единственный вход модели: сообщение принимается только от владельца сессии,
// уровень берётся из placement_results, квота — из entitlements, а карточки и usage пишутся в
// messages.payload. Клиент не присылает ни userId, ни уровень, ни план, ни персонажа (§16.2).
// ARCHITECT: вывод модели недоверенный: JSON карточек проверяется схемой (chat/contract.ts) и никогда не
// исполняется; при битом ответе квота возвращается, а сообщения не сохраняются (§16.8, §16.14).
import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import { createOpenRouterClient } from "../ai/openrouter.ts";
import type { AiClient } from "../ai/openrouter.ts";
import { createInMemoryTokenCache, verifyAccessToken } from "../auth.ts";
import { ChatRequestSchema, parseCards, stripCardsMarker } from "../chat/contract.ts";
import type { ChatDonePayload, VocabWord } from "../chat/contract.ts";
import { HISTORY_LIMIT, buildSystemPrompt, selectHistory } from "../chat/prompt.ts";
import type { ChatHistoryMessage, ExplanationLocale } from "../chat/prompt.ts";
import { COOKIE_NAMES, getCookie } from "../cookies.ts";
import { validateCsrf } from "../csrf.ts";
import { errorEnvelope } from "../http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "../rate-limit.ts";
import { createServiceClient, createUserClient } from "../supabase.ts";
import type { SupabaseEnv } from "../supabase.ts";
import { getTutorById } from "../tutorCatalog.ts";

/** Окружение чата: ключ OpenRouter есть только у сервера и приходит из composition root (§16.3). */
export interface ChatEnv extends SupabaseEnv {
    readonly OPENROUTER_API_KEY?: string;
}

// ARCHITECT: строгие схемы читаемых строк: набор колонок ровно тот, что мы выбрали, а границы совпадают с
// CHECK-ами схемы (§16.13). Чужая форма — аномалия данных, поэтому уходит в общий обработчик (500).
const SessionRowSchema = z.strictObject({
    id: z.uuid(),
    user_id: z.uuid(),
    tutor_id: z.string().min(1).max(64),
    mode: z.string().min(1).max(32),
});

const PlacementRowSchema = z.strictObject({
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
});

const ProfileRowSchema = z.strictObject({
    locale: z.enum(["ru", "en", "es"]),
    daily_minutes: z.number().int().min(5).max(120),
    preferences: z.unknown(),
});

// ARCHITECT: настройки читаются как jsonb: неверный тип значения — аномалия строки, а не запроса.
const PreferencesSchema = z.object({
    autoCorrection: z.boolean().default(true),
    explanationLocale: z.enum(["ru", "en", "es"]).optional(),
});

const LessonRowSchema = z.strictObject({ id: z.uuid() });

const MessageRowSchema = z.strictObject({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
    created_at: z.string().min(1),
});

/** Конверт reserve_message: остатки считает БД, клиент их не присылает. */
const ReserveSchema = z.object({
    lessons_remaining: z.number().int(),
    messages_remaining: z.number().int(),
});

// ARCHITECT: история — один параметр: id своей сессии. strictObject отклоняет лишние ключи query, поэтому
// userId в запросе не проходит (§16.6).
const HistoryQuerySchema = z.strictObject({
    sessionId: z.uuid(),
});

// ARCHITECT: набор колонок истории строгий, а payload читается как unknown: его форму пишет наш же роутер
// (карточки и usage), а разбирает клиент. Чужая форма строки — аномалия данных и уходит в общий обработчик.
const HistoryMessageRowSchema = z.strictObject({
    id: z.uuid(),
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
    payload: z.unknown(),
    created_at: z.string().min(1),
});

/** Лимит тела: 6 сообщений в минуту на пользователя (middleware считает то же окно по IP). */
const CHAT_WINDOW_MS = 60_000;
const CHAT_MAX = 6;
/** Длина content в схеме messages: ответ модели длиннее быть не может, но обрезка защищает вставку. */
const MESSAGE_MAX_CHARS = 4000;
/** Код Postgres «нарушение уникальности»: unique (user_id, lower(term)) гасит повтор слова. */
const UNIQUE_VIOLATION = "23505";
/** Текст исключения reserve_message: лимит сообщений на сегодня исчерпан. */
const QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED";
// ARCHITECT: лимит чтения истории тот же, что у остальных чтений (server/routes/sessions.ts): 60 за 15 минут.
// Счёт в памяти — дев/тесты: инстансы Vercel не делят память, прод получит общий RateLimitStore.
const READ_WINDOW_MS = 15 * 60_000;
const READ_MAX = 60;
// ARCHITECT: свежий хвост диалога: limit в прямом порядке отдал бы начало переписки, а не последние реплики.
const HISTORY_PAGE_LIMIT = 50;

const SSE_HEADERS: Record<string, string> = {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // ARCHITECT: прокси (Vercel) не должен буферизовать поток: иначе дельты придут одним куском.
    "x-accel-buffering": "no",
};

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Кадр SSE: имя события и один JSON-объект — формат, который читает EventSource на клиенте. */
function writeSse(res: Response, event: "delta" | "done" | "error", data: unknown): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Резерв не состоялся из-за лимита: отказ по квоте отличается от сбоя БД по тексту исключения. */
function isQuotaExhausted(error: { readonly message?: string } | null): boolean {
    return error !== null && (error.message ?? "").includes(QUOTA_EXHAUSTED);
}
/** Возврат резерва: вызывается на отказе модели, обрыве клиента и битом ответе. */
async function releaseMessage(client: ServiceClient, userId: string): Promise<void> {
    const released = await client.rpc("release_message", { p_user_id: userId });

    if (released.error !== null) throw released.error;
}

/**
 * Порядок реплик по возрастанию времени. Внутри одной метки времени первой идёт реплика ученика: пара пишется
 * одной вставкой, поэтому created_at у неё одинаковый, а id случайный — без этого правила диалог в ленте и в
 * промпте мог бы начаться с ответа репетитора.
 */
function orderHistoryAsc<T extends { readonly created_at: string; readonly role: string }>(
    rows: readonly T[]
): T[] {
    return [...rows].sort((left, right) => {
        if (left.created_at !== right.created_at)
            return left.created_at < right.created_at ? -1 : 1;
        if (left.role === right.role) return 0;

        return left.role === "user" ? -1 : 1;
    });
}

/** История сессии читается пользовательским клиентом под RLS select-own (§16.5). */
async function readHistory(
    env: SupabaseEnv,
    accessToken: string,
    sessionId: string
): Promise<ChatHistoryMessage[]> {
    const client = createUserClient(env, accessToken);
    const lessons = await client
        .from("lessons")
        .select("id")
        .eq("session_id", sessionId)
        .order("started_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(10);

    if (lessons.error !== null) throw lessons.error;

    const lessonIds = (lessons.data ?? []).map((row) => row.id);

    if (lessonIds.length === 0) return [];

    const messages = await client
        .from("messages")
        .select("role, content, created_at")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(HISTORY_LIMIT);

    if (messages.error !== null) throw messages.error;

    const parsed = z.array(MessageRowSchema).safeParse(messages.data);

    if (!parsed.success) throw parsed.error;

    // ARCHITECT: из БД приходят новые сверху, в промпт уходят по возрастанию времени — порядок диалога.
    return orderHistoryAsc(parsed.data).map((row) => ({ role: row.role, content: row.content }));
}

/** Урок сессии: последний или новый — сообщения хранятся в уроке, а не в сессии. */
async function resolveLessonId(
    client: ServiceClient,
    sessionId: string,
    dailyMinutes: number
): Promise<string> {
    const existing = await client
        .from("lessons")
        .select("id")
        .eq("session_id", sessionId)
        .order("started_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing.error !== null) throw existing.error;

    const row = LessonRowSchema.safeParse(existing.data);

    if (row.success) return row.data.id;

    const created = await client
        .from("lessons")
        .insert({ session_id: sessionId, daily_minutes: dailyMinutes })
        .select("id")
        .single();

    if (created.error !== null) throw created.error;

    const inserted = LessonRowSchema.safeParse(created.data);

    if (!inserted.success) throw inserted.error;

    return inserted.data.id;
}

/** Авто-слово урока: повтор слова не ошибка — unique (user_id, lower(term)) гасит вставку. */
async function addVocabWord(client: ServiceClient, userId: string, word: VocabWord): Promise<void> {
    const inserted = await client.from("vocabulary").insert({
        user_id: userId,
        term: word.term,
        translation: word.translation,
        context: word.context,
    });

    if (inserted.error === null || inserted.error.code === UNIQUE_VIOLATION) return;

    throw inserted.error;
}
export function createChatRouter(options: { readonly env: ChatEnv }): Router {
    const { env } = options;
    const router = Router();
    const store = createMemoryRateLimitStore();
    // ARCHITECT: порядок middleware — лимитер, потом CSRF, потом обработчик: поток без CSRF-пары
    // отсекается до Supabase и до заказа модели (как в sessions.ts).
    const burstLimiter = createRateLimiter({
        store,
        windowMs: CHAT_WINDOW_MS,
        max: CHAT_MAX,
        scope: "chat:message",
    });
    // ARCHITECT: чтение истории лимитируется отдельным scope: отправка сообщения платная, чтение — нет, и общий
    // счётчик позволил бы вычитывать историю вместо ответов модели.
    const historyLimiter = createRateLimiter({
        store,
        windowMs: READ_WINDOW_MS,
        max: READ_MAX,
        scope: "chat:history",
    });
    // ARCHITECT: кэш проверки токена — на экземпляр роутера: verifyAccessToken сам ограничивает срок записи
    // min от ttl кэша и exp токена.
    const tokenCache = createInMemoryTokenCache();
    // ARCHITECT: без ключа роутер отвечает 500 и в модель не ходит: анонимный заказ недопустим (§16.3).
    const apiKey = env.OPENROUTER_API_KEY;
    const ai: AiClient | null =
        apiKey === undefined || apiKey === "" ? null : createOpenRouterClient({ apiKey });

    // ARCHITECT: чтение истории — сохранённая пара сообщений своей сессии: роль, текст и payload с карточками.
    // Порядок middleware как у остальных чтений: сначала лимитер, потом токен. CSRF не нужен — GET смысла не меняет.
    router.get("/history", historyLimiter, async (req: Request, res: Response) => {
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

        const query = HistoryQuerySchema.safeParse(req.query);

        if (!query.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const service = createServiceClient(env);
        // ARCHITECT: чужая и несуществующая сессия отвечают одинаково: 404 не подтверждает существование чужих
        // строк (§16.4). SessionRowSchema здесь не нужен — читаются два служебных поля.
        const session = await service
            .from("sessions")
            .select("id, user_id")
            .eq("id", query.data.sessionId)
            .maybeSingle();

        if (session.error !== null) throw session.error;

        if (session.data === null || session.data.user_id !== payload.userId) {
            res.status(404).json(errorEnvelope("NOT_FOUND", res));
            return;
        }

        // ARCHITECT: уроки своей сессии читаются сервисным ключом после проверки владения сессией: их id —
        // фильтр для чтения сообщений, и по нему же ограничен набор под RLS.
        const lessons = await service
            .from("lessons")
            .select("id")
            .eq("session_id", query.data.sessionId);

        if (lessons.error !== null) throw lessons.error;

        const lessonIds = (lessons.data ?? []).map((row) => row.id);

        if (lessonIds.length === 0) {
            res.status(200).json({ messages: [] });
            return;
        }

        // ARCHITECT: сообщения читаются пользовательским клиентом под RLS select-own, а фильтр по lesson_id
        // своей сессии — defense in depth поверх политики. Последние 50 берутся по убыванию и разворачиваются.
        const messages = await createUserClient(env, accessToken)
            .from("messages")
            .select("id, role, content, payload, created_at")
            .in("lesson_id", lessonIds)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(HISTORY_PAGE_LIMIT);

        if (messages.error !== null) throw messages.error;

        const rows = z.array(HistoryMessageRowSchema).safeParse(messages.data);

        if (!rows.success) throw rows.error;

        res.status(200).json({
            messages: orderHistoryAsc(rows.data).map((row) => ({
                id: row.id,
                role: row.role,
                content: row.content,
                payload: row.payload,
                createdAt: row.created_at,
            })),
        });
    });

    router.post("/", burstLimiter, validateCsrf, async (req: Request, res: Response) => {
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

        // ARCHITECT: middleware считает по IP, а здесь — по пользователю: за общим адресом (офис, NAT)
        // лимит по IP делил бы шесть сообщений на всех, поэтому ключ строится из проверенного userId.
        const burst = await store.hit(`chat:user:${payload.userId}`, CHAT_WINDOW_MS);

        if (burst.count > CHAT_MAX) {
            res.setHeader("Retry-After", String(Math.max(1, Math.ceil(burst.resetMs / 1000))));
            res.status(429).json(errorEnvelope("RATE_LIMITED", res));
            return;
        }

        const parsed = ChatRequestSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        if (ai === null) {
            res.status(500).json(errorEnvelope("INTERNAL", res));
            return;
        }

        const service = createServiceClient(env);
        // ARCHITECT: владение сессией проверяет service-роль: чужая и несуществующая сессия отвечают
        // одинаково, поэтому существование чужих строк не подтверждается (§16.4).
        const session = await service
            .from("sessions")
            .select("id, user_id, tutor_id, mode")
            .eq("id", parsed.data.sessionId)
            .maybeSingle();

        if (session.error !== null) throw session.error;

        const sessionRow = SessionRowSchema.safeParse(session.data);

        if (!sessionRow.success || sessionRow.data.user_id !== payload.userId) {
            res.status(403).json(errorEnvelope("FORBIDDEN", res));
            return;
        }

        // ARCHITECT: гейт теста уровня: без строки placement_results чат не начинается — уровень нужен
        // промпту, а «на глаз» его не выставляют (§16.2).
        const placement = await service
            .from("placement_results")
            .select("level")
            .eq("user_id", payload.userId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (placement.error !== null) throw placement.error;

        const placementRow = PlacementRowSchema.safeParse(placement.data);

        if (!placementRow.success) {
            res.status(403).json(errorEnvelope("FORBIDDEN", res));
            return;
        }

        // ARCHITECT: персона берётся из каталога по tutor_id сессии: клиентский tutorId не принимается, а
        // неизвестный персонаж — аномалия строки сессии, поэтому отказ.
        const tutor = getTutorById(sessionRow.data.tutor_id);

        if (tutor === undefined) {
            res.status(403).json(errorEnvelope("FORBIDDEN", res));
            return;
        }
        const profile = await service
            .from("profiles")
            .select("locale, daily_minutes, preferences")
            .eq("id", payload.userId)
            .maybeSingle();

        if (profile.error !== null) throw profile.error;

        const profileRow = ProfileRowSchema.safeParse(profile.data);

        if (!profileRow.success) throw profileRow.error;

        const preferences = PreferencesSchema.safeParse(profileRow.data.preferences);

        if (!preferences.success) throw preferences.error;

        const explanationLocale: ExplanationLocale =
            preferences.data.explanationLocale ?? profileRow.data.locale;
        // ARCHITECT: история читается под RLS пользовательским клиентом, а не service-ролью: лишних прав
        // на чтение у роутера нет.
        const history = await readHistory(env, accessToken, sessionRow.data.id);
        const lessonId = await resolveLessonId(
            service,
            sessionRow.data.id,
            profileRow.data.daily_minutes
        );
        // ARCHITECT: маркер вырезается из текста ученика: своим сообщением нельзя подделать блок карточек.
        const message = stripCardsMarker(parsed.data.message);

        if (message === "") {
            // ARCHITECT: сообщение из одного маркера после вырезания пустое: сохранять нечего (§16.6).
            res.status(400).json(errorEnvelope("BAD_REQUEST", res));
            return;
        }

        const systemPrompt = buildSystemPrompt({
            tutor,
            mode: sessionRow.data.mode,
            level: placementRow.data.level,
            explanationLocale,
            autoCorrection: preferences.data.autoCorrection,
            history,
            message,
        });
        const promptHistory = selectHistory(history);

        // ARCHITECT: резерв до заказа модели: иначе параллельные сообщения обошли бы дневной лимит, а отказ
        // провайдера съедал бы квоту — её возвращает release_message.
        const reserved = await service.rpc("reserve_message", { p_user_id: payload.userId });

        if (reserved.error !== null) {
            // ARCHITECT: исчерпанный дневной лимит — 429: код RATE_LIMITED понимает фронтенд-адаптер,
            // отдельного кода квоты в конверте нет.
            if (isQuotaExhausted(reserved.error)) {
                res.status(429).json(errorEnvelope("RATE_LIMITED", res));
                return;
            }

            throw reserved.error;
        }

        const reserve = ReserveSchema.safeParse(reserved.data);

        if (!reserve.success) throw reserve.error;
        // ARCHITECT: заголовки SSE выставляются до первого кадра: статус ошибки после начала потока уже не
        // отправить, поэтому все отказы проверены выше, а ошибки потока идут событием error.
        res.status(200);

        for (const [name, value] of Object.entries(SSE_HEADERS)) res.setHeader(name, value);

        res.flushHeaders();

        // ARCHITECT: обрыв клиента отменяет заказ модели и возвращает резерв: сервер не платит за ответ,
        // который никто не прочитал (§16.7).
        const abort = new AbortController();
        let finished = false;

        res.on("close", () => {
            if (!finished) abort.abort();
        });

        try {
            const reply = await ai.streamReply(
                { systemPrompt, history: promptHistory, message, signal: abort.signal },
                (text) => writeSse(res, "delta", { text })
            );
            const cards = parseCards(reply.cardsJson);

            // ARCHITECT: битый JSON карточек — битый ответ: не сохраняем, возвращаем квоту и сообщаем об
            // ошибке событием, а не HTTP-статусом (заголовки уже отправлены).
            if (cards === null) {
                await releaseMessage(service, payload.userId);
                writeSse(res, "error", { code: "INTERNAL" });
                return;
            }

            const usage = {
                promptTokens: reply.usage.promptTokens,
                completionTokens: reply.usage.completionTokens,
                model: reply.model,
            };
            const tokens = usage.promptTokens + usage.completionTokens;

            // ARCHITECT: расход пишется до сохранения сообщений: если месячный агрегат не записался,
            // история не должна получить пару, за которую сервис не учёл расход.
            if (tokens > 0) {
                const recorded = await service.rpc("record_ai_tokens", {
                    p_user_id: payload.userId,
                    p_tokens: tokens,
                });

                if (recorded.error !== null) throw recorded.error;
            }

            const saved = await service.from("messages").insert([
                // ARCHITECT: payload у сообщения ученика задан явно: в пакетной вставке PostgREST колонка
                // одна на все строки, поэтому дефолт не подставился бы и NOT NULL отклонил бы строку.
                { lesson_id: lessonId, role: "user", content: message, payload: {} },
                {
                    lesson_id: lessonId,
                    role: "assistant",
                    content: reply.text.slice(0, MESSAGE_MAX_CHARS),
                    payload: { cards, usage },
                },
            ]);

            if (saved.error !== null) throw saved.error;

            if (cards.vocabWord !== null)
                await addVocabWord(service, payload.userId, cards.vocabWord);

            const done: ChatDonePayload = {
                reply: reply.text,
                corrections: cards.corrections,
                quiz: cards.quiz,
                vocabWord: cards.vocabWord,
                usage: { ...usage, messagesRemaining: reserve.data.messages_remaining },
            };

            writeSse(res, "done", done);
        } catch {
            // ARCHITECT: отказ, обрыв и битый ответ возвращают резерв, а прерванная пара сообщений не
            // сохраняется: клиент повторит отправку и получит новый ответ (§16.9). Причина сбоя наружу не
            // уходит — только код.
            await releaseMessage(service, payload.userId).catch(() => undefined);

            if (!abort.signal.aborted) writeSse(res, "error", { code: "INTERNAL" });
        } finally {
            finished = true;
            res.end();
        }
    });

    return router;
}
