// ARCHITECT: единственный источник auth-состояния приложения. В persist попадает только
// сериализуемый AuthUser: пароль в состояние не пишется по конструкции, поэтому его нет и в
// localStorage. Замена провайдера делается в api/auth, здесь ничего не меняется.
// ARCHITECT: у состояния явные фазы: resolving (сессия проверяется) → authenticated | anonymous.
// Пока идёт resolving, экраны входа и /app показывают лоадер и не рендерят форму — иначе при
// валидной куке пользователь сначала видел бы форму входа и только потом приложение (мигание).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    completeOnboarding as completeOnboardingRequest,
    fetchCurrentUser,
    handleOAuthRedirect,
    signIn as signInRequest,
    signInWithGoogle as signInWithGoogleRequest,
    signOut as signOutRequest,
    signUp as signUpRequest,
    USE_REAL_AUTH,
} from "@/api/auth";
import type { AuthUser } from "@/api/auth";

// ARCHITECT: ключ persist вынесен константой: его читает и межвкладочная синхронизация
// (useAuthStorageSync), а строка в двух местах разошлась бы при первом же переименовании.
export const AUTH_STORAGE_KEY = "blobus-auth";

/** Фазы аутентификации: resolving — сессия ещё проверяется, дальше только authenticated | anonymous. */
export type AuthStatus = "resolving" | "authenticated" | "anonymous";

interface AuthState {
    user: AuthUser | null;
    /** true — гидрация не завершена: вместо формы и защищённых экранов показывается лоадер. */
    resolving: boolean;
    signIn: (email: string, password: string) => Promise<AuthUser>;
    signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
    signInWithGoogle: () => Promise<AuthUser>;
    signOut: () => void;
    /** Отмечает завершение онбординга на сервере, затем ставит флаг в состоянии. */
    completeOnboarding: () => Promise<void>;
    /** Отмечает почту подтверждённой: статус живёт только здесь, профиль его не дублирует. */
    markEmailVerified: () => void;
}

// ARCHITECT: статус выводится из пары (resolving, user), а не хранится третьим полем: отдельный счётчик
// разошёлся бы при первой же записи мимо экшенов (тесты и синхронизация вкладок ставят user сами).
export function selectAuthStatus(state: AuthState): AuthStatus {
    if (state.resolving) return "resolving";

    return state.user === null ? "anonymous" : "authenticated";
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            // ARCHITECT: в мок-режиме гидратации нет — ответ приходит синхронно, поэтому фаза сразу разрешена.
            resolving: USE_REAL_AUTH,
            signIn: async (email, password) => {
                const user = await signInRequest(email, password);
                // ARCHITECT: успешный вход сам снимает resolving: пользователь уже известен.
                set({ user, resolving: false });
                return user;
            },
            signUp: async (name, email, password) => {
                const user = await signUpRequest(name, email, password);
                set({ user, resolving: false });
                return user;
            },
            signInWithGoogle: async () => {
                const user = await signInWithGoogleRequest();
                set({ user, resolving: false });
                return user;
            },
            signOut: () => {
                // ARCHITECT: состояние чистится сразу, а серверный выход идёт фоном: экшены стора синхронные
                // (их так вызывают SidebarProfileCard и другие), и ждать сеть в обработчике клика нельзя.
                // Ошибку гасим — она уже залогирована в apiFetch, а интерфейс к этому моменту гость.
                void signOutRequest().catch(() => undefined);
                set({ user: null, resolving: false });
            },
            completeOnboarding: async () => {
                await completeOnboardingRequest();
                // ARCHITECT: пустой патч для гостя, как в markEmailVerified; флаг ставится только после
                // успешного ответа сервера.
                set((state) =>
                    state.user === null
                        ? {}
                        : { user: { ...state.user, onboardingCompleted: true } }
                );
            },
            // ARCHITECT: пустой патч, когда пользователя нет: гость, открывший ссылку из письма, не
            // должен получить аккаунт — подтверждение применимо только к существующей сессии.
            markEmailVerified: () =>
                set((state) =>
                    state.user === null ? {} : { user: { ...state.user, emailVerified: true } }
                ),
        }),
        {
            name: AUTH_STORAGE_KEY,
            // ARCHITECT: в реальном режиме сохранённая сессия не читается: источник правды — серверная
            // HttpOnly-кука, а мок-пользователь из localStorage входом не считается (иначе лендинг показывал
            // бы «Алекса» без сессии).
            skipHydration: USE_REAL_AUTH,
            // ARCHITECT: в хранилище уходит только user: resolving описывает текущую загрузку страницы,
            // и восстановленный из localStorage лоадер пережил бы перезагрузку.
            partialize: (state) => ({ user: state.user }),
        }
    )
);

// ARCHITECT: в реальном режиме при загрузке модуля сначала закрывается возможный OAuth-редирект (в адресе
// мог остаться code), и только если пользователя нет — идёт обычная гидратация по серверной куке. Оба шага
// только поднимают пользователя и не гасят сессию, которую успел установить вход, пока шёл запрос.
// ARCHITECT: фаза resolving закрывается в finally, а не в then: зависшая проверка сессии не должна
// оставлять пользователя на лоадере навсегда — гость с ошибкой сети всё равно дойдёт до формы.
if (USE_REAL_AUTH) {
    void handleOAuthRedirect()
        .then((oauthUser) => (oauthUser === null ? fetchCurrentUser() : oauthUser))
        .then((user) => {
            if (user !== null) useAuthStore.setState({ user });
        })
        .catch(() => undefined)
        .finally(() => useAuthStore.setState({ resolving: false }));
}
