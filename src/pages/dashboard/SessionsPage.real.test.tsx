// ARCHITECT: страница проверяется на моке useSessions — сервер здесь не нужен, контракт чтения уже
// покрыт server/routes/sessions.test.ts. Негативные проверки обязательны: пустой real-список без
// действия, ошибка с повтором, отсутствие моковых полей и ссылка на чат в реальной строке.

import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionsPage } from "@/pages/dashboard/SessionsPage";
import { renderWithProviders } from "@/test/utils";
import type { SessionSummaryDto } from "@/api/sessions";
import type { SessionsResult } from "@/hooks/useSessions";
import type { EnhancedChatSession } from "@/types/session";

const { useSessionsMock } = vi.hoisted(() => ({ useSessionsMock: vi.fn() }));

vi.mock("@/hooks/useSessions", () => ({ useSessions: useSessionsMock }));

const refetchMock = vi.fn(async () => undefined);

const SUMMARY_ID = "a1b2c3d4-0001-4000-8000-000000000001";

const SUMMARIES: SessionSummaryDto[] = [
    {
        id: SUMMARY_ID,
        tutorId: "miya",
        mode: "speaking",
        createdAt: "2026-11-18T09:00:00.000Z",
        updatedAt: "2026-11-18T09:30:00.000Z",
    },
];

const MOCK_SESSION: EnhancedChatSession = {
    id: "session-mock-1",
    userId: "user_1",
    title: "Практика разговора",
    createdAt: Date.parse("2026-11-18T09:00:00.000Z"),
    messages: [],
    repetitorId: "miya",
    learningMode: "speaking",
    progress: { completedLessons: 3, totalLessons: 10, wordsLearned: 28, streakDays: 7 },
    lastActivityAt: Date.parse("2026-11-18T09:30:00.000Z"),
};

interface RealResultOptions {
    readonly sessions?: SessionSummaryDto[];
    readonly isLoading?: boolean;
    readonly isError?: boolean;
    readonly error?: unknown;
}

// ARCHITECT: явные фабрики вместо спреда Partial: поля возвращаются заполненными, тип результата точный.
function realResult(options: RealResultOptions = {}): SessionsResult {
    return {
        kind: "real",
        sessions: options.sessions ?? [],
        isLoading: options.isLoading ?? false,
        isError: options.isError ?? false,
        error: options.error ?? null,
        refetch: refetchMock,
    };
}

function mockResult(sessions: EnhancedChatSession[]): SessionsResult {
    return {
        kind: "mock",
        sessions,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchMock,
    };
}

beforeEach(() => {
    refetchMock.mockClear();
});

afterEach(() => {
    useSessionsMock.mockReset();
});

describe("SessionsPage на реальных сводках", () => {
    it("6.1 real empty: заголовок и описание есть, действия /session/new нет", () => {
        useSessionsMock.mockReturnValue(realResult());
        renderWithProviders(<SessionsPage />);

        expect(screen.getByText("Пока нет ни одной сессии")).toBeInTheDocument();
        expect(
            screen.getByText("Начните диалог с репетитором — он появится в этом списке.")
        ).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("6.2 real list: строка — ссылка на /app/chat/:id с именем блобатара, без моковых полей", () => {
        useSessionsMock.mockReturnValue(realResult({ sessions: SUMMARIES }));
        renderWithProviders(<SessionsPage />);

        const link = screen.getByRole("link", { name: /Мия · Разговор/ });

        // ARCHITECT: реальная сессия открывает чат так же, как мок-карточка: раздел «Сессии» — вход в тему.
        expect(link).toHaveAttribute("href", `/app/chat/${SUMMARY_ID}`);
        expect(screen.getByRole("heading", { name: "Мия · Разговор" })).toBeInTheDocument();
        expect(screen.queryByText("Завершена")).not.toBeInTheDocument();
        expect(screen.queryByText("В процессе")).not.toBeInTheDocument();
        expect(screen.queryByText("Уровень не задан")).not.toBeInTheDocument();
        expect(screen.queryByText(/\d+ из \d+/)).not.toBeInTheDocument();
    });

    it("6.3 real error: ErrorState, кнопка повтора вызывает refetch", async () => {
        const user = userEvent.setup();
        useSessionsMock.mockReturnValue(realResult({ isError: true, error: new Error("boom") }));
        renderWithProviders(<SessionsPage />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Обновить" }));

        expect(refetchMock).toHaveBeenCalledTimes(1);
    });

    it("6.4 real loading: показывается скелетон, а не список", () => {
        useSessionsMock.mockReturnValue(realResult({ isLoading: true }));
        const { container } = renderWithProviders(<SessionsPage />);

        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(screen.queryByRole("heading", { name: "Сессии" })).not.toBeInTheDocument();
    });

    it("6.5 mock: рендерится SessionCard, пустой список сохраняет действие /session/new", () => {
        useSessionsMock.mockReturnValue(mockResult([MOCK_SESSION]));
        renderWithProviders(<SessionsPage />);
        expect(screen.getByText(MOCK_SESSION.title)).toBeInTheDocument();

        cleanup();

        useSessionsMock.mockReturnValue(mockResult([]));
        renderWithProviders(<SessionsPage />);

        expect(screen.getByRole("link", { name: "Новая сессия" })).toHaveAttribute(
            "href",
            "/session/new"
        );
    });
});
