// ARCHITECT: исправленный баг Google-регистрации: после входа неполный аккаунт обязан уходить в мастер,
// а не в приложение. Тест держит обе точки — серверный флаг в сторе и колбэк формы.

import { fireEvent, render, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AuthUser } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { resetStores } from "@/test/utils";
import { Login } from "@/pages/Login";

const { formUsers } = vi.hoisted(() => ({
    formUsers: {
        incomplete: {
            id: "user_incomplete",
            name: "Ученик",
            email: "student@example.test",
            role: "user" as const,
            emailVerified: true,
            onboardingCompleted: false,
        },
        complete: {
            id: "user_complete",
            name: "Ученик",
            email: "complete@example.test",
            role: "user" as const,
            emailVerified: true,
            onboardingCompleted: true,
        },
    },
}));

// ARCHITECT: форма подменяется заглушкой с двумя кнопками: тест решает, каким аккаунтом «вошли», и
// проверяет маршрут, а не разметку формы.
vi.mock("@/components/auth/AuthForm", () => ({
    AuthForm: ({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) => (
        <div>
            <button type="button" onClick={() => onAuthenticated(formUsers.incomplete)}>
                форма-вход-неполный
            </button>
            <button type="button" onClick={() => onAuthenticated(formUsers.complete)}>
                форма-вход-полный
            </button>
        </div>
    ),
}));

vi.mock("@/components/onboarding/OnboardingShell", () => ({
    OnboardingShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/shared/Seo", () => ({ Seo: () => null }));

const INCOMPLETE_USER: AuthUser = { ...formUsers.incomplete };
const COMPLETE_USER: AuthUser = { ...formUsers.complete };
const LEGACY_USER: AuthUser = {
    id: "user_legacy",
    name: "Ученик",
    email: "legacy@example.test",
    role: "user",
    emailVerified: true,
};

/** Пробник мастера: показывает адрес, с которым роутер его открыл (глубокий переход на шаг теста). */
function OnboardingProbe() {
    const { search } = useLocation();

    return (
        <>
            <p>маркер-мастер</p>
            <p>адрес{search}</p>
        </>
    );
}

function RouteMarkers() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<OnboardingProbe />} />
            <Route path="/app/overview" element={<p>маркер-обзор</p>} />
            <Route path="/app/sessions" element={<p>маркер-сессии</p>} />
        </Routes>
    );
}

function renderAtLogin(state?: unknown): RenderResult {
    return render(
        <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
            <RouteMarkers />
        </MemoryRouter>
    );
}

beforeEach(() => {
    resetStores();
});

describe("Login: гейт онбординга", () => {
    it("гость остаётся на экране входа без редиректа", () => {
        renderAtLogin();

        expect(screen.getByRole("button", { name: "форма-вход-неполный" })).toBeInTheDocument();
        expect(screen.queryByText("маркер-мастер")).not.toBeInTheDocument();
        expect(screen.queryByText("маркер-обзор")).not.toBeInTheDocument();
    });

    it("неполный аккаунт уезжает в мастер", () => {
        useAuthStore.setState({ user: INCOMPLETE_USER });

        renderAtLogin();

        expect(screen.getByText("маркер-мастер")).toBeInTheDocument();
    });

    it("завершённый аккаунт уезжает в обзор", () => {
        useAuthStore.setState({ user: COMPLETE_USER });

        renderAtLogin();

        expect(screen.getByText("маркер-обзор")).toBeInTheDocument();
    });

    it("legacy-аккаунт без поля считается завершённым", () => {
        useAuthStore.setState({ user: LEGACY_USER });

        renderAtLogin();

        expect(screen.getByText("маркер-обзор")).toBeInTheDocument();
    });

    it("парольный вход неполного аккаунта ведёт в мастер", () => {
        renderAtLogin();

        fireEvent.click(screen.getByRole("button", { name: "форма-вход-неполный" }));

        expect(screen.getByText("маркер-мастер")).toBeInTheDocument();
    });

    it("парольный вход завершённого аккаунта ведёт в обзор", () => {
        renderAtLogin();

        fireEvent.click(screen.getByRole("button", { name: "форма-вход-полный" }));

        expect(screen.getByText("маркер-обзор")).toBeInTheDocument();
    });

    it("завершённый аккаунт возвращается в исходную точку приложения", () => {
        renderAtLogin({ from: "/app/sessions" });

        fireEvent.click(screen.getByRole("button", { name: "форма-вход-полный" }));

        expect(screen.getByText("маркер-сессии")).toBeInTheDocument();
    });

    it("новый аккаунт открывает мастер сразу на шаге теста", () => {
        renderAtLogin();

        fireEvent.click(screen.getByRole("button", { name: "форма-вход-неполный" }));

        // ARCHITECT: приветствие уже пройдено при регистрации — второй раз его не показываем.
        expect(screen.getByText("адрес?step=assessment")).toBeInTheDocument();
    });

    it("пока сессия проверяется, форма входа не рендерится", () => {
        useAuthStore.setState({ resolving: true });

        const { container } = renderAtLogin();

        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(
            screen.queryByRole("button", { name: "форма-вход-неполный" })
        ).not.toBeInTheDocument();
        expect(screen.queryByText("маркер-мастер")).not.toBeInTheDocument();
        expect(screen.queryByText("маркер-обзор")).not.toBeInTheDocument();
    });

    it("пользователь, поднятый до конца проверки, формы не видит", () => {
        useAuthStore.setState({ user: COMPLETE_USER, resolving: true });

        const { container } = renderAtLogin();

        // ARCHITECT: пока проверка не закрыта, решает фаза: ни формы, ни редиректа — иначе форма мигнула бы.
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(screen.queryByRole("button", { name: "форма-вход-полный" })).not.toBeInTheDocument();
    });
});
