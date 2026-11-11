// ARCHITECT: заглушка отправки сообщения. Пока бэкенда нет, реплика пользователя просто
// попадает в хранилище сессий (api/sessions), поэтому в чате видно отправленное, а не только
// ответ мока. Замена на реальный запрос делается здесь одной функцией.

import { appendMessage, getSessionById } from "@/api/sessions";
import type { EnhancedChatSession } from "@/types/session";

export function sendMessage(sessionId: string, content: string): EnhancedChatSession | undefined {
    const text = content.trim();
    if (!text) return getSessionById(sessionId);

    return appendMessage(sessionId, { role: "user", content: text });
}
