// ARCHITECT: чистая логика адаптивного теста — без React и без побочных эффектов, поэтому её
// можно прогонять в тестах и вызывать из любого шага. Методология подачи взята у EF SET
// (efset.org): адаптивность, выравнивание по CEFR и шкала 0-100; полосы уровней ниже.
// ARCHITECT: банк заданий авторский (см. api/mocks/placementTest) — задания EF SET и Cambridge
// проприетарны.

import { PLACEMENT_ITEMS } from "@/api/mocks/placementTest";
import type { PlacementItem, PlacementResult } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";

export type PlacementTrack = "grammar" | "general";

const LEVEL_ORDER: readonly EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Полосы EF SET на шкале 0-100. Тест стартует с A1, поэтому pre-A1 (0-20) не используется. */
const LEVEL_BANDS: Record<EnglishLevel, readonly [number, number]> = {
    A1: [21, 30],
    A2: [31, 40],
    B1: [41, 50],
    B2: [51, 60],
    C1: [61, 70],
    C2: [71, 100],
};

/** Одна строка о том, что уровень значит на практике — без оценок и мотивации. */
export const LEVEL_DESCRIPTIONS: Record<EnglishLevel, string> = {
    A1: "Отдельные слова и простые фразы о себе и повседневных вещах.",
    A2: "Короткие фразы в знакомых бытовых ситуациях.",
    B1: "Разговор на знакомые темы, описание опыта и планов.",
    B2: "Свободное обсуждение рабочих и абстрактных тем с аргументацией.",
    C1: "Беглая гибкая речь, сложные тексты и подтекст.",
    C2: "Понимание практически всего, включая тонкие оттенки смысла.",
};

const START_LEVEL: EnglishLevel = "A2";
// ARCHITECT: 10 вопросов на дорожку — 20 на тест: при спокойном темпе это около семи минут, как
// обещает лендинг. Оценка уровня идёт по последним четырём ответам — на десяти вопросах окно в три
// было слишком чувствительно к одной случайной ошибке.
const ITEMS_PER_TRACK = 10;
const RECENT_WINDOW = 4;
/** Смещения поиска задания, когда на текущем уровне вопросы израсходованы. */
const LEVEL_OFFSETS = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5];

export interface PlacementTrackState {
    level: EnglishLevel;
    asked: number;
    correct: number;
    /** Окно последних ответов: по нему считается уровень дорожки. */
    recent: Array<{ level: EnglishLevel; correct: boolean }>;
}

export interface PlacementState {
    grammar: PlacementTrackState;
    general: PlacementTrackState;
    /** Чья очередь отвечать: дорожки чередуются, поэтому вопросов в них поровну. */
    turn: PlacementTrack;
    answeredItemIds: string[];
    finished: boolean;
}

function levelIndex(level: EnglishLevel): number {
    return LEVEL_ORDER.indexOf(level);
}

function clampLevel(index: number): EnglishLevel {
    return LEVEL_ORDER[Math.min(Math.max(index, 0), LEVEL_ORDER.length - 1)];
}

function shiftLevel(level: EnglishLevel, delta: number): EnglishLevel {
    return clampLevel(levelIndex(level) + delta);
}

function emptyTrack(): PlacementTrackState {
    return { level: START_LEVEL, asked: 0, correct: 0, recent: [] };
}

export function createPlacementState(): PlacementState {
    return {
        grammar: emptyTrack(),
        general: emptyTrack(),
        turn: "grammar",
        answeredItemIds: [],
        finished: false,
    };
}

export function totalQuestions(): number {
    return ITEMS_PER_TRACK * 2;
}

export function askedQuestions(state: PlacementState): number {
    return state.grammar.asked + state.general.asked;
}

// ARCHITECT: подбор задания — ближайший по уровню неиспользованный вопрос дорожки. Если уровень
// исчерпан, он смещается на один шаг, поэтому тест не обрывается раньше, чем закроются обе дорожки.
function pickItem(
    state: PlacementState,
    track: PlacementTrack,
    level: EnglishLevel
): PlacementItem | null {
    const used = new Set(state.answeredItemIds);

    for (const offset of LEVEL_OFFSETS) {
        const candidate = clampLevel(levelIndex(level) + offset);
        const item = PLACEMENT_ITEMS.find(
            (entry) => entry.skill === track && entry.level === candidate && !used.has(entry.id)
        );
        if (item) return item;
    }

    return null;
}

export function nextItem(state: PlacementState): PlacementItem | null {
    if (state.finished) return null;

    const track = state.turn;

    if (state[track].asked < ITEMS_PER_TRACK) {
        return pickItem(state, track, state[track].level);
    }

    const other: PlacementTrack = track === "grammar" ? "general" : "grammar";
    if (state[other].asked >= ITEMS_PER_TRACK) return null;

    return pickItem(state, other, state[other].level);
}

export function applyAnswer(
    state: PlacementState,
    itemId: string,
    optionId: string
): PlacementState {
    const item = PLACEMENT_ITEMS.find((entry) => entry.id === itemId);
    if (!item || item.skill === "listening") return state;
    // ARCHITECT: повторный ответ на тот же вопрос состояние не меняет — логика идемпотентна,
    // даже если интерфейс ошибётся и вызовет её дважды.
    if (state.answeredItemIds.includes(itemId)) return state;

    const track: PlacementTrack = item.skill;
    const correct = item.correctOptionId === optionId;
    const current = state[track];

    const updatedTrack: PlacementTrackState = {
        level: shiftLevel(current.level, correct ? 1 : -1),
        asked: current.asked + 1,
        correct: current.correct + (correct ? 1 : 0),
        recent: [...current.recent, { level: item.level, correct }].slice(-RECENT_WINDOW),
    };

    const nextState: PlacementState = {
        ...state,
        grammar: track === "grammar" ? updatedTrack : state.grammar,
        general: track === "general" ? updatedTrack : state.general,
    };

    return {
        ...nextState,
        answeredItemIds: [...state.answeredItemIds, itemId],
        finished:
            nextState.grammar.asked >= ITEMS_PER_TRACK &&
            nextState.general.asked >= ITEMS_PER_TRACK,
        turn: track === "grammar" ? "general" : "grammar",
    };
}

// ARCHITECT: уровень дорожки — средний уровень последних вопросов с учётом верности: верный ответ
// тянет оценку на полшага вверх, неверный — на полшага вниз, округление вниз. Так оценка не
// прыгает из-за одного случайного ответа.
function estimateLevel(track: PlacementTrackState): EnglishLevel {
    if (track.recent.length === 0) return START_LEVEL;

    const sum = track.recent.reduce(
        (total, answer) => total + levelIndex(answer.level) + (answer.correct ? 0.5 : -0.5),
        0
    );

    return clampLevel(Math.floor(sum / track.recent.length));
}

// ARCHITECT: шкала 0-100 по полосам EF SET — середина полосы уровня плюс поправка на точность
// внутри полосы. Балл никогда не выходит за полосу: иначе он противоречил бы показанному уровню.
function scoreFor(level: EnglishLevel, accuracy: number): number {
    const [min, max] = LEVEL_BANDS[level];
    const middle = (min + max) / 2;
    const half = (max - min) / 2;
    const score = middle + (accuracy - 0.5) * 2 * half;

    return Math.round(Math.min(max, Math.max(min, score)));
}

/** Уровень аудирования по числу верных ответов. Оценка понимания на слух, не произношения. */
export function estimateListeningLevel(correct: number, total: number): EnglishLevel {
    if (total <= 0) return "A1";

    const ratio = correct / total;
    const thresholds: ReadonlyArray<{ ratio: number; level: EnglishLevel }> = [
        { ratio: 0.95, level: "C2" },
        { ratio: 0.8, level: "C1" },
        { ratio: 0.6, level: "B2" },
        { ratio: 0.4, level: "B1" },
        { ratio: 0.2, level: "A2" },
    ];

    return thresholds.find((entry) => ratio >= entry.ratio)?.level ?? "A1";
}

// ARCHITECT: аудирование приходит вторым аргументом: тест уровня может пройти его следом, и тогда
// результат сохраняется одним объектом — иначе уровень аудирования терялся бы до записи основного.
export function finalize(
    state: PlacementState,
    listening: EnglishLevel | null = null
): PlacementResult {
    const grammar = estimateLevel(state.grammar);
    const general = estimateLevel(state.general);
    // ARCHITECT: итог — минимум из двух дорожек: сильная дорожка не должна завышать уровень
    // языка, который определяется слабым звеном.
    const overall = clampLevel(Math.min(levelIndex(grammar), levelIndex(general)));

    const asked = askedQuestions(state);
    const correct = state.grammar.correct + state.general.correct;
    const accuracy = asked === 0 ? 0 : correct / asked;

    return {
        score: scoreFor(overall, accuracy),
        overall,
        grammar,
        general,
        listening,
        listeningSkipped: listening === null,
        takenAt: Date.now(),
    };
}