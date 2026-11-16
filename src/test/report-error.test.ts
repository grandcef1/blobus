// ARCHITECT: канал отчётов об ошибках работает и без согласия на аналитику, поэтому проверяются три его
// границы: что уходит в отчёте, сколько отчётов уходит и что канал не порождает рекурсию сам от себя.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ReportErrorApi = typeof import("@/lib/observability/report-error");

const env = vi.hoisted(() => ({ ERROR_LOG_ENDPOINT: "" }));
const transport = vi.hoisted(() => ({ post: vi.fn(() => Promise.resolve(null)) }));

// ARCHITECT: эндпоинт — модульная константа в коде, а матрицу «канал выключен / включён» нужно
// проверить на одном импорте: геттер отдаёт текущее значение теста.
vi.mock("@/lib/env", () => ({
    get ERROR_LOG_ENDPOINT(): string {
        return env.ERROR_LOG_ENDPOINT;
    },
}));

// ARCHITECT: мокается клиент, а не fetch: тест проверяет решение отправить отчёт, а не сам HTTP.
vi.mock("@/api/client", () => ({ apiClient: { post: transport.post } }));

/** Свежий модуль: счётчик отправок и дедупликация живут в модульной области и общими быть не должны. */
async function loadReportError(): Promise<ReportErrorApi> {
    vi.resetModules();
    return import("@/lib/observability/report-error");
}

/** Прод-режим: отчёт уходит на сервер, а не в консоль. */
function useProductionMode(): void {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
}

beforeEach(() => {
    useProductionMode();
    transport.post.mockClear();
    env.ERROR_LOG_ENDPOINT = "/logs/client-error";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

describe("reportError", () => {
    it("вырезает почту и секреты из текста", async () => {
        const { sanitizeText } = await loadReportError();

        expect(sanitizeText("user@mail.com")).toBe("[redacted]");
        expect(sanitizeText("Сбой у user@mail.com при входе")).toBe("Сбой у [redacted] при входе");
        expect(sanitizeText("access_token=abc123")).toBe("access_token=[redacted]");
    });

    it("убирает query и hash из адреса", async () => {
        const { sanitizeUrl } = await loadReportError();

        expect(sanitizeUrl("/reset-password?token=ABC")).toBe("/reset-password");
        expect(sanitizeUrl("/verify-email#token")).toBe("/verify-email");
    });

    it("повтор той же ошибки не создаёт второй отчёт", async () => {
        const { reportError, getSentReportCount } = await loadReportError();

        reportError({ severity: "error", message: "boom" });
        reportError({ severity: "error", message: "boom" });

        expect(getSentReportCount()).toBe(1);
        expect(transport.post).toHaveBeenCalledTimes(1);
    });

    it("за сессию уходит не больше десяти отчётов", async () => {
        const { reportError, getSentReportCount } = await loadReportError();

        for (let index = 0; index < 11; index += 1) {
            reportError({ severity: "error", message: `boom-${index}` });
        }

        expect(getSentReportCount()).toBe(10);
        expect(transport.post).toHaveBeenCalledTimes(10);
    });

    it("падение транспорта не создаёт отчёт заново и не бросает", async () => {
        const { reportError, getSentReportCount } = await loadReportError();
        transport.post.mockImplementationOnce(() => {
            throw new Error("transport down");
        });

        expect(() => reportError({ severity: "error", message: "boom" })).not.toThrow();
        expect(getSentReportCount()).toBe(1);
    });

    it("пока отчёт в полёте, поднят флаг против рекурсии", async () => {
        const { reportError, isReportingInFlight } = await loadReportError();
        let release: () => void = () => undefined;
        transport.post.mockImplementationOnce(
            () =>
                new Promise<null>((resolve) => {
                    release = () => resolve(null);
                })
        );

        reportError({ severity: "error", message: "boom" });
        // ARCHITECT: по этому флагу api/client.ts гасит встречный отчёт: падение самого запроса иначе
        // породило бы новый отчёт и цикл.
        expect(isReportingInFlight()).toBe(true);

        release();
        await vi.waitFor(() => expect(isReportingInFlight()).toBe(false));
    });

    it("без эндпоинта first-party канал молчит", async () => {
        env.ERROR_LOG_ENDPOINT = "";
        const { reportError, getSentReportCount } = await loadReportError();

        reportError({ severity: "error", message: "boom" });

        expect(getSentReportCount()).toBe(1);
        expect(transport.post).not.toHaveBeenCalled();
        // ARCHITECT: в проде журнал консоли — утечка внутренних данных (project-rules 2.4).
        expect(console.error).not.toHaveBeenCalled();
    });

    it("с эндпоинтом отчёт уходит на наш сервер без query в маршруте", async () => {
        const { reportError } = await loadReportError();
        window.history.replaceState({}, "", "/reset-password?token=ABC");

        reportError({ severity: "error", message: "boom" });

        expect(transport.post).toHaveBeenCalledWith(
            "/logs/client-error",
            expect.objectContaining({
                message: "boom",
                route: "/reset-password",
                severity: "error",
            })
        );
    });
});
