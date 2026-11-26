// ARCHITECT: кнопка озвучки реплики репетитора. Голос берётся из профиля voiceId, который пришёл вместе с
// ответом модели, а способ воспроизведения — из тарифа: pro озвучивает провайдер, остальные читают
// браузерным синтезом. Автовоспроизведения нет: звук рождается только по нажатию.
// ARCHITECT: состояние воспроизведения живёт в lib/speechPlayback, поэтому одновременно звучит одна реплика,
// а кнопка соседнего сообщения не показывает «играет».

import { useEffect, useState, useSyncExternalStore } from "react";
import { Play, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchTtsAudio } from "@/api/tts";
import {
    getPlayingId,
    playBrowserSpeech,
    playEncodedAudio,
    stopPlayback,
    subscribePlayback,
} from "@/lib/speechPlayback";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
    /** Идентификатор реплики: воспроизведение одно на страницу, и оно привязано к сообщению. */
    readonly messageId: string;
    readonly text: string;
    /** Профиль голоса из ответа; null — озвучки нет (запись без профиля, например старая история). */
    readonly voiceId: string | null;
    /** Настройка voiceEnabled: выключена — кнопки нет вовсе. */
    readonly enabled: boolean;
    /** Тариф из entitlements: только pro ходит в платный синтез. */
    readonly proPlan: boolean;
}

// ARCHITECT: touch-цель не меньше 44px (size-11) и видимое фокус-кольцо: кнопка живёт внутри пузыря, где
// hover и focus единственные состояния.
const BUTTON =
    "flex size-11 items-center justify-center rounded-lg text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:opacity-40";

export function VoiceButton({ messageId, text, voiceId, enabled, proPlan }: VoiceButtonProps) {
    const { t } = useTranslation("chat");
    const playingId = useSyncExternalStore(subscribePlayback, getPlayingId);
    const [isPending, setIsPending] = useState(false);
    const isPlaying = playingId === messageId;

    // ARCHITECT: размонтирование снимает звук: реплика не должна читаться поверх следующего экрана.
    useEffect(
        () => () => {
            if (getPlayingId() === messageId) stopPlayback();
        },
        [messageId]
    );

    if (!enabled || voiceId === null) return null;

    const start = async (): Promise<void> => {
        if (!proPlan) {
            playBrowserSpeech(messageId, text, voiceId);

            return;
        }

        setIsPending(true);

        try {
            playEncodedAudio(messageId, await fetchTtsAudio(text, voiceId));
        } catch {
            // ARCHITECT: отказ платного синтеза деградирует в текст: платного фолбэка нет, ошибки не показываем.
        } finally {
            setIsPending(false);
        }
    };

    const handleClick = (): void => {
        if (isPlaying) {
            stopPlayback();

            return;
        }

        void start();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? t("voice.stop") : t("voice.play")}
            className={cn(BUTTON, isPlaying && "text-[#f0f0f5]/90")}
        >
            {isPlaying ? (
                <Square className="size-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
                <Play className="size-4" strokeWidth={1.5} aria-hidden="true" />
            )}
        </button>
    );
}
