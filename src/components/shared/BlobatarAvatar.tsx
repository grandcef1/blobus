// ARCHITECT: общий аватар персонажа. Раньше блок с Blobatar и запасным кругом копировался
// вручную в двенадцати местах, и расхождения в именах жили именно из-за этого. Размер и тон
// плашки задаёт вызывающий через className (на светлых инвертированных карточках тон тёмный),
// внутри жёстких размеров нет. useGaze не подключаем: слежение за курсором в мелких аватарах
// не нужно и стоит производительности.

import { Blobatar } from "@blobatar/react";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { cn } from "@/lib/utils";

export interface BlobatarAvatarProps {
    /** Идентификатор персонажа; устаревшие id нормализует getBlobatarById. */
    id: string;
    /** Размер и тон плашки: size-*, p-*, bg-*. */
    className?: string;
    /** false — статичный блобатар без анимации, для плотных списков. */
    animated?: boolean;
    /** Тон заглушки, когда идентификатор не распознан. */
    placeholderClassName?: string;
}

export function BlobatarAvatar({
    id,
    className,
    animated = true,
    placeholderClassName = "bg-white/10",
}: BlobatarAvatarProps) {
    const blobatar = getBlobatarById(id);

    return (
        <span
            aria-hidden="true"
            className={cn("block shrink-0 overflow-hidden rounded-full bg-[#141416]", className)}
        >
            {blobatar ? (
                animated ? (
                    <Blobatar
                        animate="always"
                        name={blobatar.name.toLowerCase()}
                        traits={blobatar.traits}
                    />
                ) : (
                    // ARCHITECT: литерал false не проходит типы пакета (BlobatarOptions.animate
                    // пересекается с StaticProps), поэтому статичный режим — отсутствие пропа.
                    <Blobatar
                        name={blobatar.name.toLowerCase()}
                        traits={blobatar.traits}
                        className="size-full"
                    />
                )
            ) : (
                <span className={cn("block size-full rounded-full", placeholderClassName)} />
            )}
        </span>
    );
}
