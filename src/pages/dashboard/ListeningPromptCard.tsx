// ARCHITECT: аудирование ищут в «Обзоре»: тест уровня предлагает его как опцию, поэтому после теста
// подсказка живёт на стартовой странице приложения. Карточка исчезает, как только уровень получен;
// в профиле остаётся тот же вход, но основная точка — здесь.

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { getResult } from "@/api/placement";
import { FOCUS_RING, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { ListeningTestDialog } from "@/components/placement/ListeningTestDialog";
import type { PlacementResult } from "@/types/placement";

export function ListeningPromptCard() {
    const [result, setResult] = useState<PlacementResult | null>(() => getResult());
    const [isOpen, setIsOpen] = useState(false);

    // ARCHITECT: состояние обновляется на закрытии диалога, а не на сохранении уровня: иначе
    // карточка, владеющая диалогом, размонтировала бы его вместе с экраном результата.
    const handleOpenChange = (next: boolean) => {
        setIsOpen(next);
        if (!next) setResult(getResult());
    };

    if (result?.listening) return null;

    return (
        <section
            aria-labelledby="listening-prompt-title"
            className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
        >
            <div className="min-w-0">
                <h2
                    id="listening-prompt-title"
                    className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80"
                >
                    <Volume2 className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                    Аудирование не проверено
                </h2>
                <p className="mt-1 text-sm leading-[1.6] text-[#f0f0f5]/50">
                    Шесть коротких заданий на понимание на слух. Два прослушивания на задание.
                </p>
            </div>

            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(PRIMARY_BUTTON, FOCUS_RING, "shrink-0")}
            >
                Проверить
            </button>

            <ListeningTestDialog open={isOpen} onOpenChange={handleOpenChange} />
        </section>
    );
}