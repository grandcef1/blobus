// src/components/landing/faq/FaqBlobatar.tsx
// ARCHITECT: Специальный BloBatar для секции FAQ.
// ARCHITECT: Использует имя "gabriel80" для идентичности с Hero/ChatPreview.
// ARCHITECT: "eye.ratio": 0 делает глаза прищуренными, "gaze.x": 0 заставляет смотреть строго влево.
// ARCHITECT: Использует arbitrary values (md:w-[32rem]) для достижения действительно крупного размера.

import { Blobatar } from '@blobatar/react';

export interface FaqBlobatarProps {
    readonly className?: string;
}

const FAQ_TRAITS: Record<string, number | number[]> = {
    shape: 0.35,
    "body.r": 0.456,
    "body.ratio": 0,
    "body.n": 0.999,
    "eye.rx": 0.969,
    "eye.ratio": 0,       // ARCHITECT: 0 = максимально прищуренные глаза
    "eye.n": 0.232,
    "eye.gap": 0.306,
    "eye.lean": 0.437,
    "gaze.x": 0,          // ARCHITECT: 0 = строго влево (на текст вопроса)
    "gaze.y": 0.4,
    tone: [0.1, 0.28],
    hue: 0.808,
};

export function FaqBlobatar({ className }: FaqBlobatarProps) {
    return (
        <div className={`relative w-64 h-64 translate-x-4 md:w-[34rem] md:h-[34rem] ${className ?? ""}`}>
            <Blobatar 
                animate="always" 
                name="gabriel80" 
                traits={FAQ_TRAITS} 
            />
        </div>
    );
}