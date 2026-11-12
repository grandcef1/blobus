// ARCHITECT: карточка репетитора на странице «Репетиторы» — то же лицо персонажа, что в мастере:
// аватар, имя, три черты и стиль. Подробности (история) раскрываются на месте: уход со страницы за
// деталями ломал бы сравнение, ради которого страница и заведена.
// ARCHITECT: выбор репетитора правит текущую сессию, а если её нет — ведёт в мастер новой сессии.
// Тексты берутся из persona, своего описания у страницы нет.

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSessions, updateSession } from "@/api/sessions";
import { toast } from "@/store/toast";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { PersonaStory } from "@/components/shared/PersonaStory";
import { FOCUS_RING, GHOST_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { Blobatar } from "@/types/blobatar";

interface TutorCardProps {
    blobatar: Blobatar;
}

const DISCLOSURE =
    "mt-3 flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function TutorCard({ blobatar }: TutorCardProps) {
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);
    // ARCHITECT: активной считается первая сессия — так же, как её понимает «Обзор»: отдельного
    // «текущего» указателя в моках нет, а расходиться с дашбордом список не должен.
    const activeSession = getSessions()[0];
    const isCurrent = activeSession?.repetitorId === blobatar.id;

    const handleSelect = () => {
        if (!activeSession) {
            navigate("/session/new");
            return;
        }

        const updated = updateSession(activeSession.id, { repetitorId: blobatar.id });
        if (updated) toast.success(`Репетитор выбран: ${blobatar.name}`);
    };

    return (
        <article className="flex flex-col rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5">
            <div className="flex items-start gap-4">
                <BlobatarAvatar id={blobatar.id} className="size-16 shrink-0 bg-transparent" />

                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium text-[#f0f0f5]">{blobatar.name}</h2>
                    <p className="mt-1 text-xs text-[#f0f0f5]/55">
                        {blobatar.persona.traits.join(" · ")}
                    </p>
                </div>
            </div>

            <p className="mt-3 text-sm leading-[1.6] text-[#f0f0f5]/70">
                {blobatar.persona.teachingStyle}
            </p>

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

            {/* ARCHITECT: mt-auto прижимает действие к низу: в ряду сетки кнопки стоят на одной
                линии независимо от того, раскрыта ли история у соседа. */}
            <div className="mt-auto pt-4">
                {isCurrent ? (
                    <p className="flex min-h-11 items-center text-xs text-[#f0f0f5]/50">
                        Это ваш репетитор
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={handleSelect}
                        className={cn(
                            GHOST_BUTTON,
                            FOCUS_RING,
                            "w-full justify-center border border-white/10"
                        )}
                    >
                        Выбрать репетитора
                    </button>
                )}
            </div>
        </article>
    );
}