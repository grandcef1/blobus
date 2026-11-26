// ARCHITECT: единая карточка для обеих веток: страница сводит мок и real к одной view-model, поэтому
// переименование context→example живёт здесь, а колонка в схеме остаётся прежней. Озвучки, процента
// освоения и транскрипции нет — владелец убрал их из словаря. null-поле не рендерится.

export interface VocabularyCardModel {
    readonly id: string;
    readonly term: string;
    readonly translation: string | null;
    readonly example: string | null;
    readonly exampleTranslation: string | null;
    readonly nextDueAt: string;
}

interface VocabularyEntryCardProps {
    readonly model: VocabularyCardModel;
}

export function VocabularyEntryCard({ model }: VocabularyEntryCardProps) {
    return (
        <article className="rounded-xl bg-[#141416] p-4">
            <h3 className="truncate text-base font-medium text-[#f0f0f5]">{model.term}</h3>
            {model.translation !== null && (
                <p className="mt-0.5 truncate text-sm text-[#f0f0f5]/60">{model.translation}</p>
            )}
            {model.example !== null && (
                <div className="mt-3 border-t border-white/5 pt-3">
                    <p className="truncate text-xs italic text-[#f0f0f5]/50">{model.example}</p>
                    {model.exampleTranslation !== null && (
                        <p className="mt-0.5 truncate text-xs text-[#f0f0f5]/30">
                            {model.exampleTranslation}
                        </p>
                    )}
                </div>
            )}
        </article>
    );
}
