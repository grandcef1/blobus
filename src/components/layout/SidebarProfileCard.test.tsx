// ARCHITECT: карточка пользователя в рельсе показывает имя и аватар из профиля — того же источника, что
// страница профиля: мок-имя и блобатар ушли, поэтому проверяются имя профиля, ссылка своей/провайдерской
// картинки, заглушка до загрузки профиля и выход. Хук профиля мокается: сервер и кэш здесь ни при чём.

import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProfileDto } from "@/api/profile";
import { SidebarProfileCard } from "@/components/layout/SidebarProfileCard";
import type { ProfileQueryResult } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/auth";
import { renderWithProviders, resetStores } from "@/test/utils";

const { useProfileMock } = vi.hoisted(() => ({ useProfileMock: vi.fn() }));

vi.mock("@/hooks/useProfile", () => ({ useProfile: useProfileMock }));

const OWN_URL = "https://project.supabase.co/storage/v1/object/sign/avatars/u-1/a.png?token=1";
const PROVIDER_URL = "https://lh3.googleusercontent.com/a/avatar";

const USER = {
    id: "u-1",
    name: "Имя из адреса",
    email: "student@example.test",
    role: "user" as const,
    emailVerified: true,
};

const PROFILE: ProfileDto = {
    displayName: "Ева Соколова",
    locale: "ru",
    dailyMinutes: 20,
    memberSince: "2026-11-03T14:22:00.000Z",
    onboardingCompleted: true,
    avatarUrl: OWN_URL,
    providerAvatarUrl: PROVIDER_URL,
};

// ARCHITECT: только поля, нужные карточке: остальное в хуке профиля и в тесте не участвует.
function profileResult(profile: ProfileDto | undefined): ProfileQueryResult {
    return {
        profile,
        memberSinceLabel: "",
        isLoading: profile === undefined,
        isError: false,
        error: null,
        refetch: async () => undefined,
    };
}

afterEach(() => {
    // ARCHITECT: дерево снимается до сброса заглушек: сброс стора перерисовал бы карточку уже с пустым
    // useProfile, и это падало бы не в AssertionError, а необработанным исключением.
    cleanup();
    useProfileMock.mockReset();
    resetStores();
});

describe("SidebarProfileCard", () => {
    it("10.1 имя и аватар берутся из профиля, блобатара у пользователя нет", () => {
        useProfileMock.mockReturnValue(profileResult(PROFILE));
        renderWithProviders(<SidebarProfileCard isCollapsed={false} />);

        const link = screen.getByRole("link", { name: /Ева Соколова/ });

        // ARCHITECT: блобатар — персонаж репетитора, а не лицо ученика: в ссылке профиля картинка, а не он.
        expect(link.querySelector("img")?.getAttribute("src")).toBe(OWN_URL);
        expect(link.querySelector("svg")).toBeNull();
    });

    it("10.2 без своей картинки показывается картинка провайдера", () => {
        useProfileMock.mockReturnValue(profileResult({ ...PROFILE, avatarUrl: null }));
        renderWithProviders(<SidebarProfileCard isCollapsed={false} />);

        const link = screen.getByRole("link", { name: /Ева Соколова/ });

        expect(link.querySelector("img")?.getAttribute("src")).toBe(PROVIDER_URL);
    });

    it("10.3 профиль ещё не загружен: иконка и имя из store вместо блобатара", () => {
        useAuthStore.setState({ user: { ...USER } });
        useProfileMock.mockReturnValue(profileResult(undefined));
        renderWithProviders(<SidebarProfileCard isCollapsed={false} />);

        const link = screen.getByRole("link", { name: new RegExp(USER.name) });

        expect(link.querySelector("img")).toBeNull();
        expect(link.querySelector("svg")).not.toBeNull();
    });

    it("10.4 выход очищает пользователя в store", async () => {
        const user = userEvent.setup();

        useAuthStore.setState({ user: { ...USER } });
        useProfileMock.mockReturnValue(profileResult(PROFILE));
        renderWithProviders(<SidebarProfileCard isCollapsed={false} />);

        await user.click(screen.getByRole("button", { name: "Выйти из аккаунта" }));

        expect(useAuthStore.getState().user).toBeNull();
    });
});
