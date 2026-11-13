// ARCHITECT: /app/listening — проверка аудирования отдельным экраном внутри приложения: у неё своя
// шапка и выход в «Обзор», а полосы прогресса мастера здесь нет — её рисует только OnboardingShell.
// ARCHITECT: задания читаются через useMockQuery, поэтому скелетон — настоящее состояние загрузки.
// Сохранение уровня живёт на экране: сам тест результата не записывает.

import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchListeningItems, saveListeningResult } from "@/api/placement";
import { useMockQuery } from "@/hooks/useMockQuery";
import { ListeningTest } from "@/components/placement/ListeningTest";
import { ListeningSkeleton } from "@/components/dashboard/skeletons/ListeningSkeleton";
import { toast } from "@/store/toast";
import type { ListeningResult } from "@/types/placement";

export function ListeningTestPage() {
    const navigate = useNavigate();
    const { data: items, isLoading } = useMockQuery(fetchListeningItems);

    const handleComplete = (result: ListeningResult) => {
        saveListeningResult(result.level);
        toast.success(`Уровень аудирования: ${result.level}`);
        navigate("/app/overview");
    };

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-2xl">
                <Link
                    to="/app/overview"
                    className="flex min-h-11 w-fit items-center gap-2 text-sm text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Обзор
                </Link>

                <h1 className="mt-2 text-xl font-semibold text-[#f0f0f5]">Проверка аудирования</h1>

                <div className="mt-5">
                    {isLoading || items === null ? (
                        <ListeningSkeleton />
                    ) : (
                        <ListeningTest
                            context="standalone"
                            onComplete={handleComplete}
                            onExit={() => navigate("/app/overview")}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}