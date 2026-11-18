// ARCHITECT: тесты лимитера не переключают окружение: общий setup-файл (src/test/setup.ts) трогает
// window, а нужные здесь Node-API (http-сервер, fetch) в jsdom доступны, поэтому отдельная настройка
// environment для этого файла не нужна.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { describe, expect, it } from "vitest";

import { createMemoryRateLimitStore, createRateLimiter } from "./rate-limit.ts";
import type { RateLimitStore } from "./rate-limit.ts";

interface RunningApp {
    readonly server: Server;
    readonly baseUrl: string;
}

interface TestRoute {
    readonly path: string;
    readonly scope: string;
}

interface ErrorEnvelopeBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly requestId: string;
    };
}

/** Ответ fetch: имя Response в файле занято типом express, поэтому берём его из сигнатуры fetch. */
type FetchResponse = Awaited<ReturnType<typeof fetch>>;

const WAIT_MS = 90;

async function startApp(app: Express): Promise<RunningApp> {
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

/** Поднимает приложение, выполняет проверки и закрывает сервер даже при падении ассерта. */
async function withApp(app: Express, body: (baseUrl: string) => Promise<void>): Promise<void> {
    const running = await startApp(app);

    try {
        await body(running.baseUrl);
    } finally {
        await stopApp(running.server);
    }
}

function createTestApp(
    store: RateLimitStore,
    windowMs: number,
    max: number,
    routes: readonly TestRoute[] = [{ path: "/ping", scope: "test" }]
): Express {
    const app = express();

    // ARCHITECT: trust proxy включён только в тесте, чтобы подменять IP через X-Forwarded-For; в проде
    // решение о доверии прокси принимается в Ф3.
    app.set("trust proxy", true);
    app.use((_req: Request, res: Response, next: NextFunction) => {
        res.setHeader("x-request-id", randomUUID());
        next();
    });

    for (const route of routes) {
        app.get(
            route.path,
            createRateLimiter({ store, windowMs, max, scope: route.scope }),
            (_req: Request, res: Response) => {
                res.json({ ok: true });
            }
        );
    }

    // Обработчик ошибок тестового приложения отдаёт 500 без деталей: проверяется fail-closed.
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            next(err);

            return;
        }

        res.status(500).json({ error: { code: "INTERNAL" } });
    });

    return app;
}

async function errorBody(response: FetchResponse): Promise<ErrorEnvelopeBody> {
    return (await response.json()) as ErrorEnvelopeBody;
}

describe("createRateLimiter", () => {
    it("пропускает до лимита, дальше отвечает 429 безопасным конвертом", async () => {
        const app = createTestApp(createMemoryRateLimitStore(), 60_000, 2);

        await withApp(app, async (baseUrl) => {
            const first = await fetch(`${baseUrl}/ping`);
            const second = await fetch(`${baseUrl}/ping`);
            const third = await fetch(`${baseUrl}/ping`);
            const body = await errorBody(third);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(third.status).toBe(429);
            expect(body.error.code).toBe("RATE_LIMITED");
            expect(body.error.message).toBe("Too many requests");
            expect(body.error.requestId).toBe(third.headers.get("x-request-id"));
            expect(body.error).not.toHaveProperty("stack");
            expect(Number(third.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
        });
    });

    it("ведёт отдельные корзины по IP из X-Forwarded-For", async () => {
        const app = createTestApp(createMemoryRateLimitStore(), 60_000, 1);
        const firstIp = { "x-forwarded-for": "1.2.3.4" };
        const secondIp = { "x-forwarded-for": "5.6.7.8" };

        await withApp(app, async (baseUrl) => {
            const first = await fetch(`${baseUrl}/ping`, { headers: firstIp });
            const blocked = await fetch(`${baseUrl}/ping`, { headers: firstIp });
            const other = await fetch(`${baseUrl}/ping`, { headers: secondIp });

            expect(first.status).toBe(200);
            expect(blocked.status).toBe(429);
            expect(other.status).toBe(200);
        });
    });

    it("снова пускает запрос после истечения окна", async () => {
        const app = createTestApp(createMemoryRateLimitStore(), 60, 1);

        await withApp(app, async (baseUrl) => {
            expect((await fetch(`${baseUrl}/ping`)).status).toBe(200);
            expect((await fetch(`${baseUrl}/ping`)).status).toBe(429);

            await new Promise((resolve) => setTimeout(resolve, WAIT_MS));

            expect((await fetch(`${baseUrl}/ping`)).status).toBe(200);
        });
    });

    it("пропускает сбой хранилища в общий обработчик и не раскрывает его текст", async () => {
        const brokenStore: RateLimitStore = {
            hit: async () => {
                throw new Error("store-down-sentinel");
            },
        };
        const app = createTestApp(brokenStore, 60_000, 1);

        await withApp(app, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/ping`);
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(text).toContain("INTERNAL");
            expect(text).not.toContain("store-down-sentinel");
        });
    });

    it("не смешивает разные scope на одном хранилище", async () => {
        const store = createMemoryRateLimitStore();
        const app = createTestApp(store, 60_000, 1, [
            { path: "/a", scope: "a" },
            { path: "/b", scope: "b" },
        ]);

        await withApp(app, async (baseUrl) => {
            expect((await fetch(`${baseUrl}/a`)).status).toBe(200);
            expect((await fetch(`${baseUrl}/a`)).status).toBe(429);
            expect((await fetch(`${baseUrl}/b`)).status).toBe(200);
        });
    });

    it("отвечает 429 с типом application/json", async () => {
        const app = createTestApp(createMemoryRateLimitStore(), 60_000, 0);

        await withApp(app, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/ping`);

            expect(response.status).toBe(429);
            expect(response.headers.get("content-type")).toContain("application/json");
        });
    });
});

describe("createMemoryRateLimitStore", () => {
    it("считает попадания в окне и вытесняет самые старые записи при переполнении", async () => {
        const store = createMemoryRateLimitStore(1);
        const windowMs = 60_000;

        expect(await store.hit("a", windowMs)).toEqual({ count: 1, resetMs: windowMs });
        expect((await store.hit("a", windowMs)).count).toBe(2);
        expect(await store.hit("b", windowMs)).toEqual({ count: 1, resetMs: windowMs });
        expect(await store.hit("a", windowMs)).toEqual({ count: 1, resetMs: windowMs });
        expect((await store.hit("b", windowMs)).count).toBe(1);
    });

    it("сбрасывает счётчик после конца окна", async () => {
        const store = createMemoryRateLimitStore();

        expect((await store.hit("a", 20)).count).toBe(1);

        await new Promise((resolve) => setTimeout(resolve, WAIT_MS));

        expect((await store.hit("a", 20)).count).toBe(1);
    });
});
