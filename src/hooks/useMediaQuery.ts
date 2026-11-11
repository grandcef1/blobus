// ARCHITECT: одна точка правды о состоянии медиазапроса. Значение приходит из matchMedia через
// useSyncExternalStore: внешний источник сам сообщает об изменении, поэтому нет ни ручного
// слушателя, ни setState в эффекте, а на resize лишних рендеров не возникает.

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const mediaQueryList = window.matchMedia(query);
            mediaQueryList.addEventListener("change", onStoreChange);

            return () => mediaQueryList.removeEventListener("change", onStoreChange);
        },
        [query]
    );

    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
