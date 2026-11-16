// ARCHITECT: роли пользователей. Единственное место, где email превращается в роль: и фронт-гейт,
// и будущий бэкенд должны отвечать на один вопрос одинаково, поэтому политика живёт здесь, а не в
// компонентах.
// ARCHITECT: фронт-гейт — это UX (не показывать пункт меню, не открывать экран). Реальная проверка
// роли будет на бэкенде (RLS в Supabase): список email в бандле публичен, полагаться на него как на
// защиту нельзя.

export type UserRole = "admin" | "user";

// ARCHITECT: владелец продукта (git user.email / владелец репозитория). Список намеренно не секрет —
// это UX-список, а не правило доступа к данным.
export const OWNER_EMAILS: readonly string[] = ["gerstep777@gmail.com"];

export function resolveRole(email: string): UserRole {
    return OWNER_EMAILS.includes(email.trim().toLowerCase()) ? "admin" : "user";
}
