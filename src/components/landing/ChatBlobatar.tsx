// ARCHITECT: ChatBlobatar — аватар ИИ-репетитора в шапке превью чата.
// Размер задаёт родитель (w-full h-full); взгляд направлен вниз-вправо — на сообщения.

import { Blobatar } from "@blobatar/react";

import { cn } from "@/lib/utils";

export interface ChatBlobatarProps {
    className?: string;
}

const CHAT_TRAITS: Record<string, number | number[]> = {
    shape: 0.35,
    "body.r": 0.456,
    "body.ratio": 0,
    "body.n": 0.999,
    "eye.rx": 0.969,
    "eye.ratio": 0.164,
    "eye.n": 0.232,
    "eye.gap": 0.306,
    "eye.lean": 0.437,
    // ARCHITECT: 0 = влево, 0.5 = центр, 1 = вправо; y > 0.5 — взгляд вниз, на ленту сообщений
    "gaze.x": 0.6,
    "gaze.y": 0.7,
    tone: [0.1, 0.28],
    hue: 0.808,
};

export function ChatBlobatar({ className }: ChatBlobatarProps) {
    return (
        <div className={cn("h-full w-full", className)}>
            <Blobatar animate="always" name="gabriel80" traits={CHAT_TRAITS} />
        </div>
    );
}
