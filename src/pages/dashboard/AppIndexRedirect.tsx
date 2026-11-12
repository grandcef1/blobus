// ARCHITECT: точка входа /app. Раньше index-редирект вёл на «Обзор», а чат без id — в раздел
// «Сессии», из-за чего вход в приложение мог привести на экран без активной сессии. Теперь /app
// открывает последнюю сессию, а если сессий нет — список сессий с кнопкой создания.

import { Navigate } from "react-router-dom";
import { getSessions } from "@/api/sessions";

export function AppIndexRedirect() {
    const [lastSession] = getSessions();

    if (lastSession) {
        return <Navigate to={`/app/chat/${lastSession.id}`} replace />;
    }

    return <Navigate to="/app/sessions" replace />;
}
