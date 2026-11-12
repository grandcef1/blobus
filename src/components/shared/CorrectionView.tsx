// ARCHITECT: единый вид исправления — один компонент и для чата, и для демо-окна. Правка показана
// точечно: подсвечено только изменённое слово, а не всё предложение.
// ARCHITECT: решение владельца — изменённое слово не красится текстом, а получает мягкий тинт
// контейнера: чип читается как подсветка, без жёсткого контраста и без цветных плашек.
// ARCHITECT: поверхность карточки тёплая (#171310), чтобы правка мягко отличалась от холодных
// сообщений; исходник, исправленный и пояснение разведены на отдельные блоки.
// ARCHITECT: ни одного dangerouslySetInnerHTML — сегменты приходят типизированным массивом и
// рендерятся узлами React, поэтому мок-контент не может стать разметкой.

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { CorrectionSegment, GrammarCorrection } from "@/types/session";
import { cn } from "@/lib/utils";

interface CorrectionViewProps {
    correction: GrammarCorrection;
    className?: string;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";
const RULE = "text-xs text-[#f0f0f5]/50";
const BODY = "text-sm leading-[1.6]";
const SUB_BLOCK = "rounded-lg bg-black/20 p-3";

const SEVERITY_LABEL: Record<GrammarCorrection["severity"], string> = {
    minor: "мелкая правка",
    moderate: "средняя правка",
    major: "важная правка",
};

const SEVERITY_MARKER: Record<GrammarCorrection["severity"], string> = {
    minor: "bg-[#f0f0f5]/40",
    moderate: "bg-amber-400/70",
    major: "bg-red-400/70",
};

// ARCHITECT: функции-рендереры, а не вложенные компоненты: правило «один компонент на файл»
// сохраняется, а разметка сегментов описана ровно один раз.
function renderSegments(segments: CorrectionSegment[], tone: "original" | "corrected"): ReactNode {
    return segments.map((segment, index) => {
        if (!segment.changed) {
            return (
                <span
                    key={index}
                    className={tone === "original" ? "text-[#f0f0f5]/60" : "text-[#f0f0f5]/90"}
                >
                    {segment.text}
                </span>
            );
        }

        return (
            <span
                key={index}
                className={cn(
                    "rounded-md px-1",
                    tone === "original"
                        ? "bg-red-400/10 text-[#f0f0f5]/80 line-through decoration-red-400/40"
                        : "bg-green-400/10 text-[#f0f0f5]/90"
                )}
            >
                {segment.text}
            </span>
        );
    });
}

export function CorrectionView({ correction, className }: CorrectionViewProps) {
    const [showExamples, setShowExamples] = useState(false);

    return (
        <div className={cn("w-full rounded-xl border border-white/5 bg-[#171310] p-4", className)}>
            <p className={EYEBROW}>Исправление</p>

            <div className="mt-3 space-y-3">
                <div className={SUB_BLOCK}>
                    <p className={BODY}>{renderSegments(correction.originalSegments, "original")}</p>
                </div>

                <div className={SUB_BLOCK}>
                    <p className={BODY}>{renderSegments(correction.correctedSegments, "corrected")}</p>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={RULE}>{correction.ruleName}</span>
                <span className="inline-flex items-center gap-2 text-xs text-[#f0f0f5]/50">
                    <span
                        className={cn("size-1.5 rounded-full", SEVERITY_MARKER[correction.severity])}
                        aria-hidden="true"
                    />
                    {SEVERITY_LABEL[correction.severity]}
                </span>
            </div>

            <div className={cn(SUB_BLOCK, "mt-3")}>
                <p className={cn(BODY, "text-[#f0f0f5]/70")}>{correction.explanation}</p>
            </div>

            {correction.examples.length > 0 && (
                <div className="mt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={() => setShowExamples(!showExamples)}
                        aria-expanded={showExamples}
                        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                    >
                        Примеры
                        <ChevronDown
                            className={cn(
                                "size-4 transition-transform duration-200",
                                showExamples && "rotate-180"
                            )}
                            aria-hidden="true"
                        />
                    </button>

                    <motion.div
                        initial={false}
                        animate={{ height: showExamples ? "auto" : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        {showExamples && (
                            <ul className="space-y-1.5 pb-1">
                                {correction.examples.map((example, index) => (
                                    <li key={index} className={cn(BODY, "text-[#f0f0f5]/70")}>
                                        {example}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}