// ARCHITECT: маршрутные гейты — единственное место, где решается, увидит ли гость приложение, а
// пользователь без роли — админ-раздел. Тест проверяет ровно эти решения и точку возврата после входа.

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import type { AuthUser } from "@/api/auth";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { renderWithProviders, resetStores } from "@/test/utils";

const ADMIN: AuthUser = {
    id: "user_admin",
    name: "Владелец",
    email: "owner@blobus.ai",
    role: "admin",
    emailVerified: true,
};

const USER: AuthUser = {
    id: "user_plain",
    name: "Ученик",
    email: "student@gmail.com",
    role: "user",
    emailVerified: true,
};

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
                path="/app/admin"
                element={
                    <ProtectedRoute>
                        <AdminRoute>
                            <p>admin-page</p>
                        </AdminRoute>
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
        renderWithProviders(<AppRoutes />, { route: "/app/admin" });

        expect(screen.getByText("login:/app/admin")).toBeInTheDocument();
    });

    it("пользователь без роли на /app/admin видит стартовую страницу приложения", () => {
        useAuthStore.setState({ user: USER });

        renderWithProviders(<AppRoutes />, { route: "/app/admin" });

        expect(screen.getByText("overview-page")).toBeInTheDocument();
        expect(screen.queryByText("admin-page")).not.toBeInTheDocument();
    });

    it("админ на /app/admin видит админ-раздел", () => {
        useAuthStore.setState({ user: ADMIN });

        renderWithProviders(<AppRoutes />, { route: "/app/admin" });

        expect(screen.getByText("admin-page")).toBeInTheDocument();
    });
});
