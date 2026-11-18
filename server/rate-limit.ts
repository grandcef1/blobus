// ARCHITECT: интерфейс хранилища написан под Supabase с атомарным RPC в Ф2/Ф3, потому что инстансы
// Vercel не делят память; memory-хранилище ниже годится только для dev и тестов.
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { errorEnvelope } from "./http.ts";

export interface RateLimitHit {
    /** Текущее число попаданий в окне. */
    count: number;
    /** Миллисекунды до конца окна, всегда больше нуля. */
    resetMs: number;
}

export interface RateLimitStore {
    hit(key: string, windowMs: number): Promise<RateLimitHit>;
}

interface MemoryEntry {
    count: number;
    resetAt: number;
}

export interface RateLimiterOptions {
    readonly store: RateLimitStore;
    readonly windowMs: number;
    readonly max: number;
    readonly scope: string;
}

// ARCHITECT: уборка ленивая и без таймеров: в serverless таймеры не живут между запросами, а лимит
// размера защищает память от раздувания уникальными ключами.
export function createMemoryRateLimitStore(maxEntries = 10000): RateLimitStore {
    const entries = new Map<string, MemoryEntry>();

    function prune(now: number): void {
        if (entries.size <= maxEntries) return;

        for (const [key, entry] of entries) {
            if (entry.resetAt <= now) entries.delete(key);
        }

        if (entries.size <= maxEntries) return;

        // ARCHITECT: если истёкших нет, вытесняются записи с наименьшим resetAt: активные счётчики
        // выживают, а память не растёт бесконечно.
        const overflow = [...entries.entries()]
            .sort((left, right) => left[1].resetAt - right[1].resetAt)
            .slice(0, entries.size - maxEntries);

        for (const [key] of overflow) entries.delete(key);
    }

    return {
        async hit(key: string, windowMs: number): Promise<RateLimitHit> {
            const now = Date.now();
            const current = entries.get(key);

            if (current === undefined || current.resetAt <= now) {
                entries.set(key, { count: 1, resetAt: now + windowMs });
                prune(now);

                return { count: 1, resetMs: windowMs };
            }

            current.count += 1;

            return { count: current.count, resetMs: current.resetAt - now };
        },
    };
}

// ARCHITECT: фиксированное окно достаточно для защиты от перебора, поэтому сглаживание не добавляется.
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
    const { store, windowMs, max, scope } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // ARCHITECT: req.ip undefined складывается в общую корзину unknown — это безопаснее, чем пропускать.
        const key = `${scope}:${req.ip ?? "unknown"}`;

        try {
            const hit = await store.hit(key, windowMs);

            if (hit.count > max) {
                res.setHeader("Retry-After", String(Math.max(1, Math.ceil(hit.resetMs / 1000))));
                res.status(429).json(errorEnvelope("RATE_LIMITED", res));

                return;
            }

            next();
        } catch (error) {
            // ARCHITECT: fail-closed — при сбое хранилища запрос не пропускается, а уходит в общий
            // обработчик ошибок (500), поэтому сломанный лимитер не открывает доступ.
            next(error);
        }
    };
}
