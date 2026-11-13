// ARCHITECT: хранилище результата теста уровня — мок в памяти: живёт до перезагрузки страницы,
// как и остальные мок-сторы проекта (api/sessions). После подключения бэкенда здесь единственная
// точка замены: запись результата теста и чтение последнего результата в профиль.

import type { PlacementResult } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { delayMock } from "@/api/mockDelay";

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