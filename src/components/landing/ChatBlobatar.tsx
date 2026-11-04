// ARCHITECT: ChatBlobatar — увеличенный Blobatar для превью чата.
// Статично смотрит строго влево на сообщения (gaze.x = 0).

import { Blobatar } from '@blobatar/react';
 // ARCHITECT: Обязательно для работы параметров gaze

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
    // ARCHITECT: 0 = строго влево (на чат), 0.5 = центр, 1 = вправо
    "gaze.x": 0,   
    "gaze.y": 0.4,
    tone: [0.1, 0.28],
    hue: 0.808,
};

export function ChatBlobatar({ className }: ChatBlobatarProps) {
    return (
        // ARCHITECT: w-80 h-80 = 320px. Достаточно крупно, чтобы было видно детали лица.
        <div className={`w-80 h-80 ${className ?? ""}`}>
            <Blobatar 
                animate="always" 
                name="gabriel80" 
                traits={CHAT_TRAITS} 
            />
        </div>
    );
}