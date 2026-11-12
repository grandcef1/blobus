// ARCHITECT: скелетон должен быть настоящим состоянием загрузки, а не декорацией, поэтому хук даёт
// единый контракт «данные или загрузка», а паузу держит fetcher. Загруженные данные помечены
// подписью зависимостей: смена подписи сразу возвращает состояние загрузки, и устаревший ответ не
// воскрешает старые данные.
// ARCHITECT: setState вызывается только из ответа промиса — правило
// react-hooks/set-state-in-effect запрещает синхронную запись в теле эффекта.

import { useEffect, useState } from "react";

export interface MockQueryResult<T> {
    data: T | null;
    isLoading: boolean;
}

interface LoadedResult<T> {
    signature: string;
    data: T;
}

export function useMockQuery<T>(
    fetcher: () => Promise<T>,
    deps: readonly unknown[] = []
): MockQueryResult<T> {
    // ARCHITECT: deps приходят массивом от вызывающего, поэтому в подпись идёт их сериализация:
    // сравнение по ссылке на массив давало бы новый запрос на каждом рендере.
    const signature = JSON.stringify(deps);
    const [loaded, setLoaded] = useState<LoadedResult<T> | null>(null);

    useEffect(() => {
        let isActive = true;

        fetcher().then((result) => {
            if (isActive) setLoaded({ signature, data: result });
        });

        return () => {
            isActive = false;
        };
        // ARCHITECT: fetcher меняется вместе с подписью, а правило exhaustive-deps не может
        // проверить список зависимостей, пришедший извне.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    const isCurrent = loaded !== null && loaded.signature === signature;

    return { data: isCurrent ? loaded.data : null, isLoading: !isCurrent };
}