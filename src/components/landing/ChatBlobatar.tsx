import { Blobatar } from "@blobatar/react";

// ARCHITECT: ChatBlobatar — «тихий» Blobatar для превью чата в FeaturesSection.
// Копия BrandBlobatar БЕЗ useGaze / lookAt("pointer") — миниатюра не следит за курсором,
// а статично смотрит влево (на сообщения чата) через трейты gaze.x/gaze.y
// (0 = взгляд влево, 0.5 = по центру, 1 = вправо).

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
    // ARCHITECT: смотрит немного влево (на чат) и чуть вниз
    "gaze.x": 0.2, // 0 = влево, 0.5 = центр, 1 = вправо
    "gaze.y": 0.4,
    tone: [0.1, 0.28],
    hue: 0.808,
};

export function ChatBlobatar({ className }: ChatBlobatarProps) {
    return (
        <div className={`w-64 h-64 ${className ?? ""}`}>
            <Blobatar animate="always" name="gabriel80" traits={CHAT_TRAITS} />
        </div>
    );
}