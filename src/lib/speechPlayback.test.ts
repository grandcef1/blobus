// ARCHITECT: озвучка проверяется на заглушке синтезатора: jsdom не умеет говорить, поэтому подменяются
// getVoices, speak и cancel. Сеть не поднимается; платный путь держит свой тест (VoiceButton).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeVoice {
    readonly lang: string;
    readonly name: string;
}

/** Что ушло в синтезатор: текст, выбранный голос и его язык. */
const spoken: { text: string; voice: string | null; lang: string }[] = [];
let voices: FakeVoice[] = [];
let cancelled = 0;

class UtteranceStub {
    readonly text: string;
    voice: FakeVoice | null = null;
    lang = "";
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(text: string) {
        this.text = text;
    }
}

const synthesis = {
    getVoices: (): readonly FakeVoice[] => voices,
    speak: (utterance: UtteranceStub): void => {
        spoken.push({
            text: utterance.text,
            voice: utterance.voice === null ? null : utterance.voice.name,
            lang: utterance.lang,
        });
    },
    cancel: (): void => {
        cancelled += 1;
    },
};

beforeEach(() => {
    spoken.length = 0;
    voices = [];
    cancelled = 0;
    vi.resetModules();
    vi.stubGlobal("SpeechSynthesisUtterance", UtteranceStub);
    // ARCHITECT: синтезатора в jsdom нет вовсе, поэтому свойство подставляется через defineProperty.
    Object.defineProperty(window, "speechSynthesis", {
        value: synthesis,
        configurable: true,
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("playBrowserSpeech", () => {
    it("2.1 выбирает голос по профилю voiceId", async () => {
        voices = [
            { lang: "en-GB", name: "british" },
            { lang: "en-US", name: "american" },
        ];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "en-US-female")).toBe(true);
        expect(spoken).toEqual([{ text: "Nice work", voice: "american", lang: "en-US" }]);

        expect(playBrowserSpeech("m2", "Keep going", "en-GB-male")).toBe(true);
        expect(spoken[1]).toEqual({ text: "Keep going", voice: "british", lang: "en-GB" });
    });

    it("2.2 без английского голоса деградирует в текст без ошибки", async () => {
        voices = [{ lang: "ru-RU", name: "russian" }];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "en-US-female")).toBe(false);
        expect(spoken).toHaveLength(0);
    });

    it("2.3 чужой профиль голоса не озвучивается", async () => {
        voices = [{ lang: "en-US", name: "american" }];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "ru-RU-female")).toBe(false);
        expect(spoken).toHaveLength(0);
    });

    it("2.4 запасной английский голос используется, если точного языка нет", async () => {
        voices = [{ lang: "en-AU", name: "australian" }];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "en-US-female")).toBe(true);
        expect(spoken[0]?.voice).toBe("australian");
    });

    it("2.5 состояние воспроизведения меняется и снимается остановкой", async () => {
        voices = [{ lang: "en-US", name: "american" }];
        const { getPlayingId, playBrowserSpeech, stopPlayback, subscribePlayback } =
            await import("@/lib/speechPlayback");
        const seen: (string | null)[] = [];
        const unsubscribe = subscribePlayback(() => seen.push(getPlayingId()));

        playBrowserSpeech("m1", "Nice work", "en-US-female");

        expect(getPlayingId()).toBe("m1");

        stopPlayback();

        expect(getPlayingId()).toBeNull();
        expect(cancelled).toBeGreaterThan(0);
        expect(seen).toEqual(["m1", null]);

        unsubscribe();
    });
});
