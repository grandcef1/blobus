// ARCHITECT: общая обвязка тестов. renderWithProviders даёт компоненту те же провайдеры, что и App
// (query-клиент и роутер), resetStores возвращает синглтоны в исходное состояние.
// ARCHITECT: без сброса синглтонов тесты начинают зависеть от порядка запуска: zustand-store создаётся
// один раз на файл, и состояние, оставленное предыдущим тестом, читается следующим.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import type { StoreApi, UseBoundStore } from "zustand";
import { useAuthStore } from "@/store/auth";
import { useConsentStore } from "@/store/consent";
import { useLanguageStore } from "@/store/language";
import { usePlacementSession } from "@/store/placement";
import { useToastStore } from "@/store/toast";

export interface RenderOptions {
    /** Стартовый адрес: маршрутные тесты проверяют, куда роутер отправляет пользователя. */
    route?: string;
}

// ARCHITECT: настройки клиента отличаются от прод-queryClient: retry: false превращает сетевую ошибку в
// мгновенный отказ без ожидания бэкоффов, gcTime: 0 не даёт кэшу пережить тест.
function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): RenderResult {
    const { route = "/" } = options;

    return render(
        <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </QueryClientProvider>
    );
}

function resetStore<T>(store: UseBoundStore<StoreApi<T>>): void {
    store.setState(store.getInitialState(), true);
}

/** Возвращает сторы и хранилища к состоянию до теста: состояние и persist-записи. */
export function resetStores(): void {
    resetStore(useAuthStore);
    resetStore(useConsentStore);
    resetStore(useLanguageStore);
    resetStore(usePlacementSession);
    resetStore(useToastStore);
    // ARCHITECT: очистка идёт после setState: persist-слой уже перезаписал ключи своим initialState.
    window.localStorage.clear();
    window.sessionStorage.clear();
}
