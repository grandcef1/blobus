// ARCHITECT: проверка токена — одна точка входа для серверного кода, который доверяет userId: проверка
// через auth.getUser, а не локальная криптография, потому что локальный стек подписывает симметрично,
// а hosted — асимметрично, и через Supabase Auth код одинаков.
// ARCHITECT: кэш на 60 секунд для снижения нагрузки, но это только ускорение — база всё равно проверяет
// RLS на каждый запрос.

import { createUserClient } from "./supabase.ts";
import type { SupabaseEnv } from "./supabase.ts";

/** Пользователь, за которого ручается Supabase Auth: поля берутся из ответа getUser, а не из claims. */
export interface TokenPayload {
    readonly userId: string;
    readonly email: string | null;
    readonly aud: string;
    /** Секунды из claims токена, как в JWT, а не миллисекунды. */
    readonly exp: number;
    /** Картинка из Google-профиля: уже провалидированный https-URL или null. */
    readonly providerAvatarUrl: string | null;
}

// ARCHITECT: user_metadata правится самим пользователем, поэтому это недоверенные данные (§16.2): картинку
// провайдера валидируем на границе проверки токена, а не в роутерах. Разрешён только https и хост
// googleusercontent.com (или его поддомен) — всё прочее превращается в null.
const PROVIDER_AVATAR_HOST = "googleusercontent.com";

function readProviderAvatarUrl(metadata: unknown): string | null {
    if (typeof metadata !== "object" || metadata === null) return null;

    const source = metadata as { avatar_url?: unknown; picture?: unknown };
    const candidate = typeof source.avatar_url === "string" ? source.avatar_url : source.picture;

    if (typeof candidate !== "string") return null;

    try {
        const url = new URL(candidate);
        const allowedHost =
            url.hostname === PROVIDER_AVATAR_HOST ||
            url.hostname.endsWith(`.${PROVIDER_AVATAR_HOST}`);

        return url.protocol === "https:" && allowedHost ? candidate : null;
    } catch {
        // Не URL — значит, не картинка провайдера: наружу уходит null, детали не нужны.
        return null;
    }
}

export interface TokenCacheEntry {
    readonly payload: TokenPayload;
    readonly expiresAt: number;
}

export interface TokenCache {
    get(key: string): TokenCacheEntry | undefined;
    set(key: string, entry: TokenCacheEntry): void;
}

// ARCHITECT: при ошибке Supabase бросаем INVALID_TOKEN без деталей (нельзя раскрывать, просрочен токен
// или поддельный).
const INVALID_TOKEN = "INVALID_TOKEN";

/** Кэш на прогон процесса: таймеров нет, просроченные записи убираются лениво — при записи и на чтении. */
export function createInMemoryTokenCache(ttlMs = 60_000): TokenCache {
    const entries = new Map<string, TokenCacheEntry>();

    return {
        get(key) {
            const entry = entries.get(key);

            return entry === undefined || entry.expiresAt < Date.now() ? undefined : entry;
        },
        set(key, entry) {
            const now = Date.now();

            for (const [staleKey, stale] of entries) {
                if (stale.expiresAt < now) entries.delete(staleKey);
            }

            // ARCHITECT: expiresAt = min(ttl, exp токена), чтобы кэш не держал истёкший токен: ttl знает
            // только кэш, поэтому срок токена приходит в записи, а ограничение накладывается здесь.
            entries.set(key, {
                payload: entry.payload,
                expiresAt: Math.min(entry.expiresAt, now + ttlMs),
            });
        },
    };
}

/** Секунды exp из claims токена: подпись здесь не проверяется — за подлинность отвечает auth.getUser. */
function readExpirySeconds(token: string): number {
    const claims = token.split(".")[1];

    if (claims === undefined) throw new Error(INVALID_TOKEN);

    try {
        const parsed = JSON.parse(Buffer.from(claims, "base64url").toString("utf8")) as {
            exp?: unknown;
        };

        if (typeof parsed.exp === "number") return parsed.exp;
    } catch {
        // разбор не удался — наружу уходит тот же INVALID_TOKEN, без деталей
    }

    throw new Error(INVALID_TOKEN);
}

/**
 * Проверяет access-токен и отдаёт пользователя. Подпись проверяет Supabase Auth: ни разбор claims, ни
 * кэш не решают, доверять ли токену.
 */
export async function verifyAccessToken(
    env: SupabaseEnv,
    token: string,
    cache?: TokenCache
): Promise<TokenPayload> {
    const cached = cache?.get(token);

    if (cached !== undefined) return cached.payload;

    const exp = readExpirySeconds(token);
    const { data, error } = await createUserClient(env, token).auth.getUser();

    if (error !== null || data === null || data.user === null) throw new Error(INVALID_TOKEN);

    const payload: TokenPayload = {
        userId: data.user.id,
        email: data.user.email ?? null,
        aud: data.user.aud,
        exp,
        providerAvatarUrl: readProviderAvatarUrl(data.user.user_metadata),
    };

    // ARCHITECT: в запись идёт срок самого токена: кэш ограничит его своим ttl через min.
    cache?.set(token, { payload, expiresAt: exp * 1000 });

    return payload;
}
