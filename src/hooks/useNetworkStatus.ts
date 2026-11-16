// ARCHITECT: сеть — внешнее состояние: браузер сообщает о ней событиями online/offline, и хук
// передаёт их в TanStack Query через onlineManager, чтобы запросы не уходили в пустоту.
// ARCHITECT: при возврате сети инвалидируются активные запросы — пока связи не было, данные могли
// устареть, а пользователь ждёт свежие, а не те, что лежат в кэше.

import { useEffect, useRef, useState } from "react";
import { onlineManager } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

function readOnline(): boolean {
    return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function useNetworkStatus(): boolean {
    const [isOnline, setIsOnline] = useState(readOnline);
    // ARCHITECT: инвалидация нужна только на переходе offline → online, а не на первом рендере
    // сессии, которая началась с работающей сетью.
    const wasOffline = useRef(!readOnline());

    useEffect(() => {
        // ARCHITECT: onlineManager получает то же событие, что и хук: без этого TanStack Query
        // продолжал бы считать сеть доступной и слал запросы в офлайне.
        onlineManager.setEventListener((setOnline) => {
            const goOnline = () => setOnline(true);
            const goOffline = () => setOnline(false);
            window.addEventListener("online", goOnline);
            window.addEventListener("offline", goOffline);

            return () => {
                window.removeEventListener("online", goOnline);
                window.removeEventListener("offline", goOffline);
            };
        });

        const sync = () => setIsOnline(readOnline());
        window.addEventListener("online", sync);
        window.addEventListener("offline", sync);

        return () => {
            window.removeEventListener("online", sync);
            window.removeEventListener("offline", sync);
        };
    }, []);

    useEffect(() => {
        if (!isOnline) {
            wasOffline.current = true;
            return;
        }
        if (!wasOffline.current) return;

        wasOffline.current = false;
        void queryClient.invalidateQueries({ refetchType: "active" });
    }, [isOnline]);

    return isOnline;
}
