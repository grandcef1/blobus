// ARCHITECT: навыки вместо одного уровня: тест измеряет несколько дорожек, и профиль показывает
// ровно то, что измерено. Пока теста нет, значения берутся из текущего уровня профиля, а
// аудирование честно остаётся «не проверено» — так понятно, что его можно пройти.

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { getResult } from "@/api/placement";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { LEVEL_DESCRIPTIONS } from "@/lib/placement";
import type { PlacementResult } from "@/types/placement";

interface SkillRow {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly hint: string;
}

export function ProfileSkillsCard() {
    const [result] = useState<PlacementResult | null>(() => getResult());
    const level = MOCK_USER_PROGRESS.currentLevel;
    const overall = result?.overall ?? level;
    const listening = result?.listening ?? null;

    const rows: readonly SkillRow[] = [
        { id: "overall", label: "Общий", value: overall, hint: LEVEL_DESCRIPTIONS[overall] },
        {
            id: "grammar",
            label: "Грамматика",
            value: result?.grammar ?? level,
            hint: LEVEL_DESCRIPTIONS[result?.grammar ?? level],
        },
        {
            id: "speaking",
            label: "Разговорная практика",
            value: result?.speaking ?? level,
            hint: LEVEL_DESCRIPTIONS[result?.speaking ?? level],
        },
        {
            id: "listening",
            label: "Аудирование",
            value: listening ?? "не проверено",
            hint: listening
                ? LEVEL_DESCRIPTIONS[listening]
                : "Проверка на понимание на слух — карточка в «Обзоре».",
        },
    ];

    return (
        <section aria-labelledby="profile-skills-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <h2
                id="profile-skills-title"
                className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80"
            >
                <TrendingUp className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                Уровень по навыкам
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