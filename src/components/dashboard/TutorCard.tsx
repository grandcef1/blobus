// ARCHITECT: карточка репетитора на странице «Репетиторы» — то же лицо персонажа, что в мастере:
// аватар, имя, черты характера и стиль. Подробности (история) раскрываются на месте: уход со
// страницы за деталями ломал бы сравнение, ради которого страница и заведена.
// ARCHITECT: страница только для чтения — выбор репетитора остаётся в мастере и в меню сессии,
// поэтому карточка ничего не меняет и не содержит действий.
// Тексты берутся из persona, своего описания у страницы нет.

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { PersonaStory } from "@/components/shared/PersonaStory";
import { cn } from "@/lib/utils";
import type { Blobatar } from "@/types/blobatar";

interface TutorCardProps {
    blobatar: Blobatar;
}

const DISCLOSURE =
    "flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";
/** Черта характера: тонкая метка, цвет ей не нужен — состояние здесь ничего не значит. */
const TRAIT = "rounded-md bg-white/5 px-2 py-1 text-[11px] text-[#f0f0f5]/60";

export function TutorCard({ blobatar }: TutorCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <article className="flex flex-col rounded-2xl border border-white/5 bg-[#111113] p-5">
            <div className="flex items-start gap-4">
                <BlobatarAvatar id={blobatar.id} className="size-16 shrink-0 bg-transparent" />

                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium text-[#f0f0f5]">{blobatar.name}</h2>

                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {blobatar.persona.traits.map((trait) => (
                            <li key={trait} className={TRAIT}>
                                {trait}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <p className="mt-4 text-sm leading-[1.6] text-[#f0f0f5]/70">
                {blobatar.persona.teachingStyle}
            </p>

            {/* ARCHITECT: mt-auto прижимает раскрытие к низу: в ряду сетки подписи стоят на одной
                линии независимо от длины описания у соседа. */}
            <div className="mt-auto pt-4">
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    className={DISCLOSURE}
                >
                    Подробнее
                    <ChevronDown
                        className={cn(
                            "size-4 shrink-0 transition-transform duration-200",
                            isExpanded && "rotate-180"
                        )}
                        aria-hidden="true"
                    />
                </button>

                <motion.div
                    initial={false}
                    animate={{ height: isExpanded ? "auto" : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                >
                    {isExpanded && (
                        <PersonaStory
                            story={blobatar.persona.story}
                            className="pb-1 text-sm leading-[1.6] text-[#f0f0f5]/60"
                        />
                    )}
                </motion.div>
            </div>
        </article>
    );
}