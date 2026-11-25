// ARCHITECT: карточка реальной записи словаря: в схеме нет озвучки, mastery и примеров, поэтому
// показываем только term/translation/context. null-поле не рендерим — пустая строка соврала бы,
// а прочерк выглядел бы как значение.

import type { VocabularyEntryDto } from "@/api/progress";

interface VocabularyEntryCardProps {
    readonly entry: VocabularyEntryDto;
}

export function VocabularyEntryCard({ entry }: VocabularyEntryCardProps) {
    return (
        <article className="rounded-xl bg-[#141416] p-4">
            <h3 className="truncate text-base font-medium text-[#f0f0f5]">{entry.term}</h3>
            {entry.translation !== null && (
                <p className="mt-0.5 truncate text-sm text-[#f0f0f5]/60">{entry.translation}</p>
            )}
            {entry.context !== null && (
                <p className="mt-1 truncate text-xs italic text-[#f0f0f5]/50">{entry.context}</p>
            )}
        </article>
    );
}
