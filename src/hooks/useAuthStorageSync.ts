// ARCHITECT: zustand persist не синхронизирует вкладки: выход в одной оставлял другую «залогиненной»,
// а отзыв согласия не гасил аналитику в соседних — это дыра в поведении, а не косметика.
// ARCHITECT: событие storage приходит только в другие вкладки, поэтому локальное состояние
// обновляется перечитыванием localStorage (persist.rehydrate()), а не разбором payload вручную:
// формат хранения остаётся за persist, и дублировать его здесь не нужно.
// ARCHITECT: после rehydrate ничего дополнительно не делается — ProtectedRoute сам отредиректит
// гостя, а Observability гаснет по подписке на consent-store и снимает сторонние скрипты.

import { useEffect } from "react";
import { AUTH_STORAGE_KEY, useAuthStore } from "@/store/auth";
import { CONSENT_STORAGE_KEY, useConsentStore } from "@/store/consent";

export function useAuthStorageSync(): void {
    useEffect(() => {
        const handleStorage = (event: StorageEvent): void => {
            // ARCHITECT: event.key === null — это localStorage.clear(): чужое хранилище опустело,
            // и оба стора обязаны вернуться к исходному состоянию.
            if (event.key === AUTH_STORAGE_KEY || event.key === null) {
                void useAuthStore.persist.rehydrate();
            }
            if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
                void useConsentStore.persist.rehydrate();
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => window.removeEventListener("storage", handleStorage);
    }, []);
}
