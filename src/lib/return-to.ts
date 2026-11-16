// ARCHITECT: защита от open redirect обязана быть тестируемой отдельно от компонента: это security-
// граница, а не деталь формы входа. Правило одно — возвращать только пути внутри приложения.
// ARCHITECT: state.from кладёт ProtectedRoute. Whitelist /app/ сам закрывает "//evil.com", внешние URL и
// схемы вроде javascript: — они не начинаются с /app/. Это единственное место, где state.from читается.

const APP_SEGMENT_PREFIX = "/app/";

/** Возврат в исходную точку входа или null, если она не внутри приложения. */
export function resolveReturnTo(state: unknown): string | null {
    if (typeof state !== "object" || state === null) return null;

    const { from } = state as { from?: unknown };
    if (typeof from !== "string" || !from.startsWith(APP_SEGMENT_PREFIX)) return null;

    return from;
}
