// ARCHITECT: план урока собирается детерминированно, без модели: цель, правило, целевые слова и
// последовательность активностей зависят только от уровня и режима. Модель получает план как данные и не
// решает, что будет на уроке (§16.8), а целевые слова не покидают сервер: наружу уходит только счётчик
// DTO без самих слов — утечь им неоткуда (§16.6).
// ARCHITECT: план живёт в lessons.plan (jsonb, колонка и тип уже есть в схеме core_learning) и обновляется
// после каждого хода: шаг, использованные слова, серия верных ответов, признак завершения.
import { z } from "zod";

export type LessonLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LessonMode = "interview" | "speaking" | "grammar" | "general";

export type LessonActivityId =
    | "quick-choice"
    | "transform"
    | "describe-word"
    | "find-error"
    | "mini-story"
    | "role-play"
    | "opinion";

export type LevelBand = "basic" | "middle" | "advanced";

export type PlanLocale = "ru" | "en" | "es";

/** Фишка хода: не больше одной за ход (см. perkFor). */
export type LessonPerk = "reveal" | "streak" | "fact";

export const LESSON_LEVELS: readonly LessonLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const LESSON_MODES: readonly LessonMode[] = ["interview", "speaking", "grammar", "general"];

// ARCHITECT: тип-алиас, а не интерфейс: неявную индексную подпись получают только объектные типы, поэтому
// в jsonb-колонку lessons.plan план кладётся без приведения типов и без any (§5.3, §16.13).
/** План урока целиком: то, что лежит в lessons.plan. */
export type LessonPlan = {
    readonly version: 1;
    readonly mode: LessonMode;
    readonly level: LessonLevel;
    /** Цель урока: объявляется репетитором и показывается карточкой; локализована на старте урока. */
    readonly goal: string;
    /** Одно правило урока: локализовано на старте урока. */
    readonly rule: string;
    /** Целевые слова урока: скрыты от ученика, наружу не отдаются ни текстом, ни DTO. */
    targetWords: string[];
    /** Уже употреблённые учеником целевые слова: счётчик прогресса карточки. */
    usedWords: string[];
    activities: LessonActivityId[];
    /** Пройдено этапов, 0..activities.length. */
    readonly step: number;
    /** Серия ходов без значимых ошибок. */
    readonly streak: number;
    readonly completed: boolean;
};

const BAND_BY_LEVEL: Record<LessonLevel, LevelBand> = {
    A1: "basic",
    A2: "basic",
    B1: "middle",
    B2: "middle",
    C1: "advanced",
    C2: "advanced",
};

/** Задача урока по режиму: одна строка, которую объявляет репетитор. */
const MODE_GOALS: Record<PlanLocale, Record<LessonMode, string>> = {
    ru: {
        interview: "отвечать на вопросы собеседования уверенно и по структуре",
        speaking: "говорить свободнее в повседневном диалоге",
        grammar: "применять правило сразу в речи",
        general: "расширять повседневную лексику",
    },
    en: {
        interview: "answer interview questions with a clear structure",
        speaking: "speak more freely in everyday conversation",
        grammar: "use the rule straight away in speech",
        general: "grow everyday vocabulary",
    },
    es: {
        interview: "responder con estructura a las preguntas de entrevista",
        speaking: "hablar con más soltura en conversaciones diarias",
        grammar: "usar la regla directamente al hablar",
        general: "ampliar el vocabulario cotidiano",
    },
};

/** Как звучит цель на полосе уровня: длина ответа и связность. */
const BAND_FOCUS: Record<PlanLocale, Record<LevelBand, string>> = {
    ru: {
        basic: "короткими простыми фразами.",
        middle: "связными фразами на два-три предложения.",
        advanced: "развёрнуто, с аргументом и связками.",
    },
    en: {
        basic: "in short simple sentences.",
        middle: "in two or three connected sentences.",
        advanced: "at length, with reasons and linkers.",
    },
    es: {
        basic: "con frases cortas y simples.",
        middle: "con dos o tres frases conectadas.",
        advanced: "con detalle, argumentos y conectores.",
    },
};

/** Правило урока: одна тема на режим, чтобы за урок правило было одно. */
const MODE_RULES: Record<PlanLocale, Record<LessonMode, string>> = {
    ru: {
        interview: "структура ответа: ситуация, действие, результат",
        speaking: "Present Simple для привычек и рутины",
        grammar: "Present Simple и Present Continuous: разница",
        general: "фразы повседневного общения",
    },
    en: {
        interview: "answer structure: situation, action, result",
        speaking: "Present Simple for habits and routines",
        grammar: "Present Simple vs Present Continuous",
        general: "everyday conversation phrases",
    },
    es: {
        interview: "estructura de respuesta: situación, acción, resultado",
        speaking: "Present Simple para hábitos y rutina",
        grammar: "Present Simple frente a Present Continuous",
        general: "frases de conversación cotidiana",
    },
};

/** Целевые слова урока по полосе уровня: пять слов, ученику не показываются. */
const BAND_WORDS: Record<LevelBand, readonly string[]> = {
    basic: ["breakfast", "weekend", "neighbour", "tired", "shopping"],
    middle: ["deadline", "improve", "decision", "reliable", "opportunity"],
    advanced: ["trade-off", "assumption", "leverage", "nuance", "constraint"],
};

/** Порядок активностей урока: ротация обходит этот круг, подряд ничего не повторяется. */
export const ACTIVITY_CYCLE: readonly LessonActivityId[] = [
    "quick-choice",
    "transform",
    "describe-word",
    "find-error",
    "mini-story",
    "role-play",
    "opinion",
];

/** Сколько активностей в уроке: план на один урок, а не на сессию целиком. */
export const ACTIVITIES_PER_LESSON = 6;
/** Серия верных ответов, с которой репетитор отмечает прогресс. */
export const STREAK_THRESHOLD = 3;
/** Раз в столько ходов уместен один короткий факт о языке. */
export const FACT_EVERY_STEPS = 3;

/** Инструкция активности для промпта: русский текст видит только модель, ученику он не уходит. */
export const ACTIVITY_LINES: Record<LessonActivityId, string> = {
    "quick-choice": "быстрый выбор: дай два-три варианта, ученик выбирает подходящий и объясняет выбор",
    transform: "трансформация предложения: попроси переделать свою фразу — время, вопрос, отрицание",
    "describe-word": "опиши слово без называния: ученик объясняет слово своими словами, не произнося его",
    "find-error": "найди ошибку: одно предложение с одной ошибкой, ученик исправляет и объясняет",
    "mini-story": "мини-история: ученик отвечает двумя-тремя предложениями по заданной ситуации",
    "role-play": "ролевая сцена: ты играешь вторую роль и ведёшь реплику за неё",
    opinion: "мнение с аргументом: ученик отвечает на вопрос и объясняет почему",
};

// ARCHITECT: строку читает тот же сервер, но доверять ей нельзя: jsonb мог быть испорчен или записан другой
// версией плана, поэтому план разбирается схемой с границами (§16.6, §16.13).
const LessonPlanSchema = z.strictObject({
    version: z.literal(1),
    mode: z.enum(LESSON_MODES),
    level: z.enum(LESSON_LEVELS),
    goal: z.string().min(1).max(300),
    rule: z.string().min(1).max(300),
    targetWords: z.array(z.string().min(1).max(64)).min(1).max(8),
    usedWords: z.array(z.string().min(1).max(64)).max(8),
    activities: z.array(z.enum(ACTIVITY_CYCLE)).min(1).max(8),
    step: z.number().int().min(0).max(8),
    streak: z.number().int().min(0).max(999),
    completed: z.boolean(),
});

/** План из jsonb: null — строка пуста, бита или записана другой версией; вызывающий строит новый план. */
export function readLessonPlan(value: unknown): LessonPlan | null {
    const parsed = LessonPlanSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
}

export interface LessonPlanInput {
    readonly level: LessonLevel;
    readonly mode: LessonMode;
    readonly locale: PlanLocale;
}

// ARCHITECT: вход в круг активностей зависит только от уровня и режима: у одинаковых уроков план один и тот
// же (детерминированность держит тест), а ACTIVITIES_PER_LESSON меньше длины круга — значит подряд одна
// активность не встанет.
function activitiesFor(level: LessonLevel, mode: LessonMode): LessonActivityId[] {
    const offset =
        (LESSON_LEVELS.indexOf(level) * 2 + LESSON_MODES.indexOf(mode)) % ACTIVITY_CYCLE.length;

    return Array.from(
        { length: ACTIVITIES_PER_LESSON },
        (_, index) => ACTIVITY_CYCLE[(offset + index) % ACTIVITY_CYCLE.length]
    );
}

/** План урока по уровню и режиму: то же сочетание всегда даёт тот же план. */
export function buildLessonPlan(input: LessonPlanInput): LessonPlan {
    const band = BAND_BY_LEVEL[input.level];

    return {
        version: 1,
        mode: input.mode,
        level: input.level,
        goal: `${MODE_GOALS[input.locale][input.mode]} ${BAND_FOCUS[input.locale][band]}`,
        rule: MODE_RULES[input.locale][input.mode],
        targetWords: [...BAND_WORDS[band]],
        usedWords: [],
        activities: activitiesFor(input.level, input.mode),
        step: 0,
        streak: 0,
        completed: false,
    };
}

/** Активность текущего этапа: за пределами плана возвращается последняя. */
export function activityAt(plan: LessonPlan): LessonActivityId {
    return plan.activities[Math.min(plan.step, plan.activities.length - 1)];
}

/** Режим строки сессии в режим плана: неизвестное значение ведёт себя как общий английский. */
export function modeOf(value: string): LessonMode {
    return LESSON_MODES.find((mode) => mode === value) ?? "general";
}

// ARCHITECT: слово считается употреблённым только как отдельное слово: подстрока внутри другого слова не
// должна двигать счётчик прогресса.
function mentions(text: string, word: string): boolean {
    return new RegExp(`\\b${word}\\b`, "i").test(text);
}

export interface PlanTurnInput {
    readonly studentMessage: string;
    /** Есть ли в ходу значимая ошибка: считается по уже отфильтрованным правкам, а не по сырому ответу. */
    readonly hasError: boolean;
}

/** Ход урока: шаг вперёд, целевые слова из реплики ученика, серия верных ответов и признак завершения. */
export function advancePlan(plan: LessonPlan, turn: PlanTurnInput): LessonPlan {
    const used = new Set(plan.usedWords);

    for (const word of plan.targetWords) if (mentions(turn.studentMessage, word)) used.add(word);

    const step = Math.min(plan.step + 1, plan.activities.length);

    return {
        ...plan,
        // ARCHITECT: порядок целевых слов сохраняется: счётчик прогресса не зависит от того, в каком порядке
        // ученик употреблял слова.
        usedWords: plan.targetWords.filter((word) => used.has(word)),
        step,
        streak: turn.hasError ? 0 : plan.streak + 1,
        completed: step >= plan.activities.length,
    };
}

/** Фишка хода: не больше одной. Приоритет — раскрытие слова урока, затем серия, затем факт о языке. */
export function perkFor(plan: LessonPlan): LessonPerk | null {
    if (plan.step + 1 >= plan.activities.length) return "reveal";
    if (plan.streak >= STREAK_THRESHOLD) return "streak";
    if (plan.step > 0 && plan.step % FACT_EVERY_STEPS === 0) return "fact";

    return null;
}

/** Слово урока: первое ещё не употреблённое целевое слово — его раскрывают в конце урока. */
export function revealWord(plan: LessonPlan): string {
    return plan.targetWords.find((word) => !plan.usedWords.includes(word)) ?? plan.targetWords[0];
}

/** То, что уходит клиенту: цель, правило и счётчики — без целевых слов. */
export interface LessonPlanDto {
    readonly goal: string;
    readonly rule: string;
    readonly step: number;
    readonly total: number;
    readonly wordsDone: number;
    readonly wordsTotal: number;
    readonly completed: boolean;
}

/** DTO карточки цели: тип не содержит целевых слов, поэтому утечь им неоткуда по конструкции. */
export function toLessonPlanDto(plan: LessonPlan): LessonPlanDto {
    return {
        goal: plan.goal,
        rule: plan.rule,
        step: Math.min(plan.step, plan.activities.length),
        total: plan.activities.length,
        wordsDone: plan.usedWords.length,
        wordsTotal: plan.targetWords.length,
        completed: plan.completed,
    };
}
