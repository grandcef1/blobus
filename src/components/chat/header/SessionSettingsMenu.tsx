// ARCHITECT: меню настроек сессии. Прогресс-бейдж в шапке скрыт ниже sm, поэтому дубль «3/10 и полоса» живёт
// здесь: на телефоне это единственное место, где виден прогресс.
// ARCHITECT: репетитор выбирается в диалоге, а не в подменю: то же меню строки списка подменю иметь не может, а
// одно действие должно выглядеть одинаково в обоих местах. Смена репетитора не перегенерирует приветствие —
// меняется контекст будущих сообщений, история диалога остаётся нетронутой.
// ARCHITECT: пункта «Уровень» здесь нет: уровень определяет тест. Режим меняется только там, где его
// поддерживает хранилище (мок-стор): PATCH реальной сессии принимает название и репетитора.

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { TutorPickerDialog } from "./TutorPickerDialog";
import { CHAT_HEADER_BUTTON } from "./headerButton";
import type { SessionActions } from "./sessionActions";
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
import type { LearningMode } from "@/types/onboarding";

interface SessionSettingsMenuProps {
    readonly session: EnhancedChatSession;
    readonly actions: SessionActions;
}

export function SessionSettingsMenu({ session, actions }: SessionSettingsMenuProps) {
    const { t } = useTranslation("chat");
    const navigate = useNavigate();
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [isTutorOpen, setIsTutorOpen] = useState(false);
    const { completedLessons, totalLessons } = session.progress;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const changeMode = actions.changeMode;
    // ARCHITECT: сброс одних счётчиков есть только у мок-стора: у реальной сессии это же действие = очистка
    // истории (счётчики прогресса считаются из БД, а не хранятся в сессии).
    const resetProgress = actions.resetProgress ?? actions.reset;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t("settings.openLabel")} className={CHAT_HEADER_BUTTON}>
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

                    {changeMode !== undefined && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>{t("settings.mode")}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-64">
                                <DropdownMenuRadioGroup
                                    value={session.learningMode}
                                    onValueChange={(value) => void changeMode(value as LearningMode)}
                                >
                                    {MOCK_LEARNING_MODES.map((mode) => (
                                        <DropdownMenuRadioItem key={mode.id} value={mode.id}>
                                            {mode.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}

                    <DropdownMenuItem onSelect={() => setIsTutorOpen(true)}>
                        {t("settings.tutor")}
                    </DropdownMenuItem>
                    {/* ARCHITECT: ссылка на список репетиторов: из меню видно, что о каждом есть подробности. */}
                    <DropdownMenuItem onSelect={() => navigate("/app/tutors")}>
                        {t("settings.tutorsDetails")}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => setIsResetOpen(true)}>
                        {t("settings.resetProgress")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <TutorPickerDialog
                open={isTutorOpen}
                onOpenChange={setIsTutorOpen}
                currentTutorId={session.repetitorId}
                onConfirm={actions.changeTutor}
            />

            <ConfirmActionDialog
                open={isResetOpen}
                onOpenChange={setIsResetOpen}
                title={t("settings.resetProgress")}
                description={t("settings.resetProgressDescription")}
                confirmLabel={t("settings.resetConfirm")}
                onConfirm={() => {
                    setIsResetOpen(false);
                    void resetProgress();
                }}
            />
        </>
    );
}
