// ARCHITECT: Страница чата с сессиями или дашборд

import { useParams } from 'react-router-dom';
import { MOCK_SESSIONS } from '@/api/mocks/sessions';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { DashboardPage } from './DashboardPage';

export function ChatPage() {
    const { sessionId } = useParams<{ sessionId: string }>();

    // ARCHITECT: Если нет sessionId - показываем дашборд
    if (!sessionId) {
        return <DashboardPage />;
    }

    const session = MOCK_SESSIONS.find((s) => s.id === sessionId);

    if (!session) {
        return <DashboardPage />;
    }

    return (
        <div className="flex h-screen flex-col bg-black">
            <ChatHeader session={session} />
            <ChatMessages messages={session.messages} />
            <ChatInput />
        </div>
    );
}