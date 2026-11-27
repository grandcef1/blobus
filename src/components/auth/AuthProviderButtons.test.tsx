// ARCHITECT: кнопки провайдеров строятся по серверному списку: он единственный источник правды о том,
// что включено (§16.2). Тест держит три состояния ответа: список подтверждён, список пуст, сервер молчит.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";

const { fetchAuthProvidersMock } = vi.hoisted(() => ({ fetchAuthProvidersMock: vi.fn() }));

// ARCHITECT: мокаются только адаптер списка и флаги готовности: кнопка и разметка остаются настоящими.
// Мок-режим (USE_REAL_AUTH false) фиксируется здесь же — тест проверяет правило видимости, а не
// чтение import.meta.env.
vi.mock("@/api/authProviders", () => ({ fetchAuthProviders: fetchAuthProvidersMock }));
vi.mock("@/api/auth", () => ({ USE_REAL_AUTH: false, GOOGLE_READY: false }));

const onGoogle = vi.fn();

afterEach(() => {
    fetchAuthProvidersMock.mockReset();
});

describe("AuthProviderButtons", () => {
    it("подтверждённый сервером Google рисует кнопку и разделитель", async () => {
        fetchAuthProvidersMock.mockResolvedValue(["google"]);

        render(<AuthProviderButtons onGoogle={onGoogle} />);

        expect(
            await screen.findByRole("button", { name: "Продолжить с Google" })
        ).toBeInTheDocument();
        expect(screen.getByText("или")).toBeInTheDocument();
    });

    it("пустой список сервера убирает и кнопку, и разделитель", async () => {
        fetchAuthProvidersMock.mockResolvedValue([]);

        render(<AuthProviderButtons onGoogle={onGoogle} />);

        await waitFor(() => {
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });
        expect(screen.queryByText("или")).not.toBeInTheDocument();
    });

    it("молчащий сервер оставляет клиентское правило: в моке кнопка видна", async () => {
        fetchAuthProvidersMock.mockResolvedValue(null);

        render(<AuthProviderButtons onGoogle={onGoogle} />);

        // ARCHITECT: одна сетевая ошибка не должна убирать вход через провайдера — правило готовности
        // входа остаётся прежним, а серверный ответ уточняет его, когда приходит.
        expect(
            await screen.findByRole("button", { name: "Продолжить с Google" })
        ).toBeInTheDocument();
    });
});
