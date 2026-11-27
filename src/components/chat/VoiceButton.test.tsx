// ARCHITECT: кнопка озвучки проверяется на моках транспорта и модуля воспроизведения: тест держит четыре
// решения — выключенная настройка скрывает кнопку, free читает браузером, pro ходит в платный синтез, отказ
// синтеза деградирует в текст. Сеть не поднимается.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VoiceButton } from "@/components/chat/VoiceButton";
import { renderWithProviders } from "@/test/utils";

const {
    fetchTtsAudioMock,
    playBrowserSpeechMock,
    playEncodedAudioMock,
    stopPlaybackMock,
    getPlayingIdMock,
} = vi.hoisted(() => ({
    fetchTtsAudioMock: vi.fn(),
    playBrowserSpeechMock: vi.fn(),
    playEncodedAudioMock: vi.fn(),
    stopPlaybackMock: vi.fn(),
    getPlayingIdMock: vi.fn<() => string | null>(() => null),
}));

vi.mock("@/api/tts", () => ({ fetchTtsAudio: fetchTtsAudioMock }));

vi.mock("@/lib/speechPlayback", () => ({
    getPlayingId: getPlayingIdMock,
    playBrowserSpeech: playBrowserSpeechMock,
    playEncodedAudio: playEncodedAudioMock,
    stopPlayback: stopPlaybackMock,
    subscribePlayback: () => () => undefined,
}));

const TEXT = "Nice work, keep going.";

function renderButton(overrides: Partial<Parameters<typeof VoiceButton>[0]> = {}): void {
    renderWithProviders(
        <VoiceButton
            messageId="m1"
            text={TEXT}
            voiceId="en-US-female"
            enabled
            proPlan={false}
            {...overrides}
        />
    );
}

// ARCHITECT: обвязка автозапуска: озвучка должна стартовать с первым текстом и не перезапускаться, когда
// текст растёт вместе с печатью.
function AutoplayHarness() {
    const [text, setText] = useState("");

    return (
        <>
            <button type="button" onClick={() => setText(TEXT)}>
                fill
            </button>
            <button type="button" onClick={() => setText(`${TEXT} more`)}>
                append
            </button>
            <VoiceButton
                messageId="m1"
                text={text}
                voiceId="en-US-female"
                enabled
                proPlan={false}
                autoPlay
            />
        </>
    );
}

beforeEach(() => {
    getPlayingIdMock.mockReturnValue(null);
});

afterEach(() => {
    fetchTtsAudioMock.mockReset();
    playBrowserSpeechMock.mockReset();
    playEncodedAudioMock.mockReset();
    stopPlaybackMock.mockReset();
    getPlayingIdMock.mockReset();
});

describe("VoiceButton", () => {
    it("3.1 выключенная настройка voiceEnabled скрывает кнопку", () => {
        renderButton({ enabled: false });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("3.2 без профиля голоса кнопки нет: озвучивать нечем", () => {
        renderButton({ voiceId: null });

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("3.3 free читает реплику браузерным синтезом по профилю голоса", async () => {
        const user = userEvent.setup();

        renderButton();

        await user.click(screen.getByRole("button", { name: "Прослушать ответ" }));

        expect(playBrowserSpeechMock).toHaveBeenCalledWith("m1", TEXT, "en-US-female");
        expect(fetchTtsAudioMock).not.toHaveBeenCalled();
    });

    it("3.4 pro ходит в платный синтез и играет полученное аудио", async () => {
        const user = userEvent.setup();

        fetchTtsAudioMock.mockResolvedValue("data:audio/mpeg;base64,AAA");
        renderButton({ proPlan: true });

        await user.click(screen.getByRole("button", { name: "Прослушать ответ" }));

        expect(fetchTtsAudioMock).toHaveBeenCalledWith(TEXT, "en-US-female");
        expect(playEncodedAudioMock).toHaveBeenCalledWith("m1", "data:audio/mpeg;base64,AAA");
        expect(playBrowserSpeechMock).not.toHaveBeenCalled();
    });

    it("3.5 отказ платного синтеза деградирует в текст и не ломает кнопку", async () => {
        const user = userEvent.setup();

        fetchTtsAudioMock.mockRejectedValue(new Error("TTS_FAILED"));
        renderButton({ proPlan: true });

        await user.click(screen.getByRole("button", { name: "Прослушать ответ" }));

        expect(playEncodedAudioMock).not.toHaveBeenCalled();
        expect(playBrowserSpeechMock).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Прослушать ответ" })).toBeEnabled();
    });

    it("3.6 звучащая реплика показывает остановку и снимает озвучку", async () => {
        const user = userEvent.setup();

        getPlayingIdMock.mockReturnValue("m1");
        renderButton();

        await user.click(screen.getByRole("button", { name: "Остановить озвучку" }));

        expect(stopPlaybackMock).toHaveBeenCalledTimes(1);
        expect(playBrowserSpeechMock).not.toHaveBeenCalled();
    });

    it("3.7 автозапуск: озвучка стартует сама, кнопка становится повтором", () => {
        renderButton({ autoPlay: true });

        expect(playBrowserSpeechMock).toHaveBeenCalledWith("m1", TEXT, "en-US-female");
        expect(screen.getByRole("button", { name: "Повторить озвучку" })).toBeInTheDocument();
    });

    it("3.8 автозапуск ждёт текст и срабатывает один раз", async () => {
        const user = userEvent.setup();

        renderWithProviders(<AutoplayHarness />);

        expect(playBrowserSpeechMock).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "fill" }));

        expect(playBrowserSpeechMock).toHaveBeenCalledTimes(1);

        // ARCHITECT: текст растёт вместе с печатью: повторный запуск озвучки недопустим, иначе реплика
        // перечитывалась бы с начала на каждом новом слове.
        await user.click(screen.getByRole("button", { name: "append" }));

        expect(playBrowserSpeechMock).toHaveBeenCalledTimes(1);
    });
});
