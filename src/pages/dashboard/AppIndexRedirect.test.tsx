// ARCHITECT: index-редирект /app — развилка мок/реал: в real-режиме вход ведёт на список, в мок-режиме
// на последнюю сессию. Навигацию проверяем на маршрутах-заглушках, а не на реальных страницах: сервер,
// QueryClient и словари здесь не нужны.

import { screen } from "@testing-library/react";
import { Route, Routes, useParams } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppIndexRedirect } from "@/pages/dashboard/AppIndexRedirect";
import { renderWithProviders } from "@/test/utils";
import type { SessionSummaryDto } from "@/api/sessions";
import type { SessionsResult } from "@/hooks/useSessions";
import type { EnhancedChatSession } from "@/types/session";

const { useSessionsMock } = vi.hoisted(() => ({ useSessionsMock: vi.fn() }));

vi.mock("@/hooks/useSessions", () => ({ useSessions: useSessionsMock }));

const refetchMock = vi.fn(async () => undefined);

const SUMMARIES: SessionSummaryDto[] = [
    {
        id: "a1b2c3d4-0001-4000-8000-000000000001",
        tutorId: "miya",
        mode: "speaking",
        createdAt: "2026-11-18T09:00:00.000Z",
        updatedAt: "2026-11-18T09:30:00.000Z",
    },
];

const SESSIONS: EnhancedChatSession[] = [
    {
        id: "session-mock-2",
        userId: "user_1",
        title: "Свежая практика",
        createdAt: Date.parse("2026-11-18T10:00:00.000Z"),
        messages: [],
        repetitorId: "nova",
        learningMode: "speaking",
        progress: { completedLessons: 1, totalLessons: 8, wordsLearned: 4, streakDays: 2 },
        lastActivityAt: Date.parse("2026-11-18T10:30:00.000Z"),
    },
    {
        id: "session-mock-1",
        userId: "user_1",
        title: "Прошлая практика",
        createdAt: Date.parse("2026-11-18T08:00:00.000Z"),
        messages: [],
        repetitorId: "miya",
        learningMode: "grammar",
        progress: { completedLessons: 3, totalLessons: 10, wordsLearned: 28, streakDays: 7 },
        lastActivityAt: Date.parse("2026-11-18T08:30:00.000Z"),
    },
];

interface ResultOptions {
    readonly isLoading?: boolean;
    readonly isError?: boolean;
}

// ARCHITECT: явные фабрики вместо спреда Partial: поля возвращаются заполненными, тип результата точный.
function realResult(sessions: SessionSummaryDto[], options: ResultOptions = {}): SessionsResult {
    return {
        kind: "real",
        sessions,
        isLoading: options.isLoading ?? false,
        isError: options.isError ?? false,
        error: null,
        refetch: refetchMock,
    };
}

function mockResult(sessions: EnhancedChatSession[], options: ResultOptions = {}): SessionsResult {
    return {
        kind: "mock",
        sessions,
        isLoading: options.isLoading ?? false,
        isError: options.isError ?? false,
        error: null,
        refetch: refetchMock,
    };
}

/** Заглушка чата печатает id из адреса: так видно, на какую именно сессию ушёл редирект. */
function ChatStub() {
    const { id } = useParams();

    return <p>Чат {id}</p>;
}

/** Маршруты-заглушки: проверяем адрес, на который увёл Navigate, а не содержимое реальных страниц. */
function renderRedirect() {
    return renderWithProviders(
        <Routes>
            <Route path="/app" element={<AppIndexRedirect />} />
            <Route path="/app/sessions" element={<p>Список сессий</p>} />
            <Route path="/app/chat/:id" element={<ChatStub />} />
        </Routes>,
        { route: "/app" }
    );
}

afterEach(() => {
    useSessionsMock.mockReset();
});

describe("AppIndexRedirect", () => {
    it("3.1 real со сводками: ведёт на список сессий, а не в чат", () => {
        useSessionsMock.mockReturnValue(realResult(SUMMARIES));
        renderRedirect();

        expect(screen.getByText("Список сессий")).toBeInTheDocument();
        expect(screen.queryByText(/^Чат/)).not.toBeInTheDocument();
    });

    it("3.2 real пусто: ведёт на список сессий", () => {
        useSessionsMock.mockReturnValue(realResult([]));
        renderRedirect();

        expect(screen.getByText("Список сессий")).toBeInTheDocument();
        expect(screen.queryByText(/^Чат/)).not.toBeInTheDocument();
    });

    it("3.3 mock с сессиями: ведёт в чат последней сессии", () => {
        useSessionsMock.mockReturnValue(mockResult(SESSIONS));
        renderRedirect();

        expect(screen.getByText("Чат session-mock-2")).toBeInTheDocument();
        expect(screen.queryByText("Чат session-mock-1")).not.toBeInTheDocument();
        expect(screen.queryByText("Список сессий")).not.toBeInTheDocument();
    });

    it("3.4 mock пусто: ведёт на список сессий", () => {
        useSessionsMock.mockReturnValue(mockResult([]));
        renderRedirect();

        expect(screen.getByText("Список сессий")).toBeInTheDocument();
        expect(screen.queryByText(/^Чат/)).not.toBeInTheDocument();
    });

    it("3.5a загрузка: редиректа нет, экран пуст", () => {
        useSessionsMock.mockReturnValue(realResult(SUMMARIES, { isLoading: true }));
        const { container } = renderRedirect();

        expect(container.firstChild).toBeNull();
    });

    it("3.5b ошибка: ведёт на список сессий, где покажется разбор ошибки", () => {
        useSessionsMock.mockReturnValue(mockResult(SESSIONS, { isError: true }));
        renderRedirect();

        expect(screen.getByText("Список сессий")).toBeInTheDocument();
        expect(screen.queryByText(/^Чат/)).not.toBeInTheDocument();
    });
});
