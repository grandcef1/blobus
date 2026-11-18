// ARCHITECT: тесты приложения не переключают окружение: общий setup-файл (src/test/setup.ts) трогает
// window, а нужные здесь Node-API (http-сервер, fetch) в jsdom доступны, поэтому отдельная настройка
// environment для этого файла не нужна.
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { afterAll, describe, expect, it, vi } from "vitest";

import { buildApp } from "./app.ts";

interface RunningApp {
    readonly server: Server;
    readonly baseUrl: string;
}

interface ErrorEnvelopeBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly requestId: string;
    };
}

/** Поднимает приложение на случайном порту и возвращает адрес для запросов. */
async function startApp(app: Express = buildApp()): Promise<RunningApp> {
    const server = app.listen(0);
    await new Promise<void>((resolve) => {
        server.once("listening", () => resolve());
    });

    const address: AddressInfo | string | null = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Тестовый сервер не сообщил TCP-адрес");
    }

    return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

/** Сначала рвём keep-alive соединения fetch, потом ждём close: иначе прогон висит до таймаута. */
async function stopApp(server: Server): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
}

async function errorBody(response: Response): Promise<ErrorEnvelopeBody> {
    return (await response.json()) as ErrorEnvelopeBody;
}

/** Маршрут, который бросает ошибку с сентинелом: проверяет безопасность конверта и логов. */
function registerThrowingRoute(app: Express): void {
    app.get("/boom", () => {
        throw new Error("sentinel-500");
    });
}

const running = await startApp();

afterAll(async () => {
    await stopApp(running.server);
});

describe("buildApp", () => {
    it("отвечает на /api/health фиксированным конвертом и заголовками безопасности", async () => {
        const response = await fetch(`${running.baseUrl}/api/health`);
        const body = (await response.json()) as Record<string, unknown>;

        expect(response.status).toBe(200);
        expect(body).toEqual({ ok: true, service: "blobus-api" });
        expect(Object.keys(body)).toEqual(["ok", "service"]);
        expect(response.headers.get("x-request-id")).toBeTruthy();
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("x-powered-by")).toBeNull();
    });

    it("отдаёт health с типом application/json", async () => {
        const response = await fetch(`${running.baseUrl}/api/health`);

        expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("выдаёт разный requestId на два запроса", async () => {
        const first = await fetch(`${running.baseUrl}/api/health`);
        const second = await fetch(`${running.baseUrl}/api/health`);

        expect(first.headers.get("x-request-id")).not.toBe(second.headers.get("x-request-id"));
    });
});

describe("конверт ошибок", () => {
    it("отвечает 404 безопасным конвертом на неизвестный путь", async () => {
        const response = await fetch(`${running.baseUrl}/api/unknown`);
        const body = await errorBody(response);

        expect(response.status).toBe(404);
        expect(body.error.code).toBe("NOT_FOUND");
        expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
        expect(body.error).not.toHaveProperty("stack");
    });

    it("отклоняет тело больше 16kb кодом PAYLOAD_TOO_LARGE", async () => {
        const response = await fetch(`${running.baseUrl}/api/health`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: "x".repeat(17 * 1024) }),
        });
        const body = await errorBody(response);

        expect(response.status).toBe(413);
        expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("отвечает BAD_REQUEST на невалидный JSON и не повторяет тело запроса", async () => {
        const response = await fetch(`${running.baseUrl}/api/health`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: '{ "note": "sentinel-pii-123"',
        });
        const text = await response.text();

        expect(response.status).toBe(400);
        expect(text).toContain("BAD_REQUEST");
        expect(text).not.toContain("sentinel-pii-123");
    });

    it("отвечает INTERNAL на брошенный маршрут и не раскрывает сообщение ошибки", async () => {
        const boom = await startApp(buildApp(registerThrowingRoute));

        try {
            const response = await fetch(`${boom.baseUrl}/boom`);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("INTERNAL");
            expect(text).not.toContain("sentinel-500");
            expect(text).not.toContain("stack");
            expect(response.headers.get("x-request-id")).toBeTruthy();
        } finally {
            await stopApp(boom.server);
        }
    });

    it("не пишет в лог тело запроса и сообщение ошибки", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const boom = await startApp(buildApp(registerThrowingRoute));

        try {
            await fetch(`${running.baseUrl}/api/health`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: '{ "note": "sentinel-pii-123"',
            });
            await fetch(`${boom.baseUrl}/boom`);

            const logged = spy.mock.calls
                .flat()
                .map((argument) => String(argument))
                .join("\n");

            expect(logged).toContain("BAD_REQUEST");
            expect(logged).toContain("INTERNAL");
            expect(logged).not.toContain("sentinel-pii-123");
            expect(logged).not.toContain("sentinel-500");
        } finally {
            await stopApp(boom.server);
            spy.mockRestore();
        }
    });
});
