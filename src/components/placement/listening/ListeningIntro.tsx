// ARCHITECT: инструкция перед первым заданием — единственное место, где объясняется лимит из двух
// прослушиваний: без него кнопка, гаснущая после второго клика, читается как поломка.
// ARCHITECT: контекст меняет только поверхность: в мастере блок идёт внутри шага, на отдельном
// экране — своей карточкой, как остальные карточки дашборда.

import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { ListeningContext } from "@/types/placement";

interface ListeningIntroProps {
    context: ListeningContext;
    onStart: () => void;
}

export function ListeningIntro({ context, onStart }: ListeningIntroProps) {
    return (
        <div
            className={cn(
                context === "standalone" && "rounded-2xl border border-white/5 bg-[#111113] p-5"
            )}
        >
            <h2 className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80">
                <Headphones className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                Проверка аудирования
            </h2>

            <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/60">
                Перед выбором ответа прослушайте запись. Каждый фрагмент можно прослушать только
                дважды — отвечайте после прослушивания.
            </p>

            <div className="mt-5 flex justify-end">
                <Button type="button" className={PRIMARY_BUTTON} onClick={onStart}>
                    Начать
                </Button>
            </div>
        </div>
    );
}