// ARCHITECT: производный заголовок сводки сессии — общий для карточки и сайдбара: своей темы у сессии
// в схеме нет, поэтому имя блобатара и метку режима собираем в одном месте. t — переводчик неймспейса
// dashboard: хелпер не знает про react-i18next и остаётся чистой функцией.

import { getBlobatarById } from "@/api/mocks/blobatars";
import type { SessionSummaryDto } from "@/api/sessions";
import type { LearningMode } from "@/types/onboarding";

type ModeLabelKey = "modes.interview" | "modes.speaking" | "modes.grammar" | "modes.general";

// ARCHITECT: типизированный map ключей: известный режим переводим, неизвестный показываем как данные.
const MODE_LABEL_KEYS: Readonly<Record<LearningMode, ModeLabelKey>> = {
    interview: "modes.interview",
    speaking: "modes.speaking",
    grammar: "modes.grammar",
    general: "modes.general",
};

/** Ровно те ключи, которые хелпер запрашивает у переводчика: сужение сохраняет типизацию ключей t(). */
type SessionTitleKey = ModeLabelKey | "sessions.card.tutorFallback";

function isLearningMode(mode: string): mode is LearningMode {
    return Object.prototype.hasOwnProperty.call(MODE_LABEL_KEYS, mode);
}

/** Ключ метки режима для перевода: null — режим неизвестен, и он показывается как данные. */
export function getModeLabelKey(mode: string): ModeLabelKey | null {
    return isLearningMode(mode) ? MODE_LABEL_KEYS[mode] : null;
}

/** Заголовок сводки: своё название, иначе «имя блобатара · метка режима»; неизвестный режим показывается как данные. */
export function getSessionTitle(
    summary: SessionSummaryDto,
    t: (key: SessionTitleKey) => string
): string {
    // ARCHITECT: название задаёт пользователь: пустое, из пробелов или отсутствующее значит «показывать
    // производный заголовок». Проверка типа обязательна: более старый API не отдаёт title, и без неё
    // рассинхрон фронта и бэкенда ронял страницу (RouteErrorBoundary) вместо мягкого фолбэка.
    if (typeof summary.title === "string" && summary.title.trim() !== "") return summary.title;

    const name = getBlobatarById(summary.tutorId)?.name ?? t("sessions.card.tutorFallback");
    const modeKey = getModeLabelKey(summary.mode);
    const modeLabel = modeKey === null ? summary.mode : t(modeKey);

    return `${name} · ${modeLabel}`;
}
