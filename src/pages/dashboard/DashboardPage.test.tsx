// ARCHITECT: регресс прод-бага «Обзор не грузится». Причина была в составе payload: старый API не отдаёт часть
// полей (у recentSessions нет title, может не быть недели и балла), и страница падала в RouteErrorBoundary.
// Плюс ошибка запроса обязана показывать состояние ошибки с повтором, а не бесконечный скелетон.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { renderWithProviders } from "@/test/utils";
import type { ProgressDto } from "@/api/progress";
import type { ProgressResult } from "@/hooks/useProgress";

const { useProgressMock } = vi.hoisted(() => ({ useProgressMock: vi.fn() }));

vi.mock("@/hooks/useProgress", () => ({ useProgress: useProgressMock }));

const refetchMock = vi.fn(async () => undefined);

/** Ответ сервера как объект: тест подаёт и полный payload, и урезанный старый — оба без any. */
function result(progress: unknown, isError = false): ProgressResult {
    return {
        progress: progress as ProgressDto | null,
        isLoading: false,
        isError,
        error: isError ? new Error("boom") : null,
        refetch: refetchMock,
    };
}

const LEGACY_SESSION = {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    tutorId: "miya",
    mode: "speaking",
    createdAt: "2026-11-18T09:00:00.000Z",
    updatedAt: "2026-11-18T09:30:00.000Z",
};

afterEach(() => {
    useProgressMock.mockReset();
    refetchMock.mockClear();
});

describe("Обзор: устойчивость к частичному payload", () => {
    it("8.1 сессия без title показывает производный заголовок и не роняет страницу", () => {
        useProgressMock.mockReturnValue(
            result({
                sessionsTotal: 3,
                messagesTotal: 12,
                wordsTotal: 5,
                wordsDueToday: 1,
                streakDays: 2,
                recentSessions: [LEGACY_SESSION],
            })
        );

        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("heading", { name: "Обзор" })).toBeInTheDocument();
        // заголовок собран из репетитора и режима: сервер название не прислал
        expect(screen.getAllByText("Мия · Разговор").length).toBeGreaterThan(0);
        expect(screen.queryByText(/undefined/)).toBeNull();
        // отсутствующий уровень показывается фолбэком, а не «undefined»
        expect(screen.getByText("не проверен")).toBeInTheDocument();
    });

    it("8.2 без recentSessions и weeklyActivity страница рисует пустые состояния", () => {
        useProgressMock.mockReturnValue(
            result({
                sessionsTotal: 0,
                messagesTotal: 0,
                wordsTotal: 0,
                wordsDueToday: 0,
                streakDays: 0,
            })
        );

        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Пока нет ни одной сессии")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Активность за неделю" })).toBeInTheDocument();
        expect(screen.queryByText(/undefined/)).toBeNull();
    });

    it("8.3 ошибка запроса показывает состояние ошибки с повтором, а не скелетон", async () => {
        const user = userEvent.setup();

        useProgressMock.mockReturnValue(result(null, true));
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Обновить" }));

        expect(refetchMock).toHaveBeenCalledTimes(1);
    });
});
