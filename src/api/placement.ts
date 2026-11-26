// ARCHITECT: хранилище результата теста уровня — мок в памяти: живёт до перезагрузки страницы,
// как и остальные мок-сторы проекта (api/sessions). После подключения бэкенда здесь единственная
// точка замены: запись результата теста и чтение последнего результата в профиль.

import { apiFetch } from "@/api/client";
import { delayMock } from "@/api/mockDelay";
import { FIXED_PLACEMENT_QUESTIONS, scoreFixedPlacement } from "@/api/mocks/placementFixed";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { USE_MOCKS } from "@/lib/env";
import type { EnglishLevel } from "@/types/onboarding";
import type {
    PlacementAnswerDto,
    PlacementQuestionDto,
    PlacementResult,
    PlacementResultDto,
} from "@/types/placement";

let stored: PlacementResult | null = null;

export function saveResult(result: PlacementResult): PlacementResult {
    stored = result;

    return stored;
}

export function getResult(): PlacementResult | null {
    return stored;
}

// ARCHITECT: профиль читает результат асинхронно: скелетон страницы закрывает и навыки, поэтому
// уровень приходит тем же запросом, что прогресс и данные пользователя.
export async function fetchPlacementResult(): Promise<PlacementResult | null> {
    await delayMock();

    return stored;
}

// ARCHITECT: аудирование дозаписывается в сохранённый результат. Если основного теста ещё не было
// (например, профиль открыли раньше мастера), база собирается из текущего уровня профиля — иначе
// уровень аудирования негде хранить, и подсказка «не проверено» осталась бы навсегда.
export function saveListeningResult(level: EnglishLevel): PlacementResult {
    stored = { ...(stored ?? createFallbackResult()), listening: level, listeningSkipped: false };

    return stored;
}

function createFallbackResult(): PlacementResult {
    const level = MOCK_USER_PROGRESS.currentLevel;

    return {
        score: 0,
        overall: level,
        grammar: level,
        speaking: level,
        general: level,
        listening: null,
        listeningSkipped: true,
        takenAt: Date.now(),
    };
}

// ARCHITECT: серверный placement (банк fixed-30, скоринг и один результат на юзера) живёт в этом же модуле-
// адаптере: мок-ветка работает на фикстуре и локальном скоринге, real-ветка идёт через apiFetch (§9.1,
// §16.13). Экспорты выше — legacy-мок адаптивного движка; UI переключается на функции ниже в C-0d3b.

/** Конверт GET /api/placement: банк, признак прохождения и результат, если он уже есть. */
interface PlacementEnvelope {
    questions: PlacementQuestionDto[];
    completed: boolean;
    result: PlacementResultDto | null;
}

/** Конверт POST /api/placement: балл и уровень считает сервер, клиент их не присылает. */
interface PlacementSubmitEnvelope {
    result: PlacementResultDto;
}

// ARCHITECT: мок-состояние — один результат на сессию страницы, как серверная строка placement_results.
let mockFixedResult: PlacementResultDto | null = null;

/** Вопросы формы: те же 30, что отдаёт сервер, — без верного ответа. */
export async function fetchPlacementQuestions(): Promise<PlacementQuestionDto[]> {
    if (USE_MOCKS) {
        await delayMock();

        return [...FIXED_PLACEMENT_QUESTIONS];
    }

    const { questions } = await apiFetch<PlacementEnvelope>("/placement");

    return questions;
}

// ARCHITECT: тело — полный комплект ответов, балл считает не клиент. Повторная отправка в мок-ветке возвращает
// уже сохранённый результат: та же идемпотентность, что у серверного ответа 200 при существующей строке.
export async function submitPlacementAnswers(
    answers: readonly PlacementAnswerDto[]
): Promise<PlacementResultDto> {
    if (USE_MOCKS) {
        await delayMock();

        if (mockFixedResult !== null) return mockFixedResult;

        mockFixedResult = { ...scoreFixedPlacement(answers), createdAt: new Date().toISOString() };

        return mockFixedResult;
    }

    // ARCHITECT: тело уходит объектом: apiFetch сериализует его сам и сам ставит csrf-заголовок.
    const { result } = await apiFetch<PlacementSubmitEnvelope>("/placement", {
        method: "POST",
        body: { answers },
    });

    return result;
}

// ARCHITECT: «результата нет» сервер отдаёт как result: null (404 для теста уровня не предусмотрен), поэтому
// обе ветки сходятся к одному значению — null.
export async function fetchPlacementResultDto(): Promise<PlacementResultDto | null> {
    if (USE_MOCKS) {
        await delayMock();

        return mockFixedResult;
    }

    const { result } = await apiFetch<PlacementEnvelope>("/placement");

    return result;
}
