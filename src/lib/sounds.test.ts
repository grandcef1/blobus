// ARCHITECT: синтез проверяется на заглушке WebAudio: ни сети, ни звуковых файлов в тесте нет. Поддержку
// AudioContext код перечитывает на каждом вызове, поэтому порядок проверок значения не имеет.

import { afterEach, describe, expect, it } from "vitest";

import { queryClient } from "@/lib/query-client";
import { playSound } from "@/lib/sounds";
import type { SettingsState } from "@/types/settings";

const SETTINGS: SettingsState = {
    preferences: {
        soundEffects: true,
        autoCorrection: true,
        explanationLocale: "ru",
        voiceEnabled: true,
    },
    plan: "free",
};

/** Высоты запущенных тонов: по ним видно и число нот, и направление интервала. */
const started: number[] = [];

class FakeNode {
    connect(): FakeNode {
        return this;
    }
}

class FakeGain extends FakeNode {
    readonly gain = {
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
    };
}

class FakeOscillator extends FakeNode {
    type = "sine";
    readonly frequency = { value: 0 };

    start(): void {
        started.push(this.frequency.value);
    }

    stop(): void {}
}

class FakeAudioContext {
    readonly state = "running";
    readonly currentTime = 0;
    readonly destination = new FakeNode();

    createGain(): FakeGain {
        return new FakeGain();
    }

    createOscillator(): FakeOscillator {
        return new FakeOscillator();
    }

    resume(): Promise<void> {
        return Promise.resolve();
    }
}

function installAudioContext(): void {
    Object.defineProperty(window, "AudioContext", {
        value: FakeAudioContext,
        configurable: true,
        writable: true,
    });
}

afterEach(() => {
    started.length = 0;
    Reflect.deleteProperty(window, "AudioContext");
    queryClient.removeQueries({ queryKey: ["settings"] });
});

describe("playSound", () => {
    it("11.1 без поддержки WebAudio — тишина без ошибки", () => {
        expect(() => playSound("correct")).not.toThrow();
        expect(started).toHaveLength(0);
    });

    it("11.2 верный ответ идёт вверх, промах — вниз", () => {
        installAudioContext();

        playSound("correct");
        const correct = [...started];
        started.length = 0;
        playSound("wrong");

        expect(correct).toHaveLength(2);
        expect(correct[0]).toBeLessThan(correct[1] ?? 0);
        expect(started).toHaveLength(2);
        expect(started[0]).toBeGreaterThan(started[1] ?? 0);
    });

    it("11.3 выключенные звуковые эффекты — тишина", () => {
        installAudioContext();
        queryClient.setQueryData<SettingsState>(["settings"], {
            ...SETTINGS,
            preferences: { ...SETTINGS.preferences, soundEffects: false },
        });

        playSound("alert");

        expect(started).toHaveLength(0);
    });
});
