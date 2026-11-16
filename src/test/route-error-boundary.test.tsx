// ARCHITECT: падение одной страницы не должно уносить апп-шелл: тест проверяет, что граница ловит
// ошибку потомка, показывает ErrorState с действиями и оставляет соседние элементы оболочки живыми.

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "@/components/shared/RouteErrorBoundary";
import { renderWithProviders } from "@/test/utils";

function Thrower(): never {
    throw new Error("boom");
}

// ARCHITECT: React печатает пойманную ошибку в консоль — этот шум не нужен вывод теста, а факт
// перехвата проверяется по fallback, а не по логу.
function silenceConsoleError(): void {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
}

describe("RouteErrorBoundary", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("показывает экран ошибки, оставляя шелл на месте", () => {
        silenceConsoleError();

        renderWithProviders(
            <div>
                <nav data-testid="shell-nav">меню</nav>
                <RouteErrorBoundary>
                    <Thrower />
                </RouteErrorBoundary>
            </div>
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Обновить" })).toBeInTheDocument();
        expect(screen.getByTestId("shell-nav")).toBeInTheDocument();
    });

    it("из экрана ошибки есть переход в обзор", () => {
        silenceConsoleError();

        renderWithProviders(
            <RouteErrorBoundary>
                <Thrower />
            </RouteErrorBoundary>
        );

        expect(screen.getByRole("link", { name: /В обзор/ })).toHaveAttribute(
            "href",
            "/app/overview"
        );
    });
});
