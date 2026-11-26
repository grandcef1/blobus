// ARCHITECT: ростер репетиторов через модуль-хранилище: страница «Репетиторы» показывает скелетон,
// пока список в пути. Синхронный мок остаётся источником данных для мастера и чата.

import { apiFetch } from "@/api/client";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { delayMock } from "@/api/mockDelay";
import { USE_MOCKS } from "@/lib/env";
import { isBlobatarId } from "@/types/blobatar";
import type { Blobatar, BlobatarPersona, BlobatarTraits } from "@/types/blobatar";

/** Контракт элемента ответа GET /api/tutors (server/routes/tutors.ts). */
interface TutorDto {
    id: string;
    name: string;
    traits: BlobatarTraits;
    persona: BlobatarPersona;
}

// ARCHITECT: tone приходит кортежем: в BlobatarTraits поле изменяемое, поэтому копируются значения, а не
// ссылка на чужой массив.
function toBlobatar(dto: TutorDto): Blobatar | null {
    if (!isBlobatarId(dto.id)) return null;

    return {
        id: dto.id,
        name: dto.name,
        traits: { ...dto.traits, tone: [dto.traits.tone[0], dto.traits.tone[1]] },
        persona: dto.persona,
    };
}

// ARCHITECT: каталог приходит с сервера, поэтому клиентская копия в моках остаётся источником только для
// мок-режима сборки; id из ответа проверяются allowlist'ом — чужая строка не становится Blobatar.
export async function fetchTutors(): Promise<Blobatar[]> {
    if (USE_MOCKS) {
        await delayMock();

        return MOCK_BLOBATARS;
    }

    const { tutors } = await apiFetch<{ tutors: TutorDto[] }>("/tutors");

    return tutors.map(toBlobatar).filter((tutor): tutor is Blobatar => tutor !== null);
}
