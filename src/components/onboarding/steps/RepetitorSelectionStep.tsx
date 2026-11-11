// ARCHITECT: Выбор репетитора — использует блобатары из общего источника
// Радиогруппа с keyboard navigation (стрелки, Tab, Enter/Space)

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import { Button } from "@/components/ui/button";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import type { BlobatarId } from "@/types/blobatar";
import { cn } from "@/lib/utils";

interface RepetitorSelectionStepProps {
    selectedId: BlobatarId | null;
    onSelect: (id: BlobatarId) => void;
    onNext: () => void;
    onBack: () => void;
}

export function RepetitorSelectionStep({
    selectedId,
    onSelect,
    onNext,
    onBack,
}: RepetitorSelectionStepProps) {
    const [focusedIndex, setFocusedIndex] = useState(0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const maxIndex = MOCK_BLOBATARS.length - 1;

        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
                e.preventDefault();
                setFocusedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
                break;
            case "ArrowLeft":
            case "ArrowUp":
                e.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                onSelect(MOCK_BLOBATARS[focusedIndex].id as BlobatarId);
                break;
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#f0f0f5]">Выбери репетитора</h2>
                <p className="mt-1 text-sm text-[#f0f0f5]/50">
                    У каждого свой характер и стиль преподавания
                </p>
            </div>

            <div
                role="radiogroup"
                aria-label="Выбор репетитора"
                onKeyDown={handleKeyDown}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            >
                {MOCK_BLOBATARS.map((blobatar, index) => {
                    const isSelected = selectedId === blobatar.id;
                    const isFocused = focusedIndex === index;

                    return (
                        <motion.button
                            key={blobatar.id}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={blobatar.name}
                            tabIndex={isFocused ? 0 : -1}
                            onClick={() => onSelect(blobatar.id as BlobatarId)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className={cn(
                                "group relative flex flex-col items-center rounded-2xl border p-4 transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                                isSelected
                                    ? "border-white/30 bg-white/[0.08]"
                                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-[#f0f0f5]">
                                    <Check className="size-3 text-black" strokeWidth={3} />
                                </div>
                            )}

                            <div className="mb-3 size-20">
                                <Blobatar
                                    animate="always"
                                    name={blobatar.name.toLowerCase()}
                                    traits={blobatar.traits}
                                />
                            </div>

                            <h3 className="text-sm font-medium text-[#f0f0f5]">{blobatar.name}</h3>
                            <p className="mt-1 text-xs text-[#f0f0f5]/40">Описание позже</p>
                        </motion.button>
                    );
                })}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <Button
                    onClick={onBack}
                    variant="ghost"
                    className="flex items-center gap-2 text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                >
                    <ArrowLeft className="size-4" />
                    Назад
                </Button>

                <Button
                    onClick={onNext}
                    disabled={!selectedId}
                    className={cn(
                        "flex items-center gap-2 rounded-full px-6 py-2.5",
                        selectedId
                            ? "bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90"
                            : "cursor-not-allowed bg-white/10 text-[#f0f0f5]/30"
                    )}
                >
                    Продолжить
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}