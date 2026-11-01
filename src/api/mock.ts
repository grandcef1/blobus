    import type { ChatSession, Message, User } from './types';

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    export const MOCK_USER: User = {
    id: 'user_1',
    name: 'Alex Developer',
    email: 'alex@blobus.ai',
    role: 'student',
    };

    export const MOCK_SESSIONS: ChatSession[] = [
    {
        id: 'session_1',
        userId: 'user_1',
        title: 'Подготовка к собеседованию (Frontend)',
        createdAt: Date.now() - 86400000,
        messages: [
        {
            id: 'msg_1',
            sessionId: 'session_1',
            role: 'assistant',
            content: 'Привет! Давай потренируем вопросы по React. Начнем с хуков?',
            timestamp: Date.now() - 86000000,
        },
        ],
    },
    ];

    export async function getSessions(): Promise<ChatSession[]> {
    await delay(800);
    return MOCK_SESSIONS;
    }

    export async function sendMessage(sessionId: string, text: string): Promise<Message> {
    await delay(1200);
    
    const aiResponse: Message = {
        id: `msg_${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: `Отличный вопрос про "${text}". Давай разберем это на примере...`,
        timestamp: Date.now(),
    };

    return aiResponse;
    }