// ARCHITECT: карточка персонажа — кнопка выбора плюс отдельная кнопка истории: вкладывать
// кнопку в кнопку нельзя, поэтому история живёт сестрой кнопки выбора внутри статьи. Сама
// история раскрывается отдельной панелью под рядом, поэтому высота карточки неизменна и не
// зависит от того, что открыто у соседа. Карточка мемоизирована: выбор одного персонажа не
// должен перерисовывать остальные девять.

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { REPETITOR_HISTORY_PANEL_ID } from "@/components/onboarding/RepetitorHistoryPanel";
import { FOCUS_RING, tileClasses } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { Blobatar, BlobatarId } from "@/types/blobatar";

export interface RepetitorCardProps {
    blobatar: Blobatar;
    index: number;
    isSelected: boolean;
    isHistoryOpen: boolean;
    isFocused: boolean;
    onSelect: (id: BlobatarId) => void;
    onToggleHistory: (id: BlobatarId) => void;
    onFocus: (index: number) => void;
    registerRadio: (index: number, node: HTMLButtonElement | null) => void;
    registerHistoryButton: (index: number, node: HTMLButtonElement | null) => void;
}

function RepetitorCardBase({
    blobatar,
    index,
    isSelected,
    isHistoryOpen,
    isFocused,
    onSelect,
    onToggleHistory,
    onFocus,
    registerRadio,
    registerHistoryButton,
}: RepetitorCardProps) {
    const shouldReduceMotion = useReducedMotion();
    const { persona } = blobatar;

    return (
        <motion.article
            layout={!shouldReduceMotion}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
                shouldReduceMotion
                    ? { duration: 0 }
                    : {
                          duration: 0.2,
                          ease: "easeOut",
                          delay: index * 0.03,
                          layout: { duration: 0.25, ease: "easeOut" },
                      }
            }
            className={tileClasses(isSelected, "relative flex flex-col")}
        >
            {isSelected && (
                <motion.span
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="pointer-events-none absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[#f0f0f5]"
                >
                    <Check className="size-3 text-black" strokeWidth={3} aria-hidden="true" />
                </motion.span>
            )}

            {/* ARCHITECT: внутри кнопки только фразовое содержимое: h3 и p там недопустимы,
                поэтому блок текста собран из span, разделённых отступами. */}
            <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${blobatar.name}, ${persona.traits.join(", ")}`}
                tabIndex={isFocused ? 0 : -1}
                ref={(node) => registerRadio(index, node)}
                onClick={() => onSelect(blobatar.id)}
                onFocus={() => onFocus(index)}
                className={cn(
                    "flex w-full flex-col items-start rounded-3xl p-5 text-left",
                    FOCUS_RING
                )}
            >
                <BlobatarAvatar id={blobatar.id} className="size-20 bg-transparent sm:size-24" />

                <span className="mt-4 block w-full">
                    <span className="block text-base font-medium text-[#f0f0f5]">
                        {blobatar.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#f0f0f5]/55">
                        {persona.traits.join(" · ")}
                    </span>
                    <span className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#f0f0f5]/70">
                        {persona.teachingStyle}
                    </span>
                </span>
            </button>

            {/* ARCHITECT: mt-auto прижимает кнопку к низу карточки, поэтому в ряду сетки они
                стоят на одной линии, а открытие панели истории карточку не растягивает. */}
            <button
                type="button"
                ref={(node) => registerHistoryButton(index, node)}
                aria-expanded={isHistoryOpen}
                aria-controls={REPETITOR_HISTORY_PANEL_ID}
                onClick={() => onToggleHistory(blobatar.id)}
                className={cn(
                    "mt-auto flex min-h-11 w-full items-center justify-between gap-2 border-t border-white/5 px-5 text-sm text-[#f0f0f5]/60 transition-colors hover:text-[#f0f0f5]",
                    FOCUS_RING
                )}
            >
                <span>{isHistoryOpen ? "Свернуть" : "История"}</span>
                <ChevronDown
                    className={cn(
                        "size-4 shrink-0 transition-transform duration-200",
                        isHistoryOpen && "rotate-180",
                        shouldReduceMotion && "transition-none"
                    )}
                    aria-hidden="true"
                />
            </button>
        </motion.article>
    );
}

// ARCHITECT: memo — переключение выбора не перерисовывает девять чужих карточек; все
// обработчики приходят из шага стабильными.
export const RepetitorCard = memo(RepetitorCardBase);

