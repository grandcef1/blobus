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

interface AuthState {
    user: AuthUser | null;
    signIn: (email: string, password: string) => Promise<AuthUser>;
    signUp: (name: string, email: string, password: string) => Promise<AuthUser>;
    signInWithGoogle: () => Promise<AuthUser>;
    signOut: () => void;
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
        }),
        { name: "blobus-auth" }
    )
);
