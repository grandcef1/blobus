// ARCHITECT: хранилище результата теста уровня — мок в памяти: живёт до перезагрузки страницы,
// как и остальные мок-сторы проекта (api/sessions). После подключения бэкенда здесь единственная
// точка замены: запись результата теста и чтение последнего результата в профиль.

import type { PlacementResult } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";

let stored: PlacementResult | null = null;

export function saveResult(result: PlacementResult): PlacementResult {
    stored = result;

    return stored;
}

export function getResult(): PlacementResult | null {
    return stored;
}

// ARCHITECT: аудирование дозаписывается в уже сохранённый результат. Если основного теста ещё не
// было (например, профиль открыли раньше мастера), уровень аудирования хранить некуда — тогда
// функция возвращает null, и вызывающий видит, что результат не сохранён.
export function saveListeningResult(level: EnglishLevel): PlacementResult | null {
    if (stored === null) return null;

    stored = { ...stored, listening: level, listeningSkipped: false };

    return stored;
}