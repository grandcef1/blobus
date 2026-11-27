// ARCHITECT: диктовка проверяется без браузера: SpeechRecognition подставляется заглушкой, а её отсутствие —
// отдельный случай, от которого зависит показ кнопки микрофона. Сети здесь нет и не нужно.

import { afterEach, describe, expect, it } from "vitest";

import {
    createDictation,
    finalTranscript,
    interimTranscript,
    isDictationSupported,
    isFatalDictationError,
    toDictationErrorCode,
} from "@/lib/dictation";
import type { DictationEvent } from "@/lib/dictation";

class SessionStub {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onerror: (() => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    aborted = false;
    start = (): void => {
        this.started = true;
    };
    stop = (): void => undefined;
    abort = (): void => {
        this.aborted = true;
    };
}

function installRecogniser(): void {
    Object.defineProperty(window, "SpeechRecognition", {
        value: SessionStub,
        configurable: true,
    });
}

function removeRecogniser(): void {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
}

afterEach(() => {
    removeRecogniser();
});

describe("dictation", () => {
    it("6.1 без SpeechRecognition поддержки нет: кнопку микрофона показывать нечем", () => {
        expect(isDictationSupported()).toBe(false);
        expect(createDictation()).toBeNull();
    });

    it("6.2 сессия настраивается на en-US и непрерывное распознавание с промежуточными словами", () => {
        installRecogniser();
        const session = createDictation();

        expect(isDictationSupported()).toBe(true);
        expect(session?.lang).toBe("en-US");
        expect(session?.continuous).toBe(true);
        expect(session?.interimResults).toBe(true);

        session?.start();

        expect((session as unknown as SessionStub).started).toBe(true);
    });

    it("6.3 окончательные и промежуточные части читаются раздельно, с resultIndex", () => {
        const event: DictationEvent = {
            resultIndex: 1,
            results: {
                0: { isFinal: true, 0: { transcript: "пропущено " } },
                1: { isFinal: true, 0: { transcript: "Hello " } },
                2: { isFinal: false, 0: { transcript: "wor" } },
                length: 3,
            },
        };

        // resultIndex отсекает уже зафиксированное: иначе окончательный текст задваивался бы в поле
        expect(finalTranscript(event)).toBe("Hello ");
        expect(interimTranscript(event)).toBe("wor");
    });

    it("6.4 код отказа читается из события, неизвестный сводится к unknown", () => {
        expect(toDictationErrorCode("not-allowed")).toBe("not-allowed");
        expect(toDictationErrorCode("audio-capture")).toBe("audio-capture");
        expect(toDictationErrorCode("no-speech")).toBe("no-speech");
        expect(toDictationErrorCode("новый код браузера")).toBe("unknown");
        expect(toDictationErrorCode(undefined)).toBe("unknown");
    });

    it("6.5 продолжать запись нечем при любом отказе, кроме собственной отмены", () => {
        expect(isFatalDictationError("not-allowed")).toBe(true);
        expect(isFatalDictationError("service-not-allowed")).toBe(true);
        expect(isFatalDictationError("audio-capture")).toBe(true);
        expect(isFatalDictationError("network")).toBe(true);
        expect(isFatalDictationError("no-speech")).toBe(true);
        expect(isFatalDictationError("unknown")).toBe(true);
        expect(isFatalDictationError("aborted")).toBe(false);
    });
});
