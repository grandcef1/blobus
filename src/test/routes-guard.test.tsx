// ARCHITECT: маршрутный гейт — единственное место, где решается, увидит ли гость приложение. Тест
// проверяет ровно это решение и точку возврата после входа: мок-админки в приложении больше нет, поэтому
// ролевых ветвей здесь тоже нет.

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { APP_HOME_PATH } from "@/components/layout/navigation";
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
});
