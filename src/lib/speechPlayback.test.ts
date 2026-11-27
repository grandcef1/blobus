// ARCHITECT: озвучка проверяется на заглушке синтезатора: jsdom не умеет говорить, поэтому подменяются
// getVoices, speak и cancel. Сеть не поднимается; платный путь держит свой тест (VoiceButton).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeVoice {
    readonly lang: string;
    readonly name: string;
}

/** Что ушло в синтезатор: текст, выбранный голос и его язык. */
const spoken: { text: string; voice: string | null; lang: string }[] = [];
/** Сами реплики: тест завершает сегмент вызовом onend, как это делает браузер. */
let uttered: UtteranceStub[] = [];
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
        uttered.push(utterance);
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
    uttered = [];
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

    it("2.1а пол профиля решает выбор внутри языка", async () => {
        voices = [
            { lang: "en-US", name: "Microsoft David Desktop" },
            { lang: "en-US", name: "Microsoft Zira Desktop" },
        ];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "en-US-female")).toBe(true);
        expect(spoken[0]?.voice).toBe("Microsoft Zira Desktop");

        expect(playBrowserSpeech("m2", "Nice work", "en-US-male")).toBe(true);
        expect(spoken[1]?.voice).toBe("Microsoft David Desktop");
    });

    it("2.1б без голоса нужного пола берётся любой того же языка", async () => {
        voices = [{ lang: "en-US", name: "Generic Voice" }];
        const { playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work", "en-US-female")).toBe(true);
        expect(spoken[0]?.voice).toBe("Generic Voice");
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

describe("splitIntoSpeechSegments", () => {
    it("3.1 письменность режет текст на сегменты, знаки и цифры прилипают к соседним буквам", async () => {
        const { splitIntoSpeechSegments } = await import("@/lib/speechPlayback");

        expect(splitIntoSpeechSegments("Hello, мир!")).toEqual([
            { script: "latin", text: "Hello, " },
            { script: "cyrillic", text: "мир!" },
        ]);
        expect(splitIntoSpeechSegments("42 apples")).toEqual([
            { script: "latin", text: "42 apples" },
        ]);
        expect(splitIntoSpeechSegments("«42»")).toEqual([{ script: "other", text: "«42»" }]);
        expect(splitIntoSpeechSegments("")).toEqual([]);
    });
});

describe("очередь сегментов", () => {
    it("3.2 смешанная реплика читается латиницей, кириллица пропускается молча", async () => {
        voices = [
            { lang: "en-US", name: "generic" },
            { lang: "ru-RU", name: "generic" },
        ];
        const { getPlayingId, playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work, молодец!", "en-US-female")).toBe(true);
        expect(spoken).toEqual([{ text: "Nice work, ", voice: "generic", lang: "en-US" }]);

        uttered[0]?.onend?.();

        // ARCHITECT: русский сегмент не читается даже когда русский голос в браузере есть: озвучивается только
        // латиница, объяснения репетитора остаются текстом (§спец. 6).
        expect(spoken).toHaveLength(1);
        expect(getPlayingId()).toBeNull();
    });

    it("3.3 без русского голоса кириллица пропускается молча, латиница читается", async () => {
        voices = [{ lang: "en-US", name: "generic" }];
        const { getPlayingId, playBrowserSpeech } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work. Молодец!", "en-US-female")).toBe(true);
        expect(spoken).toEqual([{ text: "Nice work. ", voice: "generic", lang: "en-US" }]);

        uttered[0]?.onend?.();

        // русского сегмента в очереди нет: очередь кончилась, текста не потеряли
        expect(getPlayingId()).toBeNull();
        expect(spoken).toHaveLength(1);
    });

    it("3.4 остановка очищает очередь: хвост отменённой реплики не звучит", async () => {
        voices = [{ lang: "en-US", name: "generic" }];
        const { getPlayingId, playBrowserSpeech, stopPlayback } = await import("@/lib/speechPlayback");

        expect(playBrowserSpeech("m1", "Nice work. Молодец! Keep going.", "en-US-female")).toBe(true);
        expect(spoken).toEqual([{ text: "Nice work. ", voice: "generic", lang: "en-US" }]);

        stopPlayback();
        uttered[0]?.onend?.();

        expect(spoken).toHaveLength(1);
        expect(getPlayingId()).toBeNull();
        expect(cancelled).toBeGreaterThan(0);
    });

    it("3.5 пропуски и markdown-символы в речь не идут", async () => {
        voices = [{ lang: "en-US", name: "generic" }];
        const { cleanForSpeech, playBrowserSpeech } = await import("@/lib/speechPlayback");

        // ARCHITECT: подчёркивания пропуска синтезатор читает вслух как «underscore», а звёздочки и решётки —
        // как паузы: текст чистится до сегментации (§спец. 6).
        expect(cleanForSpeech("No ___ needed. **Use** #verb `go`")).toBe("No needed. Use verb go");

        expect(playBrowserSpeech("m1", "I ___ home **yesterday**.", "en-US-female")).toBe(true);
        expect(spoken).toEqual([{ text: "I home yesterday.", voice: "generic", lang: "en-US" }]);
    });
});
