// ARCHITECT: настройки проверяются на моках api-слоя: страница читает данные запросом, а запись идёт
// оптимистичной мутацией. Свой QueryClient (в renderWithProviders его не видно) нужен ради шпиона на
// invalidateQueries, а MemoryRouter — из-за useAuthExpiry внутри страницы. Язык-стор реальный.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { ApiError } from "@/api/client";
import { SettingsPage } from "@/pages/dashboard/SettingsPage";
import { resetStores } from "@/test/utils";
import { useLanguageStore } from "@/store/language";
import type { SettingsState } from "@/types/settings";

const { fetchSettingsMock, updateSettingsMock, toastErrorMock } = vi.hoisted(() => ({
    fetchSettingsMock: vi.fn(),
    updateSettingsMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("@/api/settings", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/settings")>();
    return { ...actual, fetchSettings: fetchSettingsMock, updateSettings: updateSettingsMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

const DATA: SettingsState = { preferences: { soundEffects: true, autoCorrection: true } };

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

/** Промис под контролем теста: нужен, чтобы наблюдать состояние «мутация в полёте». */
function makeDeferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
    let resolve: (value: T) => void = () => undefined;

    const promise = new Promise<T>((res) => {
        resolve = res;
    });

    return { promise, resolve };
}

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
    );
}

function renderPage() {
    return render(
        <Wrapper>
            <SettingsPage />
        </Wrapper>
    );
}

/** Дожидается данных: до ответа страница показывает скелетон. */
async function renderLoaded(): Promise<void> {
    renderPage();

    await screen.findByRole("switch", { name: "Звуковые эффекты" });
}

function soundToggle(): HTMLElement {
    return screen.getByRole("switch", { name: "Звуковые эффекты" });
}

beforeEach(() => {
    resetStores();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    fetchSettingsMock.mockResolvedValue(DATA);
    updateSettingsMock.mockResolvedValue(DATA);
});

afterEach(() => {
    fetchSettingsMock.mockReset();
    updateSettingsMock.mockReset();
    toastErrorMock.mockReset();
    vi.restoreAllMocks();
});

describe("SettingsPage", () => {
    it("1: скелетон до ответа, затем оба toggle с серверными значениями", async () => {
        const deferred = makeDeferred<SettingsState>();

        fetchSettingsMock.mockReturnValue(deferred.promise);

        const { container } = renderPage();

        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();

        deferred.resolve({ preferences: { soundEffects: false, autoCorrection: true } });

        const sound = await screen.findByRole("switch", { name: "Звуковые эффекты" });

        expect(sound).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("switch", { name: "Автокоррекция" })).toHaveAttribute(
            "aria-checked",
            "true"
        );
        expect(fetchSettingsMock).toHaveBeenCalledTimes(1);
    });

    it("2: toggle меняет значение оптимистично, шлёт полный DTO и инвалидирует кэш", async () => {
        const user = userEvent.setup();
        const deferred = makeDeferred<SettingsState>();

        updateSettingsMock.mockReturnValue(deferred.promise);
        await renderLoaded();

        await user.click(soundToggle());

        // ARCHITECT: значение перевернулось до ответа сервера — это и есть оптимистичный отклик.
        await waitFor(() => expect(soundToggle()).toHaveAttribute("aria-checked", "false"));
        // ARCHITECT: первым аргументом уходит полный DTO, второй добавляет react-query (контекст мутации).
        expect(updateSettingsMock).toHaveBeenCalledWith(
            {
                soundEffects: false,
                autoCorrection: true,
            },
            expect.anything()
        );

        deferred.resolve({ preferences: { soundEffects: false, autoCorrection: true } });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["settings"] }));
    });

    it("3: ошибка сохранения откатывает значение и показывает тост", async () => {
        const user = userEvent.setup();

        updateSettingsMock.mockRejectedValue(new ApiError(500, "Internal"));
        await renderLoaded();

        await user.click(soundToggle());

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось сохранить настройки")
        );
        await waitFor(() => expect(soundToggle()).toHaveAttribute("aria-checked", "true"));
    });

    it("4: 401 при сохранении не даёт тоста — сессию разбирает useAuthExpiry", async () => {
        const user = userEvent.setup();

        updateSettingsMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        await renderLoaded();

        await user.click(soundToggle());

        // ARCHITECT: инвалидация идёт в onSettled, то есть после обработки ошибки — это сигнал, что ветка прошла.
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["settings"] }));
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("5: во время мутации переключатель disabled, повторный клик не дублирует запрос", async () => {
        const user = userEvent.setup();
        const deferred = makeDeferred<SettingsState>();

        updateSettingsMock.mockReturnValue(deferred.promise);
        await renderLoaded();

        await user.click(soundToggle());

        await waitFor(() => expect(soundToggle()).toBeDisabled());

        // ARCHITECT: блокировка нативная (атрибут кнопки) и видна: строка гаснет, обёрток-fieldset нет.
        expect(soundToggle()).toHaveClass("opacity-50");
        expect(soundToggle().closest("fieldset")).toBeNull();

        // ARCHITECT: прямой клик по disabled-контролу — гард обязан держать и этот путь, не только разметку.
        fireEvent.click(soundToggle());

        expect(updateSettingsMock).toHaveBeenCalledTimes(1);

        deferred.resolve({ preferences: { soundEffects: false, autoCorrection: true } });

        await waitFor(() => expect(soundToggle()).not.toBeDisabled());
    });

    it("6: смена языка идёт в стор и не трогает настройки на сервере", async () => {
        const user = userEvent.setup();

        await renderLoaded();
        await user.selectOptions(screen.getByRole("combobox", { name: "Язык" }), "en");

        await waitFor(() => expect(useLanguageStore.getState().lang).toBe("en"));
        expect(updateSettingsMock).not.toHaveBeenCalled();
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("7: отказ загрузки показывает ErrorState с повтором", async () => {
        const user = userEvent.setup();

        fetchSettingsMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        renderPage();

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Не удалось загрузить данные" })
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Обновить" }));

        await waitFor(() => expect(fetchSettingsMock).toHaveBeenCalledTimes(2));
        await screen.findByRole("switch", { name: "Звуковые эффекты" });
    });
});
