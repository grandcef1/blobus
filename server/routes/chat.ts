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
import { ChatRequestSchema, resolveCards, stripCardsMarker } from "../chat/contract.ts";
import type { ChatDonePayload, VocabWord } from "../chat/contract.ts";
import {
    activityAt,
    advancePlan,
    buildLessonPlan,
    modeOf,
    perkFor,
    readLessonPlan,
    toLessonPlanDto,
} from "../chat/lessonPlan.ts";
import type { LessonLevel, LessonPlan, PlanLocale } from "../chat/lessonPlan.ts";
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

// ARCHITECT: строка урока читается вместе с планом: plan — это данные урока, над которыми работает сервер,
// и форму им задаёт наш же код (chat/lessonPlan.ts), поэтому поле проверяется отдельно от id.
const LessonRowSchema = z.strictObject({ id: z.uuid(), plan: z.unknown() });

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

/** Строка истории в порядке диалога: роль, время и (у сообщений из БД) payload. */
interface OrderableHistoryRow {
    readonly created_at: string;
    readonly role: string;
    readonly payload?: unknown;
}

/** Вторая часть хода помечена в payload флагом followUp: у разбора этого флага нет. */
function isFollowUpRow(payload: unknown): boolean {
    return (
        typeof payload === "object" &&
        payload !== null &&
        (payload as { readonly followUp?: unknown }).followUp === true
    );
}

function rankOfHistoryRow(row: OrderableHistoryRow): number {
    if (row.role === "user") return 0;

    return isFollowUpRow(row.payload) ? 2 : 1;
}

/**
 * Порядок реплик по возрастанию времени. Внутри одной метки времени сначала идёт реплика ученика, затем разбор
 * репетитора и последней — вторая часть хода: пара и продолжение пишутся одной вставкой, поэтому created_at у
 * них общий, а id случаен. Без этого правила лента после перезагрузки показала бы следующую активность раньше
 * разбора (порядок в потоке и в истории разошёлся бы).
 */
function orderHistoryAsc<T extends OrderableHistoryRow>(rows: readonly T[]): T[] {
    return [...rows].sort((left, right) => {
        if (left.created_at !== right.created_at)
            return left.created_at < right.created_at ? -1 : 1;

        return rankOfHistoryRow(left) - rankOfHistoryRow(right);
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

/** Запись плана в урок: jsonb — единственное место, где живёт состояние урока. */
async function persistPlan(
    client: ServiceClient,
    lessonId: string,
    plan: LessonPlan
): Promise<LessonPlan> {
    const updated = await client.from("lessons").update({ plan }).eq("id", lessonId);

    if (updated.error !== null) throw updated.error;

    return plan;
}

/**
 * Урок сессии вместе с планом: последний урок или новый. План пересобирается, если строка пришла без него
 * (старая запись или сбой вставки приветствия) — карточка цели и прогресс не должны пропадать из-за строки,
 * которую писал не наш код (§16.13).
 */
async function resolveLesson(
    client: ServiceClient,
    input: {
        readonly sessionId: string;
        readonly dailyMinutes: number;
        readonly level: LessonLevel;
        readonly mode: string;
        readonly locale: PlanLocale;
    }
): Promise<{ readonly id: string; readonly plan: LessonPlan }> {
    const planInput = { level: input.level, mode: modeOf(input.mode), locale: input.locale };
    const existing = await client
        .from("lessons")
        .select("id, plan")
        .eq("session_id", input.sessionId)
        .order("started_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing.error !== null) throw existing.error;

    const row = LessonRowSchema.safeParse(existing.data);

    if (row.success) {
        const plan = readLessonPlan(row.data.plan);

        return {
            id: row.data.id,
            plan: plan ?? (await persistPlan(client, row.data.id, buildLessonPlan(planInput))),
        };
    }

    const created = await client
        .from("lessons")
        .insert({
            session_id: input.sessionId,
            daily_minutes: input.dailyMinutes,
            plan: buildLessonPlan(planInput),
        })
        .select("id, plan")
        .single();

    if (created.error !== null) throw created.error;

    const inserted = LessonRowSchema.safeParse(created.data);

    if (!inserted.success) throw inserted.error;

    return {
        id: inserted.data.id,
        plan: readLessonPlan(inserted.data.plan) ?? buildLessonPlan(planInput),
    };
}

// ARCHITECT: служебные слова в словарь не попадают: словарь — про значимую лексику, а не про артикли, предлоги и
// местоимения. Список явный и короткий — это фильтр качества авто-слова, а не полный стоп-лист английского.
const AUTO_WORD_STOP_LIST = new Set([
    "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by", "for", "with", "from",
    "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "have", "has", "had",
    "will", "would", "can", "could", "should", "shall", "may", "might", "must", "not", "no", "yes", "i",
    "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
    "our", "their", "this", "that", "these", "those", "there", "here", "so", "very", "just", "too", "also",
    "as", "than", "then", "when", "what", "which", "who", "whom", "how", "why", "where", "all", "any",
    "some", "one", "two", "more", "most", "much", "many", "get", "got", "go", "going", "went",
]);

/** Раз в столько ходов репетитор отдаёт слово урока: примерно одно слово на два-три хода, а не каждое. */
const AUTO_WORDS_EVERY_TURNS = 3;

/** Ход приносит слово в словарь на первом, четвёртом, седьмом ходу — то есть не каждый и не почти никогда. */
function shouldOfferAutoWord(step: number): boolean {
    return step % AUTO_WORDS_EVERY_TURNS === 0;
}

/** Кандидат в словарь: не служебное слово и не короче трёх букв — «it» и «of» словарём не считаются. */
function isAutoWordCandidate(term: string): boolean {
    const value = term.trim().toLowerCase();

    return value.length >= 3 && !AUTO_WORD_STOP_LIST.has(value);
}

/**
 * Авто-слово урока. Качество и существование проверяются до вставки: служебное слово и повтор не занимают даже
 * попытки записи, а unique (user_id, lower(term)) остаётся последней защитой от гонки (§16.6). true — слово
 * действительно лежит в словаре: только тогда карточка слова уходит клиенту.
 */
async function addVocabWord(client: ServiceClient, userId: string, word: VocabWord): Promise<boolean> {
    if (!isAutoWordCandidate(word.term)) return false;

    // ARCHITECT: метасимволы LIKE экранируются, иначе term с % или _ нашёл бы чужую строку.
    const escaped = word.term.trim().replace(/[\\%_]/g, "\\$&");
    const existing = await client
        .from("vocabulary")
        .select("id")
        .eq("user_id", userId)
        .ilike("term", escaped)
        .maybeSingle();

    if (existing.error !== null) throw existing.error;

    // ARCHITECT: слово уже в словаре — это не ошибка и не повод показать карточку заново: урок его не «добавляет».
    if (existing.data !== null) return false;

    const inserted = await client.from("vocabulary").insert({
        user_id: userId,
        term: word.term,
        translation: word.translation,
        context: word.context,
    });

    if (inserted.error === null || inserted.error.code === UNIQUE_VIOLATION) return true;

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
        // фильтр для сообщений, а первый по убыванию — текущий урок, чей план показывает карточка цели.
        const lessons = await service
            .from("lessons")
            .select("id, plan, started_at")
            .eq("session_id", query.data.sessionId)
            .order("started_at", { ascending: false })
            .order("id", { ascending: false });

        if (lessons.error !== null) throw lessons.error;

        const lessonIds = (lessons.data ?? []).map((row) => row.id);
        // ARCHITECT: наружу уходит DTO плана: целевых слов в нём нет по конструкции (§16.6).
        const plan = readLessonPlan(lessons.data?.[0]?.plan);

        if (lessonIds.length === 0) {
            res.status(200).json({ messages: [], plan: null });
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
            // ARCHITECT: план урока отдаётся рядом с сообщениями: карточка цели восстанавливается после
            // перезагрузки ленты без отдельного запроса, а прогресс считает сервер.
            plan: plan === null ? null : toLessonPlanDto(plan),
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
        // ARCHITECT: урок приходит вместе с планом: цель, правило и активность этапа задаёт сервер, а не
        // модель, поэтому один и тот же урок идёт по одному плану от первого хода до резюме.
        const lesson = await resolveLesson(service, {
            sessionId: sessionRow.data.id,
            dailyMinutes: profileRow.data.daily_minutes,
            level: placementRow.data.level,
            mode: sessionRow.data.mode,
            locale: explanationLocale,
        });
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
            plan: lesson.plan,
            activity: activityAt(lesson.plan),
            // ARCHITECT: фишку выбирает сервер по состоянию плана, а не модель: за ход их не больше одной.
            perk: perkFor(lesson.plan),
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
            const outcome = resolveCards(reply.cardsJson, message);

            // ARCHITECT: карточки — best-effort: ни отсутствие маркера, ни битый JSON не делают ответ битым,
            // текст репетитора сохраняется и уходит клиенту. Причина отбрасывания пишется одной строкой лога
            // без самого JSON и без текста сообщения (§16.7, §16.8, §16.11).
            if (outcome.kind === "dropped")
                console.log(
                    JSON.stringify({
                        level: "info",
                        msg: "chat.cards_dropped",
                        reason: outcome.reason,
                    })
                );

            const cards = outcome.kind === "cards" ? outcome.cards : null;

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

            // ARCHITECT: план двигается по факту хода: шаг, употреблённые слова и серию считает сервер по
            // реплике ученика и уже отфильтрованным правкам — прогресс урока не подделать ответом (§16.8).
            const hasError =
                cards !== null && cards.corrections.some((correction) => correction.kind === "error");
            const nextPlan = await persistPlan(
                service,
                lesson.id,
                advancePlan(lesson.plan, { studentMessage: message, hasError })
            );
            const followUp = cards === null ? null : cards.followUp;

            const saved = await service.from("messages").insert([
                // ARCHITECT: payload у сообщения ученика задан явно: в пакетной вставке PostgREST колонка
                // одна на все строки, поэтому дефолт не подставился бы и NOT NULL отклонил бы строку.
                { lesson_id: lesson.id, role: "user", content: message, payload: {} },
                {
                    lesson_id: lesson.id,
                    role: "assistant",
                    content: reply.text.slice(0, MESSAGE_MAX_CHARS),
                    // ARCHITECT: профиль голоса сохраняется вместе с карточками: после перезагрузки ленты
                    // кнопка озвучки восстанавливается по тому же значению каталога.
                    payload: { cards, usage, voiceId: tutor.voiceId },
                },
                // ARCHITECT: вторая часть хода — отдельное сообщение: после перезагрузки ленты она стоит там
                // же, где её увидели в потоке, а не склеена с разбором. Отличить её от ответа с карточками
                // можно по payload: поля usage у неё нет, поэтому расход и квота считаются один раз.
                ...(followUp === null
                    ? []
                    : [
                          {
                              lesson_id: lesson.id,
                              role: "assistant",
                              content: followUp.slice(0, MESSAGE_MAX_CHARS),
                              payload: { voiceId: tutor.voiceId, followUp: true },
                          },
                      ]),
            ]);

            if (saved.error !== null) throw saved.error;

            // ARCHITECT: слово урока попадает в словарь не каждый ход: сервер сам решает, пора ли (шаг плана —
            // счётчик ходов), а слово проходит фильтр качества. Карточка уходит клиенту только когда запись
            // действительно появилась, иначе карточка обещала бы сохранение, которого не было.
            const addedVocabWord =
                cards !== null && cards.vocabWord !== null && shouldOfferAutoWord(lesson.plan.step)
                    ? await addVocabWord(service, payload.userId, cards.vocabWord)
                    : false;

            const done: ChatDonePayload = {
                reply: reply.text,
                // ARCHITECT: вторая часть необязательна: без неё ход остаётся одним сообщением (§16.8).
                followUp,
                // ARCHITECT: ответ без карточек отдаётся пустыми блоками: клиент рисует текст, а не ошибку.
                corrections: cards === null ? [] : cards.corrections,
                quiz: cards === null ? null : cards.quiz,
                vocabWord: addedVocabWord && cards !== null ? cards.vocabWord : null,
                plan: toLessonPlanDto(nextPlan),
                voiceId: tutor.voiceId,
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
