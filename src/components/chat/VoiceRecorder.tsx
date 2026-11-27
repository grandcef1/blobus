// ARCHITECT: запись голоса как в мессенджере: панель вместо строки ввода, таймер, полосы уровня, отмена и
// отправка. Расшифровка идёт браузерным распознаванием (en-US): аудио никуда не уходит, а кнопка микрофона
// показывается только там, где распознавание есть.
// ARCHITECT: пульсация и полосы выключаются при prefers-reduced-motion: движение здесь украшение, а не смысл.
// ARCHITECT: уровни микрофона не читаются: getUserMedia ради полос дал бы второй запрос разрешения и не нужен для
// расшифровки. shortcut: полосы анимируются по таймеру, реальный уровень — когда появится запись аудио.
// ARCHITECT: Escape отменяет запись на уровне документа: пользователь не должен целиться в кнопку, чтобы уйти.

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    createDictation,
    finalTranscript,
    interimTranscript,
    isFatalDictationError,
    toDictationErrorCode,
} from "@/lib/dictation";
import type {
    DictationErrorCode,
    DictationErrorEvent,
    DictationEvent,
    DictationSession,
} from "@/lib/dictation";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
    /** Отправка расшифровки: пустой текст не отправляется. */
    readonly onSend: (text: string) => void;
    /** Отмена: текст не отправляется, состояние записи снимается. */
    readonly onCancel: () => void;
}

// ARCHITECT: полосы одинаковой толщины и разной высоты: это индикатор, а не график — палитра монохромная.
const LEVEL_BARS = [0.45, 0.85, 1, 0.6, 0.75];

const RECORD_BUTTON =
    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";
const CANCEL_BUTTON = cn(
    RECORD_BUTTON,
    "text-[#f0f0f5]/60 hover:bg-white/[0.06] hover:text-[#f0f0f5]"
);
const SEND_BUTTON = cn(
    RECORD_BUTTON,
    "bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-[#f0f0f5]/20"
);

/** Длительность записи: минуты и секунды, как в мессенджерах. */
function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
    const { t } = useTranslation("chat");
    const reducedMotion = useReducedMotion() ?? false;
    const [fixed, setFixed] = useState("");
    const [interim, setInterim] = useState("");
    const [seconds, setSeconds] = useState(0);
    const [failure, setFailure] = useState<DictationErrorCode | null>(null);
    // ARCHITECT: сессия распознавания живёт в ref: она создаётся один раз, а обработчики снимаются при выходе.
    const sessionRef = useRef<DictationSession | null>(null);
    const transcript = `${fixed}${interim}`.trim();
    // ARCHITECT: после фатального отказа запись не продолжается: индикаторы замирают, а причина показывается
    // словами — молчаливый таймер пользователь читает как «ничего не происходит».
    const stopped = failure !== null && isFatalDictationError(failure);
    const motionOff = reducedMotion || stopped;

    useEffect(() => {
        const session = createDictation();

        if (session === null) return;

        sessionRef.current = session;
        session.onresult = (event: DictationEvent) => {
            const confirmed = finalTranscript(event);

            if (confirmed !== "") setFixed((previous) => previous + confirmed);

            setInterim(interimTranscript(event));
        };
        session.onerror = (event: DictationErrorEvent) => {
            const code = toDictationErrorCode(event.error);

            // ARCHITECT: наша собственная отмена — не отказ: сообщение о ней только пугало бы пользователя.
            if (code === "aborted") return;

            setInterim("");
            setFailure(code);

            // ARCHITECT: продолжать нечем — распознавание останавливаем, панель замирает с объяснением причины.
            if (isFatalDictationError(code)) session.stop();
        };
        session.onend = () => setInterim("");
        session.start();

        return () => {
            session.onresult = null;
            session.onerror = null;
            session.onend = null;
            session.abort();
            sessionRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (stopped) return;

        const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);

        return () => window.clearInterval(timer);
    }, [stopped]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") onCancel();
        };

        document.addEventListener("keydown", onKeyDown);

        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onCancel]);

    const submit = (): void => {
        if (transcript === "") return;

        onSend(transcript);
    };

    // ARCHITECT: причина отказа объясняется словами: молчащий микрофон пользователь читает как поломку сервиса.
    // ARCHITECT: switch, а не карта ключей: t() типизирован по ключам словаря, и юнион строк из карты
    // оверлоады не принимают — каждая ветка вызывает t() со своим литералом.
    const failureMessage = (code: DictationErrorCode): string => {
        switch (code) {
            case "not-allowed":
            case "service-not-allowed":
                return t("input.record.errors.permission");
            case "audio-capture":
                return t("input.record.errors.unsupported");
            case "no-speech":
                return t("input.record.errors.noSpeech");
            default:
                return t("input.record.errors.failed");
        }
    };

    return (
        <div className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.06] px-2 py-1.5">
            <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
                <motion.span
                    className="size-2.5 rounded-full bg-[#f0f0f5]"
                    animate={motionOff ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                    transition={
                        motionOff
                            ? { duration: 0 }
                            : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                    }
                />
            </span>

            <span
                className="shrink-0 text-xs tabular-nums text-[#f0f0f5]/60"
                aria-label={t("input.record.duration")}
            >
                {formatDuration(seconds)}
            </span>

            <div className="flex h-8 shrink-0 items-end gap-0.5" aria-hidden="true">
                {LEVEL_BARS.map((level, index) => (
                    <motion.span
                        key={index}
                        className="w-0.5 rounded-full bg-[#f0f0f5]/50"
                        initial={{ height: 8 }}
                        animate={
                            motionOff ? { height: 24 * level } : { height: [6, 26 * level, 10] }
                        }
                        transition={
                            motionOff
                                ? { duration: 0 }
                                : {
                                      duration: 0.9,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                      delay: index * 0.12,
                                  }
                        }
                    />
                ))}
            </div>

            <p className="min-w-0 flex-1 truncate text-sm text-[#f0f0f5]/80" aria-live="polite">
                {failure !== null ? (
                    <span className="text-[#f0f0f5]/70">{failureMessage(failure)}</span>
                ) : transcript === "" ? (
                    <span className="text-[#f0f0f5]/40">{t("input.record.listening")}</span>
                ) : (
                    transcript
                )}
            </p>

            <button
                type="button"
                onClick={onCancel}
                aria-label={t("input.record.cancel")}
                className={CANCEL_BUTTON}
            >
                <X className="size-4" aria-hidden="true" />
            </button>

            <button
                type="button"
                onClick={submit}
                disabled={transcript === ""}
                aria-label={t("input.record.send")}
                className={SEND_BUTTON}
            >
                <Send className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}
