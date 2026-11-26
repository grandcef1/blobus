// ARCHITECT: ростер репетиторов — граница мок/реал: мок-ветка отдаёт прежний источник, real-ветка читает
// GET /api/tutors и проверяет id allowlist'ом. Паттерн моков — как в src/api/profile.test.ts: apiFetch
// мокается точечно, real-режим через vi.stubEnv + vi.resetModules + динамический import, сеть не поднимается.

import { afterEach, describe, expect, it, vi } from "vitest";

import { BLOBATAR_IDS, isBlobatarId } from "@/types/blobatar";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

const TUTOR = {
    id: "miya",
    name: "Мия",
    traits: {
        shape: 0.8,
        hue: 0.92,
        tone: [0.6, 0.9] as const,
        "eye.gap": 0.4,
        "eye.rx": 0.7,
        "eye.lean": 0.2,
        "body.r": 0.3,
        "body.n": 0.6,
        "body.ratio": 0,
    },
    persona: {
        traits: ["отзывчивая", "мягкая", "замечает мелочи"] as const,
        teachingStyle: "Разбирает ошибки бережно.",
        story: "Мия родилась в прошивке умных часов.",
    },
};

afterEach(() => {
    apiFetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
});

describe("fetchTutors", () => {
    it("3.1 real: читает конверт { tutors } и отдаёт каталог", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        apiFetchMock.mockResolvedValue({ tutors: [TUTOR] });

        const { fetchTutors } = await import("@/api/tutors");
        const tutors = await fetchTutors();

        expect(apiFetchMock).toHaveBeenCalledWith("/tutors");
        expect(tutors).toHaveLength(1);
        expect(tutors[0]?.id).toBe("miya");
        expect(tutors[0]?.persona.teachingStyle).toBe("Разбирает ошибки бережно.");
        // ARCHITECT: tone копируется значениями: кортеж из ответа не должен стать общим массивом каталога.
        expect(tutors[0]?.traits.tone).toEqual([0.6, 0.9]);
        expect(tutors[0]?.traits.tone).not.toBe(TUTOR.traits.tone);
    });

    it("3.2 real: id вне allowlist отбрасывается, ответ не роняет страницу", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        apiFetchMock.mockResolvedValue({
            tutors: [
                { ...TUTOR, id: "unknown-tutor" },
                { ...TUTOR, id: "nova", name: "Нова" },
            ],
        });

        const { fetchTutors } = await import("@/api/tutors");
        const tutors = await fetchTutors();

        expect(tutors.map((tutor) => tutor.id)).toEqual(["nova"]);
    });

    it("3.3 мок-ветка: прежний локальный каталог, сеть не поднимается", async () => {
        const { fetchTutors } = await import("@/api/tutors");
        const { MOCK_BLOBATARS } = await import("@/api/mocks/blobatars");
        const tutors = await fetchTutors();

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(tutors).toHaveLength(MOCK_BLOBATARS.length);
        expect(tutors.map((tutor) => tutor.id)).toEqual(MOCK_BLOBATARS.map((tutor) => tutor.id));
    });

    it("3.4 allowlist совпадает с каталогом моков: один список id на клиенте", async () => {
        const { MOCK_BLOBATARS } = await import("@/api/mocks/blobatars");

        expect(BLOBATAR_IDS).toHaveLength(MOCK_BLOBATARS.length);
        expect(MOCK_BLOBATARS.every((tutor) => isBlobatarId(tutor.id))).toBe(true);
        expect(isBlobatarId("unknown-tutor")).toBe(false);
    });
});
