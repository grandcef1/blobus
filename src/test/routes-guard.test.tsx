// ARCHITECT: маршрутный гейт — единственное место, где решается, увидит ли гость приложение. Тест
// проверяет ровно это решение и точку возврата после входа: мок-админки в приложении больше нет, поэтому
// ролевых ветвей здесь тоже нет.

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { renderWithProviders, resetStores } from "@/test/utils";

/** Заглушка входа: показывает, куда её отправил роутер и что принесла state.from. */
function LoginProbe() {
    const location = useLocation();
    const state = location.state as { from?: unknown } | null;

    return <p>login:{state?.from === undefined ? "no-from" : String(state.from)}</p>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginProbe />} />
            <Route path={APP_HOME_PATH} element={<p>overview-page</p>} />
            <Route
                path="/app/vocabulary"
                element={
                    <ProtectedRoute>
                        <p>vocabulary-page</p>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

beforeEach(() => {
    resetStores();
});

describe("гейты маршрутов", () => {
    it("гость на /app/* уезжает на /login и приносит точку входа", () => {
        renderWithProviders(<AppRoutes />, { route: "/app/vocabulary" });

        expect(screen.getByText("login:/app/vocabulary")).toBeInTheDocument();
    });

    it("пока сессия проверяется, показывается лоадер, а не форма входа", () => {
        useAuthStore.setState({ resolving: true });

        const { container } = renderWithProviders(<AppRoutes />, { route: "/app/vocabulary" });

        // ARCHITECT: отправлять на /login во время проверки нельзя — форма мигнула бы тому, кто авторизован.
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(screen.queryByText(/^login:/)).not.toBeInTheDocument();
        expect(screen.queryByText("vocabulary-page")).not.toBeInTheDocument();
    });
});
