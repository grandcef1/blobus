// ARCHITECT: строка состояния выбора перед навигацией. Появляется только при выборе и
// озвучивается через aria-live polite: на ширинах ниже lg правой панели нет, и это
// единственная обратная связь перед кнопкой продолжения. Пустая строка сохранена в DOM с
// минимальной высотой, поэтому появление текста не дёргает композицию.

import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import type { Blobatar } from "@/types/blobatar";

export interface SelectionStatusLineProps {
    blobatar: Blobatar | null;
}

export function SelectionStatusLine({ blobatar }: SelectionStatusLineProps) {
    return (
        <p
            aria-live="polite"
            className="mt-6 flex min-h-6 items-center gap-2 text-sm text-[#f0f0f5]/70"
        >
            {blobatar && (
                <>
                    <BlobatarAvatar id={blobatar.id} className="size-6" />
                    <span>Выбран репетитор: {blobatar.name}</span>
                </>
            )}
        </p>
    );
}
