// ARCHITECT: список провайдеров входа читается только формой входа, поэтому адаптер живёт отдельно от
// src/api/auth: api/auth попадает в начальный граф (через стор), а этот код нужен лишь ленивому чанку
// входа — в начальный бандл он не должен попадать (§6.3).
// ARCHITECT: политику «что включено» решает сервер (§16.2): кнопки рисуются по его ответу, а свой
// allowlist нужен только затем, чтобы незнакомое имя из ответа не создавало кнопку (§16.6).

import { USE_REAL_AUTH } from "@/api/auth";
import { apiFetch } from "@/api/client";

/** Провайдеры, которые умеет показать форма входа. */
export const AUTH_PROVIDER_IDS = ["google"] as const;

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

/** Конверт GET /api/auth/providers: только имена включённых провайдеров, без секретов. */
interface AuthProvidersEnvelope {
    providers?: unknown;
}

/** Имена из ответа сервера: нестроковые элементы отбрасываются, тип остаётся строковым (§16.6). */
function toProviderNames(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];

    const names: string[] = [];

    for (const entry of value as readonly unknown[]) {
        if (typeof entry === "string") names.push(entry);
    }

    return names;
}

/**
 * Включённые провайдеры входа. null — сервер не ответил: вызывающий остаётся на клиентской проверке
 * готовности, чтобы одна сетевая ошибка не убирала кнопку входа.
 */
export async function fetchAuthProviders(): Promise<readonly AuthProviderId[] | null> {
    // ARCHITECT: в мок-режиме сервера нет, а Google-вход эмулируется локально — кнопка должна быть.
    if (!USE_REAL_AUTH) return ["google"];

    try {
        const { providers } = await apiFetch<AuthProvidersEnvelope>("/auth/providers");

        if (!Array.isArray(providers)) return null;

        const names = toProviderNames(providers);

        return AUTH_PROVIDER_IDS.filter((id) => names.includes(id));
    } catch {
        return null;
    }
}
