// ARCHITECT: меню настроек сессии. Прогресс-бейдж в шапке скрыт ниже sm, поэтому дубль «3/10 и
// полоса» живёт здесь: на телефоне это единственное место, где виден прогресс.
// ARCHITECT: смена режима или репетитора не перегенерирует приветствие — меняется контекст
// будущих сообщений, история диалога остаётся нетронутой.

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { resetSessionProgress, updateSession } from "@/api/sessions";
import type { SessionPatch } from "@/api/sessions";
import { toast } from "@/store/toast";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { CHAT_HEADER_BUTTON } from "./headerButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnhancedChatSession } from "@/types/session";
import type { EnglishLevel, LearningMode } from "@/types/onboarding";

const LEVELS: EnglishLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface SessionSettingsMenuProps {
    session: EnhancedChatSession;
    onUpdated: (session: EnhancedChatSession) => void;
}

export function SessionSettingsMenu({ session, onUpdated }: SessionSettingsMenuProps) {
    const [isResetOpen, setIsResetOpen] = useState(false);
    const { completedLessons, totalLessons } = session.progress;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const applyPatch = (patch: SessionPatch, message: string) => {
        const updated = updateSession(session.id, patch);
        if (!updated) return;
        onUpdated(updated);
        toast.info(message);
    };

    const handleModeChange = (value: string) =>
        applyPatch({ learningMode: value as LearningMode }, "Режим изменён");
    const handleTutorChange = (value: string) =>
        applyPatch({ repetitorId: value }, "Репетитор изменён");
    const handleLevelChange = (value: string) =>
        applyPatch({ targetLevel: value }, "Уровень изменён");

    const handleReset = () => {
        const updated = resetSessionProgress(session.id);
        if (updated) onUpdated(updated);
        setIsResetOpen(false);
        toast.success("Прогресс сброшен");
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label="Настройки сессии" className={CHAT_HEADER_BUTTON}>
                        <Settings2 className="size-4" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-60">
                    <div className="flex items-center gap-3 px-3 py-2 sm:hidden">
                        <span className="text-[11px] tabular-nums text-[#f0f0f5]/40">
                            {completedLessons}/{totalLessons}
                        </span>
                        <ProgressBar value={percent} className="flex-1" />
                    </div>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Режим</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64">
                            <DropdownMenuRadioGroup
                                value={session.learningMode}
                                onValueChange={handleModeChange}
                            >
                                {MOCK_LEARNING_MODES.map((mode) => (
                                    <DropdownMenuRadioItem key={mode.id} value={mode.id}>{mode.label}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Репетитор</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                            <DropdownMenuRadioGroup
                                value={session.repetitorId}
                                onValueChange={handleTutorChange}
                            >
                                {MOCK_BLOBATARS.map((blobatar) => (
                                    <DropdownMenuRadioItem key={blobatar.id} value={blobatar.id}>
                                        <BlobatarAvatar
                                            id={blobatar.id}
                                            animated={false}
                                            className="size-5 bg-white/5"
                                        />
                                        {blobatar.name}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Уровень</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-40">
                            <DropdownMenuRadioGroup
                                value={session.targetLevel ?? ""}
                                onValueChange={handleLevelChange}
                            >
                                {LEVELS.map((level) => (
                                    <DropdownMenuRadioItem key={level} value={level}>{level}</DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => setIsResetOpen(true)}>
                        Сбросить прогресс
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmActionDialog
                open={isResetOpen}
                onOpenChange={setIsResetOpen}
                title="Сбросить прогресс"
                description="Счётчики уроков, слов и серия дней обнулятся. История сообщений останется."
                confirmLabel="Сбросить"
                onConfirm={handleReset}
            />
        </>
    );
}
