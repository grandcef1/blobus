// ARCHITECT: единственный источник auth-состояния приложения. В persist попадает только
// сериализуемый AuthUser: пароль в состояние не пишется по конструкции, поэтому его нет и в
// localStorage. Замена провайдера делается в api/auth, здесь ничего не меняется.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    signIn as signInRequest,
    signInWithGoogle as signInWithGoogleRequest,
    signUp as signUpRequest,
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
            signOut: () => set({ user: null }),
            // ARCHITECT: пустой патч, когда пользователя нет: гость, открывший ссылку из письма, не
            // должен получить аккаунт — подтверждение применимо только к существующей сессии.
            markEmailVerified: () =>
                set((state) =>
                    state.user === null
                        ? {}
                        : { user: { ...state.user, emailVerified: true } }
                ),
        }),
        { name: AUTH_STORAGE_KEY }
    )
);
