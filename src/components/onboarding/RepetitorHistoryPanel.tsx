// ARCHITECT: полоса истории — вкладка для чтения, а не вторая карточка. Идентичность персонажа
// живёт только в карточке, поэтому внутри нет ни аватара, ни заголовка-имени, ни строки черт.
// Поверхность сплошная (#111113) вместо стекла: вкладка читается тише карточек и не спорит с
// ними, а блюр на широкой полосе только размывал бы текст.

import type { RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { CARD_RADIUS, FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { Blobatar } from "@/types/blobatar";

/** Стабильный id полосы: карточки ссылаются на него через aria-controls. */
export const REPETITOR_HISTORY_PANEL_ID = "repetitor-history-panel";

// ARCHITECT: gap-4 сетки выбора в пикселях. Значение связано с классом gap-4 в шаге, иначе его
// не выразить, поэтому здесь стоит напоминание держать их синхронно.
const GRID_GAP_PX = 16;

export interface RepetitorHistoryPanelProps {
    blobatar: Blobatar;
    /** Число колонок сетки: от него зависит позиция указателя. */
    columns: number;
    /** Индекс колонки карточки-источника. */
    columnIndex: number;
    onClose: () => void;
    panelRef: RefObject<HTMLElement | null>;
}

export function RepetitorHistoryPanel({
    blobatar,
    columns,
    columnIndex,
    onClose,
    panelRef,
}: RepetitorHistoryPanelProps) {
    const shouldReduceMotion = useReducedMotion();

    // ARCHITECT: первое слово истории — имя персонажа во всех десяти текстах, поэтому выделяем
    // его внутри абзаца: имя звучит один раз и не создаёт второго носителя идентичности. Защита
    // на случай строки без пробела просто оставляет весь текст приглушённым.
    const spaceIndex = blobatar.persona.story.indexOf(" ");
    const lead = spaceIndex === -1 ? blobatar.persona.story : blobatar.persona.story.slice(0, spaceIndex);
    const tail = spaceIndex === -1 ? "" : blobatar.persona.story.slice(spaceIndex);

    // ARCHITECT: inline-стиль здесь — данные состояния, а не оформление, как ширина полосы
    // прогресса: центр колонки источника считается от числа колонок и зазора сетки, поэтому
    // никакой замер ширины не нужен. Шесть пикселей — половина указателя, translate не нужен.
    const pointerLeft = `calc((100% - ${GRID_GAP_PX * (columns - 1)}px) / ${columns} * ${
        columnIndex + 0.5
    } + ${GRID_GAP_PX * columnIndex}px - 6px)`;

    return (
        <div className="relative">
            {/* ARCHITECT: указатель — хвост реплики: он показывает, чья история открыта, без
                второго имени и аватара. Стороны повёрнутого квадрата ложатся ровно на верхнюю
                границу полосы, а z-10 нужен, чтобы его нижняя половина перекрыла линию границы
                под собой: так хвост читается как продолжение полосы, а не как отдельная метка. */}
            <motion.span
                aria-hidden="true"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeInOut" }}
                className="absolute -top-1.5 z-10 block size-3"
                style={{ left: pointerLeft }}
            >
                <span className="block size-3 rotate-45 border-l border-t border-white/5 bg-[#111113]" />
            </motion.span>

            <motion.section
                id={REPETITOR_HISTORY_PANEL_ID}
                ref={panelRef}
                role="region"
                // ARCHITECT: tabIndex -1 — полоса не входит в порядок табуляции, но принимает
                // фокус программно при открытии: клавиатурный пользователь сразу в тексте.
                tabIndex={-1}
                aria-label={`История: ${blobatar.name}`}
                initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeInOut" }}
                className={cn(
                    CARD_RADIUS,
                    "relative overflow-hidden border border-white/5 bg-[#111113] p-5 md:p-6"
                )}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Свернуть историю"
                    className={cn(
                        "absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[#f0f0f5]/55 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]",
                        FOCUS_RING
                    )}
                >
                    <X className="size-4" aria-hidden="true" />
                </button>

                {/* ARCHITECT: ключ по персонажу даёт короткий кроссфейд текста при переносе
                    полосы на другую карточку; высота при этом не переигрывается. */}
                <motion.div
                    key={blobatar.id}
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
                >
                    <p className="max-w-prose pr-12 text-base leading-relaxed text-[#f0f0f5]/70">
                        <span className="font-medium text-[#f0f0f5]">{lead}</span>
                        {tail}
                    </p>
                </motion.div>
            </motion.section>
        </div>
    );
}

