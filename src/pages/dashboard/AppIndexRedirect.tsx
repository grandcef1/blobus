// ARCHITECT: точка входа /app. Мок-режим открывает последнюю сессию, а если сессий нет — список сессий:
// у каждого пути ровно один экран, и вход в приложение не оставляет пользователя на пустом чате.
// ARCHITECT: real-режим всегда ведёт на список: чат реальных сессий подключится в фазе C, поэтому
// уводить на /app/chat/:id даже при наличии сводок нельзя.

import { Navigate } from "react-router-dom";
import { useSessions } from "@/hooks/useSessions";

export function AppIndexRedirect() {
    const result = useSessions();

    // ARCHITECT: пока список грузится, редирект был бы преждевременным: кэш общий с сайдбаром, ждать недолго.
    if (result.isLoading) return null;

    // ARCHITECT: ошибку показывает страница сессий; терминальный 401 обрабатывает useAuthExpiry внутри хука.
    if (result.isError || result.kind === "real") return <Navigate to="/app/sessions" replace />;

    const [last] = result.sessions;

    return last ? (
        <Navigate to={`/app/chat/${last.id}`} replace />
    ) : (
        <Navigate to="/app/sessions" replace />
    );
}
