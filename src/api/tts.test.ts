// ARCHITECT: транспорт платного синтеза проверяется на моке apiFetch: сети нет. Тест держит главное — текст
// уходит провайдеру очищенным, иначе «underscore» пропуска задания читается вслух (§спец. 6).

import { afterEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

afterEach(() => {
    apiFetchMock.mockReset();
});

describe("fetchTtsAudio", () => {
    it("чистит текст перед запросом к провайдеру", async () => {
        apiFetchMock.mockResolvedValue({ audio: "AAA", mimeType: "audio/mpeg" });

        const { fetchTtsAudio } = await import("@/api/tts");

        await expect(fetchTtsAudio("No ___ needed. **Use**", "en-US-female")).resolves.toBe(
            "data:audio/mpeg;base64,AAA"
        );
        expect(apiFetchMock).toHaveBeenCalledWith("/tts", {
            method: "POST",
            body: { text: "No needed. Use", voiceId: "en-US-female" },
        });
    });
});
