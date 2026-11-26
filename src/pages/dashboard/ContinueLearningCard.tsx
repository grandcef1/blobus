// ARCHITECT: блок продолжения обучения — инвертированная светлая карточка, часть узнаваемого вида дашборда,
// поэтому палитра сохранена. Сессий нет — карточка превращается в приглашение к мастеру: пустой блок на старте
// читался бы как сбой, а вход в первый урок должен быть на виду.
// ARCHITECT: полоса «общего прогресса» убрана: такой метрики схема не измеряет. Вместо неё — счётчики сессий и
// сообщений, те же числа, что в метриках строкой выше.

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ProgressDto } from "@/api/progress";
import type { SessionSummaryDto } from "@/api/sessions";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { getSessionTitle } from "@/lib/sessionTitle";
import { cn } from "@/lib/utils";

interface ContinueLearningCardProps {
    readonly session: SessionSummaryDto | null;
    readonly progress: ProgressDto;
}

const CARD = cn(
    "group flex items-center gap-4 rounded-2xl bg-[#d7d7df] p-4 transition-colors hover:bg-[#e0e0e8] md:gap-5 md:p-5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
);
const ARROW_BADGE =
    "hidden size-11 shrink-0 items-center justify-center rounded-full bg-black/[0.08] transition-colors group-hover:bg-black/[0.14] sm:flex";

export function ContinueLearningCard({ session, progress }: ContinueLearningCardProps) {
    const { t } = useTranslation("dashboard");

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Link
                to={session === null ? "/session/new" : `/app/chat/${session.id}`}
                className={CARD}
            >
                {session === null ? (
                    <span className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-black/45">
                            {t("overview.continue.emptyTitle")}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-black">
                            {t("overview.continue.emptyAction")}
                        </p>
                        <p className="mt-2 text-xs text-black/50">
                            {t("overview.continue.emptyHint")}
                        </p>
                    </span>
                ) : (
                    <>
                        {/* ARCHITECT: на светлой карточке плашка и заглушка аватара тёмные, поэтому тона
                            передаются явно — как было до перехода на реальные данные. */}
                        <BlobatarAvatar
                            id={session.tutorId}
                            className="size-14 bg-black/[0.08] md:size-16"
                            placeholderClassName="bg-black/10"
                        />

                        <span className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-black/45">
                                {t("overview.continueLearning")}
                            </p>
                            <p className="mt-1 truncate text-lg font-semibold text-black">
                                {getSessionTitle(session, t)}
                            </p>
                            <p className="mt-2 text-xs text-black/50">
                                {t("overview.continue.meta", {
                                    sessions: progress.sessionsTotal,
                                    messages: progress.messagesTotal,
                                })}
                            </p>
                        </span>
                    </>
                )}

                <span className={ARROW_BADGE}>
                    <ArrowRight className="size-5 text-black" aria-hidden="true" />
                </span>
            </Link>
        </motion.div>
    );
}
