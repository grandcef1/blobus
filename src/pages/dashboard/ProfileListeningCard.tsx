// ARCHITECT: аудирование в профиле — отдельное действие: в адаптивный тест оно не входит, поэтому
// карточка либо показывает уже полученный уровень, либо приглашает пройти проверку.
// ARCHITECT: диалог живёт внутри карточки: точка входа одна, а результат читается из мок-хранилища
// после сохранения.

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { getResult } from "@/api/placement";
import { LEVEL_DESCRIPTIONS } from "@/lib/placement";
import { ListeningTestDialog } from "@/components/placement/ListeningTestDialog";
import type { PlacementResult } from "@/types/placement";

const ACTION_LINK =
    "mt-3 flex min-h-11 items-center text-sm text-[#f0f0f5] underline transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function ProfileListeningCard() {
    const [result, setResult] = useState<PlacementResult | null>(() => getResult());
    const [isOpen, setIsOpen] = useState(false);
    const listening = result?.listening ?? null;

    return (
        <section
            aria-labelledby="profile-listening-title"
            className="rounded-2xl bg-[#111113] p-4 md:p-5"
        >
            <h2
                id="profile-listening-title"
                className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80"
            >
                <Volume2 className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                Аудирование
            </h2>

            <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/50">
                {listening
                    ? `Уровень ${listening}. ${LEVEL_DESCRIPTIONS[listening]}`
                    : "В основной тест уровня аудирование не входит. Проверка отдельная и короткая."}
            </p>

            <button type="button" onClick={() => setIsOpen(true)} className={ACTION_LINK}>
                Проверить аудирование
            </button>

            <ListeningTestDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                onSaved={() => setResult(getResult())}
            />
        </section>
    );
}