// ARCHITECT: единственный источник auth-состояния приложения. В persist попадает только
// сериализуемый AuthUser: пароль в состояние не пишется по конструкции, поэтому его нет и в
// localStorage. Замена провайдера делается в api/auth, здесь ничего не меняется.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
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

interface AuthState {
    user: AuthUser | null;
    signIn: (email: string, password: string) => Promise<AuthUser>;
    signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
    signInWithGoogle: () => Promise<AuthUser>;
    signOut: () => void;
    /** Отмечает почту подтверждённой: статус живёт только здесь, профиль его не дублирует. */
    markEmailVerified: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            signIn: async (email, password) => {
                const user = await signInRequest(email, password);
                set({ user });
                return user;
            },
            signUp: async (name, email, password) => {
                const user = await signUpRequest(name, email, password);
                set({ user });
                return user;
            },
            signInWithGoogle: async () => {
                const user = await signInWithGoogleRequest();
                set({ user });
                return user;
            },
            signOut: () => {
                // ARCHITECT: состояние чистится сразу, а серверный выход идёт фоном: экшены стора синхронные
                // (их так вызывают SidebarProfileCard и другие), и ждать сеть в обработчике клика нельзя.
                // Ошибку гасим — она уже залогирована в apiFetch, а интерфейс к этому моменту гость.
                void signOutRequest().catch(() => undefined);
                set({ user: null });
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
        }
    )
);

// ARCHITECT: в реальном режиме при загрузке модуля сначала закрывается возможный OAuth-редирект (в адресе
// мог остаться code), и только если пользователя нет — идёт обычная гидратация по серверной куке. Оба шага
// только поднимают пользователя и не гасят сессию, которую успел установить вход, пока шёл запрос.
if (USE_REAL_AUTH) {
    void handleOAuthRedirect()
        .then((oauthUser) => (oauthUser === null ? fetchCurrentUser() : oauthUser))
        .then((user) => {
            if (user !== null) useAuthStore.setState({ user });
        });
}
