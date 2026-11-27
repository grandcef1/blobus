// ARCHITECT: строка ввода проверяется без сети и без мок-стора: отправку видно по onSend, а запись зависит
// только от поддержки распознавания, поэтому тест сам подставляет и убирает SpeechRecognition.

import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/components/chat/ChatInput";
import { renderWithProviders } from "@/test/utils";

/** Заглушка распознавания: браузера нет, текст подаёт тест. */
class RecogniserStub {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    started = false;
    aborted = false;
    stopped = false;
    /** Сколько раз запись стартовала: перезапуск после конца сессии виден по счётчику. */
    starts = 0;

    start = (): void => {
        this.started = true;
        this.starts += 1;
        track(this);
    };
    stop = (): void => {
        this.stopped = true;
    };
    abort = (): void => {
        this.aborted = true;
    };

    /** Распознанный текст так, как его отдаёт браузер: список результатов с признаком фиксации. */
    emit(text: string, isFinal: boolean): void {
        this.onresult?.({
            resultIndex: 0,
            results: { 0: { isFinal, 0: { transcript: text } }, length: 1 },
        });
    }

    /** Отказ распознавания: браузер присылает код в поле error. */
    emitError(code: string): void {
        this.onerror?.({ error: code });
    }

    /** Конец сессии распознавания: браузер закрывает её сам по тишине или таймауту службы. */
    emitEnd(): void {
        this.onend?.();
    }
}

/** Последняя запущенная сессия распознавания: через неё тест говорит за пользователя. */
let active: RecogniserStub | undefined;

// ARCHITECT: заглушка сообщает о себе сама: присваивание this в переменную запрещено правилом no-this-alias.
function track(session: RecogniserStub): void {
    active = session;
}

function installRecogniser(): void {
    active = undefined;
    Object.defineProperty(window, "SpeechRecognition", {
        value: RecogniserStub,
        configurable: true,
    });
}

afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    active = undefined;
});

describe("ChatInput", () => {
    it("7.1 прикрепления файла нет, отправка заблокирована до текста", async () => {
        const user = userEvent.setup();
        const onSend = vi.fn();

        renderWithProviders(<ChatInput onSend={onSend} />);

        expect(screen.queryByRole("button", { name: "Прикрепить файл" })).toBeNull();

        const send = screen.getByRole("button", { name: "Отправить сообщение" });

        expect(send).toBeDisabled();

        await user.type(screen.getByLabelText("Поле ввода сообщения"), "Hello");
        await user.click(send);

        expect(onSend).toHaveBeenCalledWith("Hello");
    });

    it("7.2 без поддержки распознавания микрофона нет вовсе", () => {
        renderWithProviders(<ChatInput />);

        expect(screen.queryByRole("button", { name: "Начать запись" })).toBeNull();
    });

    it("7.3 запись: расшифровка видна, отправка уходит в onSend и возвращает строку ввода", async () => {
        installRecogniser();
        const user = userEvent.setup();
        const onSend = vi.fn();

        renderWithProviders(<ChatInput onSend={onSend} />);

        await user.click(screen.getByRole("button", { name: "Начать запись" }));

        // ARCHITECT: запись стартует сразу с настройками диктовки, а пустая расшифровка отправить нельзя.
        expect(active?.started).toBe(true);
        expect(active?.lang).toBe("en-US");
        expect(screen.getByText("Слушаю…")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Отправить запись" })).toBeDisabled();

        // ARCHITECT: распознавание приходит извне React, поэтому обновление состояния оборачивается в act.
        await act(async () => {
            active?.emit("Hello world", false);
        });

        expect(screen.getByText("Hello world")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Отправить запись" }));

        expect(onSend).toHaveBeenCalledWith("Hello world");
        expect(screen.getByLabelText("Поле ввода сообщения")).toHaveValue("");
        expect(screen.queryByRole("button", { name: "Отправить запись" })).toBeNull();
    });

    it("7.4 Escape отменяет запись: текст не уходит, сессия распознавания закрыта", async () => {
        installRecogniser();
        const user = userEvent.setup();
        const onSend = vi.fn();

        renderWithProviders(<ChatInput onSend={onSend} />);

        await user.click(screen.getByRole("button", { name: "Начать запись" }));

        await act(async () => {
            active?.emit("Not sent", true);
        });

        await user.keyboard("{Escape}");

        expect(onSend).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: "Отправить запись" })).toBeNull();
        expect(active?.aborted).toBe(true);
        expect(screen.getByLabelText("Поле ввода сообщения")).toHaveValue("");
    });

    it("7.5 отказ распознавания объясняется словами, а не молчанием", async () => {
        installRecogniser();
        const user = userEvent.setup();

        renderWithProviders(<ChatInput onSend={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Начать запись" }));

        await act(async () => {
            active?.emitError("not-allowed");
        });

        expect(
            screen.getByText(
                "Нет доступа к микрофону. Разрешите его в настройках браузера и попробуйте снова."
            )
        ).toBeInTheDocument();
        // продолжать нечем: распознавание остановлено, пустую расшифровку отправить нельзя
        expect(active?.stopped).toBe(true);
        expect(screen.getByRole("button", { name: "Отправить запись" })).toBeDisabled();
        expect(screen.queryByText("Слушаю…")).toBeNull();
    });

    it("7.6 конец сессии распознавания поднимает запись снова: микрофон не молчит под видом работы", async () => {
        installRecogniser();
        const user = userEvent.setup();

        renderWithProviders(<ChatInput onSend={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Начать запись" }));

        expect(active?.starts).toBe(1);

        // ARCHITECT: браузер закрывает сессию распознавания сам (тишина, таймаут службы). Без перезапуска
        // панель остаётся «слушающей», а текст не идёт: именно так выглядел неработающий микрофон (§спец. 7).
        await act(async () => {
            active?.emitEnd();
        });

        expect(active?.starts).toBe(2);
        expect(screen.getByText("Слушаю…")).toBeInTheDocument();

        await act(async () => {
            active?.emit("Hello world", true);
        });

        expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("7.7 после отказа запись больше не поднимается", async () => {
        installRecogniser();
        const user = userEvent.setup();

        renderWithProviders(<ChatInput onSend={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Начать запись" }));

        await act(async () => {
            active?.emitError("not-allowed");
        });

        await act(async () => {
            active?.emitEnd();
        });

        // Архит.: повторный запуск в цикле отказов только мигал бы микрофоном — после отказа запись стоит.
        expect(active?.starts).toBe(1);
        expect(active?.stopped).toBe(true);
    });
});
