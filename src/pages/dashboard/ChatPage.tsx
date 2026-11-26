// ARCHITECT: страница чата — только выбор ветки: вклад определяет один флаг мок/реал, а сами виды (мок-ветка на
// хранилище и real-ветка на SSE) живут отдельными компонентами (§5.2: один компонент на файл). Обе ветки
// используют общие шапку, пузырь и поле ввода, поэтому разметка одна, а различаются только источник данных.

import { ChatSessionView } from "@/components/chat/ChatSessionView";
import { RealChatView } from "@/components/chat/RealChatView";
import { USE_MOCKS } from "@/lib/env";

export function ChatPage() {
    return USE_MOCKS ? <ChatSessionView /> : <RealChatView />;
}
