// ARCHITECT: навыки из реальных данных: уровень и балл приходят серверным тестом (progress DTO), а аудирование
// остаётся локальной отдельной проверкой — серверная строка его не хранит, поэтому «не проверено» честнее
// выдуманного уровня.
// ARCHITECT: строки grammar/speaking убраны: до Placement 1A они не измеряются, а показывать один уровень под
// тремя подписями значило выдавать догадку за замер.
// ARCHITECT: результат приходит пропом: его читает тот же запрос, что остальные данные профиля, поэтому
// скелетон страницы закрывает и навыки.

import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LEVEL_DESCRIPTION_KEYS } from "@/lib/placement";
import type { EnglishLevel } from "@/types/onboarding";

interface ProfileSkillsCardProps {
    readonly level: EnglishLevel | null;
    readonly score: number | null;
    readonly listening: EnglishLevel | null;
}

interface SkillRow {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly hint: string;
}

export function ProfileSkillsCard({ level, score, listening }: ProfileSkillsCardProps) {
    const { t } = useTranslation("dashboard");
    const { t: tPlacement } = useTranslation("placement");

    const rows: readonly SkillRow[] = [
        {
            id: "overall",
            label: t("profile.skills.overall"),
            value: level ?? t("profile.skills.notChecked"),
            hint:
                level === null
                    ? t("profile.skills.levelHint")
                    : score === null
                      ? tPlacement(LEVEL_DESCRIPTION_KEYS[level])
                      : t("profile.skills.score", { score }),
        },
        {
            id: "listening",
            label: t("profile.skills.listening"),
            value: listening ?? t("profile.skills.notChecked"),
            hint: listening
                ? tPlacement(LEVEL_DESCRIPTION_KEYS[listening])
                : t("profile.skills.listeningHint"),
        },
    ];

    return (
        <section
            aria-labelledby="profile-skills-title"
            className="rounded-2xl bg-[#111113] p-4 md:p-5"
        >
            <h2
                id="profile-skills-title"
                className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80"
            >
                <TrendingUp
                    className="size-4 text-[#f0f0f5]/60"
                    strokeWidth={1.5}
                    aria-hidden="true"
                />
                {t("profile.skills.title")}
            </h2>

            <dl className="mt-4 flex flex-col">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="border-b border-white/5 py-3 first:pt-0 last:border-b-0 last:pb-0"
                    >
                        <dt className="flex items-baseline justify-between gap-4 text-sm text-[#f0f0f5]/60">
                            {row.label}
                            <span className="text-base font-semibold tabular-nums text-[#f0f0f5]">
                                {row.value}
                            </span>
                        </dt>
                        <dd className="mt-1 text-xs leading-[1.6] text-[#f0f0f5]/40">{row.hint}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
