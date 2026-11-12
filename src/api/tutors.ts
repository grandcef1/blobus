// ARCHITECT: ростер репетиторов через модуль-хранилище: страница «Репетиторы» показывает скелетон,
// пока список в пути. Синхронный мок остаётся источником данных для мастера и чата.

import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { delayMock } from "@/api/mockDelay";
import type { Blobatar } from "@/types/blobatar";

export async function fetchTutors(): Promise<Blobatar[]> {
    await delayMock();

    return MOCK_BLOBATARS;
}