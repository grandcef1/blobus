// ARCHITECT: сайдбар — тихая вторичная навигация, поэтому тест держит два обязательства: строки недавних
// сессий открывают тему ссылкой на /app/chat/:id (и в мок-ветке, и в real), а секция исчезает при загрузке,
// ошибке и пустом списке. useSessions мокается — сервер и QueryClient здесь не нужны.

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarRecentSessions } from "@/components/layout/SidebarRecentSessions";
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
        title: null,
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

interface RealOptions {
    readonly sessions?: SessionSummaryDto[];
    readonly isLoading?: boolean;
    readonly isError?: boolean;
}

// ARCHITECT: явные фабрики вместо спреда Partial: поля возвращаются заполненными, тип результата точный.
function realResult(options: RealOptions = {}): SessionsResult {
    return {
        kind: "real",
        sessions: options.sessions ?? [],
        isLoading: options.isLoading ?? false,
        isError: options.isError ?? false,
        error: null,
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

afterEach(() => {
    useSessionsMock.mockReset();
});

describe("SidebarRecentSessions", () => {
    it("6.1 real-список: строка — ссылка на /app/chat/:id, заголовок производный, аватар на месте", () => {
        useSessionsMock.mockReturnValue(realResult({ sessions: SUMMARIES }));
        const { container } = renderWithProviders(<SidebarRecentSessions isCollapsed={false} />);

        const link = screen.getByRole("link", { name: /Мия · Разговор/ });

        // ARCHITECT: запись открывает тему так же, как в мок-ветке: строка — не декорация.
        expect(link).toHaveAttribute("href", `/app/chat/${SUMMARY_ID}`);
        expect(screen.queryAllByRole("link")).toHaveLength(1);
        // ARCHITECT: валидный tutorId даёт отрисованного блобатара; неизвестный id оставил бы пустой плейсхолдер.
        expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    });

    it("6.2 real пустой список: секция скрыта", () => {
        useSessionsMock.mockReturnValue(realResult());
        const { container } = renderWithProviders(<SidebarRecentSessions isCollapsed={false} />);

        expect(container.firstChild).toBeNull();
    });

    it("6.3 real isLoading: секция скрыта", () => {
        useSessionsMock.mockReturnValue(realResult({ sessions: SUMMARIES, isLoading: true }));
        const { container } = renderWithProviders(<SidebarRecentSessions isCollapsed={false} />);

        expect(container.firstChild).toBeNull();
    });

    it("6.4 real isError: секция скрыта", () => {
        useSessionsMock.mockReturnValue(realResult({ sessions: SUMMARIES, isError: true }));
        const { container } = renderWithProviders(<SidebarRecentSessions isCollapsed={false} />);

        expect(container.firstChild).toBeNull();
    });

    it("6.5 mock-список: ссылки на /app/chat/:id с заголовком сессии сохранены", () => {
        useSessionsMock.mockReturnValue(mockResult([MOCK_SESSION]));
        renderWithProviders(<SidebarRecentSessions isCollapsed={false} />);

        const link = screen.getByRole("link", { name: MOCK_SESSION.title });

        expect(link).toHaveAttribute("href", `/app/chat/${MOCK_SESSION.id}`);
        expect(screen.getByText(MOCK_SESSION.title)).toBeInTheDocument();
    });

    it("6.6 isCollapsed: секция скрыта даже при непустом списке", () => {
        useSessionsMock.mockReturnValue(mockResult([MOCK_SESSION]));
        const { container } = renderWithProviders(<SidebarRecentSessions isCollapsed />);

        expect(container.firstChild).toBeNull();
        expect(screen.queryByText("Недавние сессии")).not.toBeInTheDocument();
    });
});
