// ARCHITECT: офлайн — не косметика: пока сети нет, запросы бесполезны, а после возврата данные могли
// устареть. Тест проверяет оба эффекта хука: состояние связи и инвалидацию активных запросов.

import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { renderWithProviders } from "@/test/utils";

function NetworkProbe() {
    const isOnline = useNetworkStatus();

    return <p>{isOnline ? "online" : "offline"}</p>;
}

// ARCHITECT: navigator.onLine в jsdom доступен только для чтения — тест подменяет геттер, как это
// делает браузер при реальной смене связи.
function setNavigatorOnline(value: boolean): void {
    Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => value,
    });
}

async function goOffline(): Promise<void> {
    await act(async () => {
        setNavigatorOnline(false);
        window.dispatchEvent(new Event("offline"));
    });
}

async function goOnline(): Promise<void> {
    await act(async () => {
        setNavigatorOnline(true);
        window.dispatchEvent(new Event("online"));
    });
}

describe("useNetworkStatus", () => {
    beforeEach(() => {
        setNavigatorOnline(true);
    });

    it("переключает состояние offline → online", async () => {
        renderWithProviders(<NetworkProbe />);
        expect(screen.getByText("online")).toBeInTheDocument();

        await goOffline();
        expect(screen.getByText("offline")).toBeInTheDocument();

        await goOnline();
        expect(screen.getByText("online")).toBeInTheDocument();
    });

    it("после возврата сети инвалидирует активные запросы", async () => {
        const invalidate = vi
            .spyOn(queryClient, "invalidateQueries")
            .mockImplementation(() => Promise.resolve());

        renderWithProviders(<NetworkProbe />);

        await goOffline();
        expect(invalidate).not.toHaveBeenCalled();

        await goOnline();

        await waitFor(() => {
            expect(invalidate).toHaveBeenCalledWith({ refetchType: "active" });
        });

        invalidate.mockRestore();
    });
});
