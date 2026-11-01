export type UserRole = 'student' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    }

    export interface Message {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    }

    export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: number;
    messages: Message[];
}