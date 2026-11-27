// ARCHITECT: движок урока — состояние (jsonb lessons.plan) и правила хода: этапы, pacing, слова, викторины,
// метрики правила. Модель не решает ни один из переходов: ей отдаются готовые директивы (§16.8), а статусы
// слов, счётчики и проверка ответа викторины считаются здесь по фактам хода, а не по ответу клиента.
// ARCHITECT: документ урока в jsonb — { plan, state }: план (C-10) отвечает за карточку цели, состояние — за
// ход урока. Разбор терпит и старую плоскую форму плана: строку, записанную приветствием, читаем как план без
// состояния, поэтому прогресс не теряется.
import { z } from "zod";

import type { Quiz, VocabWord } from "./contract.ts";
import {
    ACTIVITY_TYPES,
    frameFor,
    pickSeed,
    sceneById,
    seedPosition,
    twistFor,
    wordExample,
    wordMeaning,
} from "./lessonCatalog.ts";
import type { ActivityType, ContextTag } from "./lessonCatalog.ts";
import { LESSON_LEVELS, LESSON_MODES, readLessonPlan } from "./lessonPlan.ts";
import type { LessonLevel, LessonMode, LessonPlan, PlanLocale } from "./lessonPlan.ts";

/** Этапы урока: старт, крючок, разминка, практика, проверка, проверочные ответы, итог. */
export const LESSON_STAGES = ["S0", "S1", "S2", "S3", "S4", "S5", "S6"] as const;
export type LessonStage = (typeof LESSON_STAGES)[number];

/** Режим темпа: остаток ходов считает сервер, модель только следует ему. */
export const PACING_MODES = ["NORMAL", "TIGHT", "FINAL", "LAST"] as const;
export type PacingMode = (typeof PACING_MODES)[number];

/** Статус слова: скрыто, показано карточкой, узнано в викторине, употреблено самим учеником. */
export const LESSON_WORD_STATUSES = ["hidden", "introduced", "recognized", "produced"] as const;
export type LessonWordStatus = (typeof LESSON_WORD_STATUSES)[number];

/** Вид ошибки: время, форма, порядок слов — по нему выбирается тип викторины. */
export const LESSON_ERROR_TYPES = ["tense", "form", "order"] as const;
export type LessonErrorType = (typeof LESSON_ERROR_TYPES)[number];

/** Слов урока ровно пять: меньше — не урок, больше — не осилить за занятие. */
export const LESSON_WORD_COUNT = 5;
/** Правило освоено по четырём верным применениям и двум последним верным подряд. */
export const RULE_MASTERY_TOTAL = 4;
export const RULE_MASTERY_STREAK = 2;
/** Жёсткий потолок урока: дальше идёт только итог, сколько бы квоты ни осталось. */
export const MAX_LESSON_TURNS = 18;
/** Первый ход — крючок, дальше два хода разминки. */
export const HOOK_TURNS = 1;
export const PRIME_TURNS = 2;
/** В S5 ход считается проверенным после двух верных ответов. */
export const CHECKS_IN_REVIEW = 2;
/** Викторина нужна не реже двух ходов из трёх: за десять ходов их не меньше шести. */
export const QUIZ_EVERY_TURNS = 3;
/** В состояние складываются три последних контекста: разные предложения и оценка расхода. */
export const RECENT_CONTEXT_LIMIT = 3;
/** Сколько паттернов можно пометить слабыми за урок. */
export const WEAK_PATTERN_LIMIT = 3;
/** Оценка расхода на ход, пока истории нет. */
export const TOKENS_PER_TURN_ESTIMATE = 900;
export const TOKENS_ESTIMATE_FACTOR = 1.2;
// shortcut: месячный бюджет токенов — константа, потому что в entitlements пока только дневные лимиты;
// когда лимит появится в БД, читать его оттуда.
export const MONTHLY_TOKEN_BUDGET = 300_000;
/** В FINAL одно предложение викторины может нести два слова — больше не вводится за ход. */
export const FINAL_WORDS_PER_TURN = 2;

/** Лимиты длины хода: первая часть (разбор) и вторая (активность) — по режиму темпа. */
export const WORD_LIMITS: Record<PacingMode, { readonly first: number; readonly follow: number }> =
    {
        NORMAL: { first: 40, follow: 50 },
        TIGHT: { first: 25, follow: 35 },
        FINAL: { first: 15, follow: 25 },
        // ARCHITECT: LAST — «по строке»: подводка и следующий шаг пишутся одной строкой каждая.
        LAST: { first: 12, follow: 12 },
    };

/** Слово урока со статусом: значение и пример приходят из каталога, поэтому карточка и словарь совпадают. */
export type LessonWord = {
    readonly word: string;
    readonly meaning: string;
    readonly example: string;
    readonly status: LessonWordStatus;
};

/** Последний ход в сжатом виде: текст — для правила «разные предложения», расход — для оценки темпа. */
export type RecentContext = {
    readonly text: string;
    readonly tokens: number;
};

/** Метрики правила: сколько верных в разных предложениях, серия и открытая ошибка. */
export type LessonRuleState = {
    readonly correct_total: number;
    readonly correct_streak: number;
    readonly mastered: boolean;
    readonly open_error: { readonly type: LessonErrorType; readonly count: number } | null;
};

/** Состояние урока целиком: то, что лежит в lessons.plan.state. */
export type LessonState = {
    readonly version: 2;
    readonly stage: LessonStage;
    readonly turn_index: number;
    readonly turns_left: number;
    readonly pacing_mode: PacingMode;
    readonly rule: LessonRuleState;
    readonly words: LessonWord[];
    readonly next_word_due: number;
    readonly next_activity_type: ActivityType;
    readonly last_activity_types: ActivityType[];
    readonly recent_contexts: RecentContext[];
    readonly seed: string;
    readonly twist: string | null;
    /** Слабые паттерны возвращаются в проверку, пока ученик не соберёт их верно. */
    readonly weak_patterns: string[];
    /** Сколько верных проверок пройдено в S5: после двух ход уходит в итог. */
    readonly checks_done: number;
};

/** То, что видит клиент в блоке слов итогового хода: слово, значение и статус. */
export interface LessonWordView {
    readonly word: string;
    readonly meaning: string;
    readonly status: LessonWordStatus;
}

// ARCHITECT: строка jsonb пишется нашим кодом, но читается как недоверенная: битая форма — null, и состояние
// собирается заново (§16.13). Границы совпадают с проверками схемы урока в БД.
const LessonWordSchema = z.strictObject({
    word: z.string().min(1).max(64),
    meaning: z.string().min(1).max(240),
    example: z.string().min(1).max(300),
    status: z.enum(LESSON_WORD_STATUSES),
});

const RecentContextSchema = z.strictObject({
    text: z.string().max(2000),
    tokens: z.number().int().min(0).max(100_000),
});

const LessonRuleSchema = z.strictObject({
    correct_total: z.number().int().min(0).max(999),
    correct_streak: z.number().int().min(0).max(999),
    mastered: z.boolean(),
    open_error: z
        .strictObject({
            type: z.enum(LESSON_ERROR_TYPES),
            count: z.number().int().min(0).max(99),
        })
        .nullable(),
});

const LessonStateSchema = z.strictObject({
    version: z.literal(2),
    stage: z.enum(LESSON_STAGES),
    turn_index: z.number().int().min(0).max(200),
    turns_left: z.number().int().min(0).max(999),
    pacing_mode: z.enum(PACING_MODES),
    rule: LessonRuleSchema,
    words: z.array(LessonWordSchema).min(1).max(LESSON_WORD_COUNT),
    next_word_due: z.number().int().min(0).max(200),
    next_activity_type: z.enum(ACTIVITY_TYPES),
    last_activity_types: z.array(z.enum(ACTIVITY_TYPES)).max(RECENT_CONTEXT_LIMIT),
    recent_contexts: z.array(RecentContextSchema).max(RECENT_CONTEXT_LIMIT),
    seed: z.string().min(1).max(64),
    twist: z.string().min(1).max(200).nullable(),
    weak_patterns: z.array(z.string().min(1).max(120)).max(WEAK_PATTERN_LIMIT),
    checks_done: z.number().int().min(0).max(9),
});

/** Состояние из jsonb: null — строка пуста, бита или записана другой версией движка. */
export function readLessonState(value: unknown): LessonState | null {
    const parsed = LessonStateSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
}

/** Документ урока: план карточки цели и состояние хода. */
export interface LessonDocument {
    readonly plan: LessonPlan;
    readonly state: LessonState | null;
}

const DocumentSchema = z.strictObject({ plan: z.unknown(), state: z.unknown().optional() });

/**
 * Разбор jsonb урока: сначала форма документа, затем старая плоская форма плана. null — строка чужая или
 * битая: вызывающий собирает план и состояние заново.
 */
export function readLessonDocument(value: unknown): LessonDocument | null {
    const document = DocumentSchema.safeParse(value);

    if (document.success) {
        const plan = readLessonPlan(document.data.plan);

        return plan === null ? null : { plan, state: readLessonState(document.data.state) };
    }

    const plan = readLessonPlan(value);

    return plan === null ? null : { plan, state: null };
}

export interface LessonStateInput {
    readonly level: LessonLevel;
    readonly mode: LessonMode;
    readonly locale: PlanLocale;
    /** План урока: из него берётся список целевых слов, отдельного списка у движка нет. */
    readonly plan: LessonPlan;
    readonly turnsLeft: number;
    /** Сцены последних пяти уроков: их не выбираем заново. */
    readonly excludeSeeds?: readonly string[];
    /** Сколько уроков пользователь прошёл до этого: сдвигает сцену и твист. */
    readonly lessonIndex?: number;
}

/** Индекс урока для выбора сцены: сочетание уровня и режима плюс номер занятия. */
export function seedIndex(level: LessonLevel, mode: LessonMode, lessonIndex: number): number {
    return (
        LESSON_LEVELS.indexOf(level) * LESSON_MODES.length +
        LESSON_MODES.indexOf(mode) +
        lessonIndex
    );
}

/** Начальное состояние урока: слова скрыты, этап нулевой, сцена и твист выбраны сервером. */
export function buildLessonState(input: LessonStateInput): LessonState {
    const index = seedIndex(input.level, input.mode, input.lessonIndex ?? 0);
    const scene = pickSeed(index, input.excludeSeeds ?? []);
    const words: LessonWord[] = input.plan.targetWords.slice(0, LESSON_WORD_COUNT).map((word) => ({
        word,
        meaning: wordMeaning(word, input.locale),
        example: wordExample(word),
        status: "hidden" as const,
    }));

    return {
        version: 2,
        stage: "S0",
        turn_index: 0,
        turns_left: input.turnsLeft,
        pacing_mode: pacingFor(input.turnsLeft, words.length, false),
        rule: { correct_total: 0, correct_streak: 0, mastered: false, open_error: null },
        words,
        next_word_due: wordTarget(1),
        next_activity_type: "choice",
        last_activity_types: [],
        recent_contexts: [],
        seed: scene.id,
        twist: null,
        weak_patterns: [],
        checks_done: 0,
    };
}

/**
 * Режим темпа по остатку ходов: A — остаток, R — ещё не введённые слова плюс два хода на правило.
 * NORMAL при A >= R+4, TIGHT при R+1..R+3, FINAL при 1..R, LAST при A = 0.
 */
export function pacingFor(
    turnsLeft: number,
    wordsNotIntroduced: number,
    mastered: boolean
): PacingMode {
    if (turnsLeft <= 0) return "LAST";

    const reserve = Math.max(0, wordsNotIntroduced) + (mastered ? 0 : 2);

    if (turnsLeft >= reserve + 4) return "NORMAL";
    if (turnsLeft >= reserve + 1) return "TIGHT";

    return "FINAL";
}

/** Естественный ход слова k (нумерация с единицы): 2k-1, то есть раньше дедлайна. */
export function wordTarget(k: number): number {
    return 2 * k - 1;
}

/** Крайний ход для слова k: не позже 2k, а пятое слово — не позже девятого хода. */
export function wordDeadline(k: number): number {
    return k >= LESSON_WORD_COUNT ? 9 : 2 * k;
}

/** Сколько слов урока ещё не показано карточкой. */
export function wordsNotIntroduced(state: LessonState): number {
    return state.words.filter((word) => word.status === "hidden").length;
}

/** Первое скрытое слово урока: его вводит карточка этого хода. */
export function nextHiddenWord(state: LessonState): LessonWord | null {
    return state.words.find((word) => word.status === "hidden") ?? null;
}

/** Оценка расхода на ход: среднее трёх последних ходов, умноженное на запас 1.2. */
export function tokensPerTurn(recent: readonly RecentContext[]): number {
    if (recent.length === 0) return TOKENS_PER_TURN_ESTIMATE;

    const sum = recent.reduce((total, entry) => total + entry.tokens, 0);

    return Math.max(1, Math.round((sum / recent.length) * TOKENS_ESTIMATE_FACTOR));
}

export interface TurnsLeftInput {
    /** Остаток сообщений дня: его вернул reserve_message, то есть текущий ход уже учтён. */
    readonly messagesRemaining: number;
    readonly tokensMonth: number;
    readonly recent: readonly RecentContext[];
}

/** Остаток ходов урока: меньшее из дневного лимита сообщений и месячного бюджета токенов. */
export function turnsLeftFor(input: TurnsLeftInput): number {
    const byMessages = Math.max(0, input.messagesRemaining - 1);
    const budgetLeft = Math.max(0, MONTHLY_TOKEN_BUDGET - input.tokensMonth);
    const byTokens = Math.floor(budgetLeft / tokensPerTurn(input.recent));

    return Math.min(byMessages, byTokens);
}

/** Приведение предложения для сравнения: «верно по правилу» считается только в другом предложении. */
export function normalizeSentence(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[.!?,;:]+$/, "");
}

/** Директивы хода: то, что уходит модели блоком LESSON_STATE; решает их сервер, а не модель. */
export interface LessonDirectives {
    readonly stage: LessonStage;
    /** Номер разыгрываемого хода, нумерация с единицы. */
    readonly turnIndex: number;
    readonly turnsLeft: number;
    readonly pacing: PacingMode;
    readonly wordsNotIntroduced: number;
    /** Пора вводить слово урока: карточку отдаёт модель, иначе её собирает сервер. */
    readonly wordDue: boolean;
    readonly nextWord: LessonWord | null;
    /** Ход обязан нести проверяемую викторину. */
    readonly quizRequired: boolean;
    readonly activityType: ActivityType;
    /** Тип викторины для обязательной проверки: «своё предложение» проверкой не является. */
    readonly quizType: ActivityType;
    readonly frame: string;
    readonly seedSetting: string;
    readonly seedAllows: readonly ContextTag[];
    readonly twist: string | null;
    /** Предупреждение об остатке: только при входе в TIGHT и FINAL. */
    readonly warning: boolean;
    /** Итоговый ход: подводка строкой, блок слов и ни одного вопроса. */
    readonly wrap: boolean;
    readonly limits: { readonly first: number; readonly follow: number };
    readonly weakPatterns: readonly string[];
    /** Сколько слов допустимо ввести за этот ход. */
    readonly wordsPerTurn: number;
}

/** Проверяемая тройка викторин: «своё предложение» в проверку не входит, поэтому ротация идёт по ней. */
const QUIZ_ROTATION: readonly ActivityType[] = ["choice", "gap-fill", "word-order"];

/** Тип викторины по ротации: следующий после последнего, поэтому подряд ничего не повторяется. */
export function rotationAfter(types: readonly ActivityType[]): ActivityType {
    const previous = types[types.length - 1];
    const at = previous === undefined ? -1 : QUIZ_ROTATION.indexOf(previous);

    return QUIZ_ROTATION[(at + 1) % QUIZ_ROTATION.length] as ActivityType;
}

/** Тип активности следующего хода: своё предложение после трёх верных, иначе тип по виду ошибки. */
export function nextActivityType(
    errorType: LessonErrorType | null,
    correctStreak: number,
    last: readonly ActivityType[]
): ActivityType {
    if (correctStreak >= RULE_MASTERY_STREAK + 1) return "sentence";

    const mapped = errorType === null ? null : QUIZ_BY_ERROR[errorType];

    if (mapped === null) return rotationAfter(last);

    // ARCHITECT: один тип викторины не идёт три хода подряд: третий повтор заменяется ротацией.
    const previous = last[last.length - 1];
    const before = last[last.length - 2];

    if (previous === mapped && before === mapped) return rotationAfter(last);

    return mapped;
}

/** Викторина по виду ошибки: неверное время — выбор, форма — пропуск, порядок — сборка предложения. */
const QUIZ_BY_ERROR: Record<LessonErrorType, ActivityType> = {
    tense: "choice",
    form: "gap-fill",
    order: "word-order",
};

/** Директивы хода по состоянию и остатку: этап, темп, слово, викторина, рамка и лимиты длины. */
export function turnDirectives(state: LessonState, turnsLeft: number): LessonDirectives {
    const turnIndex = state.turn_index + 1;
    // ARCHITECT: жёсткий потолок в 18 ходов задаёт LAST: темпа ниже уже не бывает.
    const pacing =
        turnIndex >= MAX_LESSON_TURNS
            ? "LAST"
            : pacingFor(turnsLeft, wordsNotIntroduced(state), state.rule.mastered);
    const nextWord = nextHiddenWord(state);
    const wrap = state.stage === "S6" || turnsLeft <= 0 || turnIndex >= MAX_LESSON_TURNS;
    // ARCHITECT: на ходу с открытой ошибкой слово не вводится, кроме FINAL и последнего хода по расписанию:
    // расписание слов жёсткое (2k), поэтому дедлайн сильнее мягкого гейта.
    const deadline = nextWord === null ? 0 : wordDeadline(state.words.indexOf(nextWord) + 1);
    const errorGate = state.rule.open_error !== null && pacing !== "FINAL" && turnIndex < deadline;
    const wordDue = !wrap && nextWord !== null && state.next_word_due <= turnIndex && !errorGate;
    const inPractice = state.stage === "S3" || state.stage === "S4";
    const quizRequired =
        !wrap &&
        inPractice &&
        (state.rule.open_error !== null || turnIndex % QUIZ_EVERY_TURNS !== 0);
    const scene = sceneById(state.seed);
    const position = seedPosition(state.seed);

    return {
        // ARCHITECT: S0 — служебный старт: первый ход урока всегда крючок S1, дальше этап берётся из состояния.
        stage: state.stage === "S0" ? "S1" : state.stage,
        turnIndex,
        turnsLeft,
        pacing,
        wordsNotIntroduced: wordsNotIntroduced(state),
        wordDue,
        nextWord: wordDue ? nextWord : null,
        quizRequired,
        activityType: state.next_activity_type,
        // ARCHITECT: «своё предложение» проверкой не является: обязательная викторина берёт тип из ротации.
        quizType:
            state.next_activity_type === "sentence"
                ? rotationAfter(state.last_activity_types)
                : state.next_activity_type,
        frame: frameFor(position, turnIndex),
        seedSetting: scene.setting,
        seedAllows: scene.allows,
        twist: state.twist ?? twistFor(position, turnIndex),
        // ARCHITECT: вход в режим отличается от прошлого хода: предупреждение звучит один раз, а не каждый ход.
        warning: (pacing === "TIGHT" || pacing === "FINAL") && pacing !== state.pacing_mode,
        wrap,
        limits: WORD_LIMITS[pacing],
        weakPatterns: state.weak_patterns,
        wordsPerTurn: pacing === "FINAL" ? FINAL_WORDS_PER_TURN : 1,
    };
}

/** Ход глазами движка: то, что сервер посчитал по реплике ученика, ответу викторины и карточкам. */
export interface LessonTurnInput {
    readonly message: string;
    /** Предыдущая реплика ученика из истории: верным считается только другое предложение. */
    readonly previousMessage: string | null;
    readonly hasError: boolean;
    readonly errorType: LessonErrorType | null;
    /** Итог проверки ответа викторины сервером: null — ответа в запросе не было. */
    readonly quizCorrect: boolean | null;
    /** Слово, карточка которого показана в этом ходу: её показала модель или собрал сервер. */
    readonly introducedWord: string | null;
    /** Слово, узнанное учеником в викторине. */
    readonly recognizedWord: string | null;
    /** Слово, употреблённое учеником самостоятельно. */
    readonly producedWord: string | null;
    /** Текст правила: на третьей повторной ошибке он помечается слабым. */
    readonly pattern: string | null;
    readonly tokens: number;
    readonly turnsLeft: number;
}

/** Метрики правила после хода: верные в разных предложениях, серия и открытая ошибка. */
function nextRule(previous: LessonRuleState, turn: LessonTurnInput): LessonRuleState {
    // ARCHITECT: верным считается ход без значимой ошибки, без провала викторины и в другом предложении:
    // повтор той же фразы правило не закрепляет.
    const isNewSentence =
        turn.previousMessage === null ||
        normalizeSentence(turn.previousMessage) !== normalizeSentence(turn.message);
    const correct = !turn.hasError && turn.quizCorrect !== false && isNewSentence;
    const total = correct ? previous.correct_total + 1 : previous.correct_total;
    const streak = correct ? previous.correct_streak + 1 : 0;
    const repeated = previous.open_error !== null && previous.open_error.type === turn.errorType;
    const openError =
        turn.hasError && turn.errorType !== null
            ? { type: turn.errorType, count: repeated ? (previous.open_error?.count ?? 0) + 1 : 1 }
            : correct
              ? null
              : previous.open_error;

    return {
        correct_total: total,
        correct_streak: streak,
        mastered: total >= RULE_MASTERY_TOTAL && streak >= RULE_MASTERY_STREAK,
        open_error: openError,
    };
}

/** Статус слова двигается только вперёд: узнанное не возвращается в скрытые. */
function withWordStatus(
    words: readonly LessonWord[],
    term: string | null,
    status: LessonWordStatus
): LessonWord[] {
    if (term === null) return [...words];

    const target = normalizeSentence(term);

    return words.map((word) => {
        if (normalizeSentence(word.word) !== target) return word;
        if (LESSON_WORD_STATUSES.indexOf(status) <= LESSON_WORD_STATUSES.indexOf(word.status))
            return word;

        return { ...word, status };
    });
}

/** Паттерн помечается слабым на третьей повторной ошибке и возвращается в проверку. */
function withWeakPattern(
    patterns: readonly string[],
    rule: LessonRuleState,
    pattern: string | null
): string[] {
    if (pattern === null) return [...patterns];
    if (rule.open_error === null || rule.open_error.count < WEAK_PATTERN_LIMIT)
        return [...patterns];
    if (patterns.includes(pattern)) return [...patterns];

    return [...patterns, pattern];
}

interface StageInput {
    readonly previous: LessonStage;
    readonly turnIndex: number;
    readonly turnsLeft: number;
    readonly rule: LessonRuleState;
    readonly allIntroduced: boolean;
    readonly checksDone: number;
}

/** Этап следующего хода: переходы заданы спецификацией, а не моделью. */
function nextStage(input: StageInput): LessonStage {
    if (input.turnsLeft <= 0 || input.turnIndex >= MAX_LESSON_TURNS) return "S6";
    if (input.previous === "S6") return "S6";
    if (input.rule.open_error !== null && input.rule.open_error.count >= WEAK_PATTERN_LIMIT)
        return "S4";
    if (input.previous === "S4") return "S3";
    if (input.previous === "S5") return input.checksDone >= CHECKS_IN_REVIEW ? "S6" : "S5";
    // ARCHITECT: этап считается для предстоящего хода: после хода 1 идёт разминка S2, с хода 4 — практика.
    const upcoming = input.turnIndex + 1;

    if (upcoming <= HOOK_TURNS) return "S1";
    if (upcoming <= HOOK_TURNS + PRIME_TURNS) return "S2";
    if ((input.rule.mastered && input.allIntroduced) || input.turnsLeft <= 1) return "S5";

    return "S3";
}

/**
 * Ход урока: считает метрики правила, двигает статусы слов, выбирает этап, тип активности, расписание
 * следующего слова и сохраняет контекст хода. Возвращает состояние для сохранения в jsonb.
 */
export function applyTurn(state: LessonState, turn: LessonTurnInput): LessonState {
    const turnIndex = state.turn_index + 1;
    const rule = nextRule(state.rule, turn);
    const words = withWordStatus(
        withWordStatus(
            withWordStatus(state.words, turn.introducedWord, "introduced"),
            turn.recognizedWord,
            "recognized"
        ),
        turn.producedWord,
        "produced"
    );
    const firstHidden = words.findIndex((word) => word.status === "hidden");
    const allIntroduced = firstHidden < 0;
    const checksDone =
        state.stage === "S5" && turn.quizCorrect === true
            ? Math.min(state.checks_done + 1, CHECKS_IN_REVIEW)
            : state.checks_done;
    const activity = nextActivityType(
        turn.errorType,
        rule.correct_streak,
        state.last_activity_types
    );
    const remaining = words.filter((word) => word.status === "hidden").length;
    // ARCHITECT: жёсткий потолок урока задаёт LAST независимо от остатка квоты: дальше только итог.
    const pacing =
        turnIndex >= MAX_LESSON_TURNS
            ? "LAST"
            : pacingFor(turn.turnsLeft, remaining, rule.mastered);

    return {
        ...state,
        stage: nextStage({
            previous: state.stage,
            turnIndex,
            turnsLeft: turn.turnsLeft,
            rule,
            allIntroduced,
            checksDone,
        }),
        turn_index: turnIndex,
        turns_left: turn.turnsLeft,
        pacing_mode: pacing,
        rule,
        words,
        next_word_due: allIntroduced ? MAX_LESSON_TURNS + 1 : wordTarget(firstHidden + 1),
        next_activity_type: activity,
        last_activity_types: [...state.last_activity_types, activity].slice(-RECENT_CONTEXT_LIMIT),
        recent_contexts: [
            ...state.recent_contexts,
            { text: turn.message.slice(0, 2000), tokens: Math.min(turn.tokens, 100_000) },
        ].slice(-RECENT_CONTEXT_LIMIT),
        twist: state.twist ?? twistFor(seedPosition(state.seed), turnIndex),
        weak_patterns: withWeakPattern(state.weak_patterns, rule, turn.pattern),
        checks_done: checksDone,
    };
}

/** Карточка слова, собранная сервером: термин, значение и пример берутся из состояния урока. */
export function fallbackWordCard(word: LessonWord): VocabWord {
    return { term: word.word, translation: word.meaning, context: word.example };
}

/** Идентификаторы вариантов выбора: те же короткие строки, что ждёт схема карточек. */
const OPTION_IDS = ["a", "b", "c", "d"] as const;

/** Экранирование термина перед подстановкой в регулярное выражение. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Викторина, собранная сервером: пропуск, выбор или сборка предложения из примера слова урока. Вопросы
 * на английском, верный ответ входит в карточку и сохраняется, поэтому проверка остаётся серверной.
 */
export function fallbackQuiz(
    state: LessonState,
    word: LessonWord,
    type: ActivityType
): Quiz | null {
    const gap = word.example.replace(new RegExp(`\\b${escapeRegExp(word.word)}\\b`, "i"), "___");
    const sentence = `Choose the right option: ${gap}`;

    if (type === "word-order") {
        const parts = word.example.split(/\s+/).slice(0, 12);

        if (parts.length < 2) return null;

        return {
            type: "word-order",
            prompt: "Put the words in the right order.",
            words: parts,
            answer: word.example,
        };
    }

    if (type === "choice") {
        const others = state.words
            .filter((item) => normalizeSentence(item.word) !== normalizeSentence(word.word))
            .slice(0, OPTION_IDS.length - 1)
            .map((item) => item.word);

        if (others.length === 0) return null;

        // ARCHITECT: верный вариант встаёт не первым: его место задаёт номер хода, иначе выбор решается
        // нажатием первой кнопки, а не знанием слова.
        const at = state.turn_index % (others.length + 1);
        const texts = [...others];
        texts.splice(at, 0, word.word);

        return {
            type: "choice",
            prompt: sentence,
            options: texts.map((text, index) => ({
                id: OPTION_IDS[index] ?? "d",
                text,
            })),
            answerId: OPTION_IDS[at] ?? "a",
        };
    }

    return { type: "gap-fill", prompt: `Fill in the gap: ${gap}`, answer: word.word };
}

/**
 * Проверка ответа викторины сервером: сверка идёт с верным ответом сохранённой карточки, а не с тем, что
 * пришло от клиента (§16.2). null — проверять нечего: викторины не было.
 */
export function verifyQuizAnswer(quiz: Quiz | null, answer: string): boolean | null {
    if (quiz === null) return null;

    const given = normalizeSentence(answer);

    if (quiz.type === "choice") return given === normalizeSentence(quiz.answerId);

    return given === normalizeSentence(quiz.answer);
}

/** Блок слов итогового хода: слово, значение и статус — рисует клиент. */
export function toWordViews(state: LessonState): LessonWordView[] {
    return state.words.map(({ word, meaning, status }) => ({ word, meaning, status }));
}

/** Упоминание слова как отдельного слова: подстрока внутри другого слова счётчику не считается. */
function mentionsWord(word: string, text: string): boolean {
    return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);
}

/** Слово урока, употреблённое учеником в реплике: по нему ставится статус produced. */
export function producedWordIn(words: readonly LessonWord[], message: string): string | null {
    return words.find((word) => mentionsWord(word.word, message))?.word ?? null;
}

/** Слово урока, о котором спрашивает викторина: по верному ответу оно становится узнанным. */
export function quizWordIn(words: readonly LessonWord[], quiz: Quiz | null): string | null {
    if (quiz === null) return null;

    const text = JSON.stringify(quiz).toLowerCase();

    return words.find((word) => text.includes(word.word.toLowerCase()))?.word ?? null;
}
