// ARCHITECT: Google-возврат приходит в мастер уже авторизованным: шаг «Знакомство» не должен предлагать
// форму регистрации, иначе пользователь заведёт второй аккаунт. Фазы оркеструются здесь.

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { renderWithProviders, resetStores } from "@/test/utils";
import { IntroStep } from "@/components/onboarding/steps/IntroStep";

vi.mock("./WelcomeStep", () => ({
    WelcomeStep: ({ onNext }: { onNext: () => void }) => (
        <button type="button" onClick={onNext}>
            приветствие-далее
        </button>
    ),
}));

// ARCHITECT: заглушка формы отдаёт и «далее», и «назад»: так проверяются и пропуск фазы, и возврат к ней.
vi.mock("./AuthStep", () => ({
    AuthStep: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
        <div>
            <p>маркер-форма</p>
            <button type="button" onClick={onNext}>
                форма-далее
            </button>
            <button type="button" onClick={onBack}>
                форма-назад
            </button>
        </div>
    ),
}));

const AUTHORIZED: AuthUser = {
    id: "user_authorized",
    name: "Ученик",
    email: "student@example.test",
    role: "user",
    emailVerified: true,
    onboardingCompleted: false,
};

beforeEach(() => {
    resetStores();
});

describe("IntroStep: пропуск формы для авторизованного", () => {
    it("гость после приветствия попадает на форму аккаунта", () => {
        const onNext = vi.fn();

        renderWithProviders(<IntroStep onNext={onNext} step={1} totalSteps={5} />);

        expect(screen.queryByText("маркер-форма")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "приветствие-далее" }));

        expect(screen.getByText("маркер-форма")).toBeInTheDocument();
        expect(onNext).not.toHaveBeenCalled();
    });

    it("авторизованный минует форму и переходит дальше", () => {
        const onNext = vi.fn();
        useAuthStore.setState({ user: AUTHORIZED });

        renderWithProviders(<IntroStep onNext={onNext} step={1} totalSteps={5} />);

        fireEvent.click(screen.getByRole("button", { name: "приветствие-далее" }));

        expect(onNext).toHaveBeenCalledTimes(1);
        expect(screen.queryByText("маркер-форма")).not.toBeInTheDocument();
    });

    it("у гостя «Назад» из формы возвращает к приветствию", () => {
        const onNext = vi.fn();

        renderWithProviders(<IntroStep onNext={onNext} step={1} totalSteps={5} />);

        fireEvent.click(screen.getByRole("button", { name: "приветствие-далее" }));
        fireEvent.click(screen.getByRole("button", { name: "форма-назад" }));

        expect(screen.queryByText("маркер-форма")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "приветствие-далее" })).toBeInTheDocument();
    });
});
