// ARCHITECT: карточка цели урока над лентой: цель, правило, этап и счётчик слов — монохром, без наград, полос
// и значков (§3.1, §12: геймификация в интерфейсе не появляется).
// ARCHITECT: целевых слов здесь нет и быть не может: сервер не отдаёт их даже в счётчиках — только числа,
// поэтому подсказка списком невозможна (§16.6). Список слов раскрывает итоговый блок урока (§спец. 5).

import { useTranslation } from "react-i18next";
import type { ChatLessonPlan } from "@/api/chat";

interface LessonGoalCardProps {
    readonly plan: ChatLessonPlan;
}

export function LessonGoalCard({ plan }: LessonGoalCardProps) {
    const { t } = useTranslation("chat");
    // ARCHITECT: этап показывается номером текущей активности: пройдено 0 этапов — идёт первый, поэтому
    // человек видит «1 из 6», а не «0 из 6».
    const current = Math.min(plan.step + 1, plan.total);

    return (
        <section
            aria-label={t("plan.title")}
            className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
        >
            <p className="text-xs text-[#f0f0f5]/50">{t("plan.title")}</p>
            <p className="mt-1 text-sm text-[#f0f0f5]">{plan.goal}</p>
            <p className="mt-1 text-xs text-[#f0f0f5]/50">{t("plan.rule", { rule: plan.rule })}</p>
            <p className="mt-2 text-xs tabular-nums text-[#f0f0f5]/40">
                {t("plan.step", { current, total: plan.total })} ·{" "}
                {t("plan.words", { done: plan.wordsDone, total: plan.wordsTotal })}
            </p>
            {/* ARCHITECT: завершённый урок подписывается словом, а не новым счётчиком: числа уже показаны. */}
            {plan.completed && (
                <p className="mt-1 text-xs text-[#f0f0f5]/40">{t("plan.completed")}</p>
            )}
        </section>
    );
}
