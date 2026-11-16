// ARCHITECT: /listening — отложенная проверка аудирования в интерфейсе мастера: та же оболочка и те
// же стеклянные блоки, но БЕЗ верхней полосы прогресса — это не шаг мастера, а дополнение к тесту.
// ARCHITECT: сводка здесь только про аудирование: грамматику и общий английский уже показал тест
// уровня, а повторять их в отложенном итоге незачем.
// ARCHITECT: экран живёт вне AppLayout: приходят на него из «Обзора» и из сводки теста, а
// возвращаются в «Обзор» — там карточка проверки после прохождения исчезает.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { saveListeningResult } from "@/api/placement";
import { Seo } from "@/components/shared/Seo";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ListeningTest } from "@/components/placement/ListeningTest";
import { ListeningResultSummary } from "@/components/placement/ListeningResultSummary";
import type { ListeningResult } from "@/types/placement";

export function ListeningFlow() {
    const navigate = useNavigate();
    const [result, setResult] = useState<ListeningResult | null>(null);

    const handleComplete = (next: ListeningResult) => {
        // ARCHITECT: уровень дозаписывается в сохранённый результат теста: ту же запись читает
        // карточка «Обзора», поэтому после проверки она исчезает.
        saveListeningResult(next.level);
        setResult(next);
    };

    return (
        <OnboardingShell showProgress={false}>
            {/* ARCHITECT: проверка аудирования — служебный экран вне приложения: noindex. */}
            <Seo indexable={false} title="Проверка аудирования" />
            <div className="mx-auto w-full max-w-xl px-6 py-16">
                {result === null ? (
                    <ListeningTest
                        context="standalone"
                        onComplete={handleComplete}
                        onExit={() => navigate(APP_HOME_PATH)}
                    />
                ) : (
                    <ListeningResultSummary
                        level={result.level}
                        correctCount={result.correctCount}
                        total={LISTENING_ITEMS.length}
                        onDone={() => navigate(APP_HOME_PATH)}
                    />
                )}
            </div>
        </OnboardingShell>
    );
}