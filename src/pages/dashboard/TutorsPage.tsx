// ARCHITECT: «Репетиторы» — страница со всеми персонажами: раскладка и стиль как у остальных
// рабочих экранов, тексты берутся из persona, поэтому своего описания страница не заводит.
// ARCHITECT: ростер приходит через useMockQuery — скелетон закрывает сетку, пока список в пути.
// ARCHITECT: одна колонка на телефоне, три на широком экране: сравнение репетиторов идёт глазами,
// поэтому карточки не должны уезжать за горизонтальный скролл.

import { motion } from "framer-motion";
import { fetchTutors } from "@/api/tutors";
import { useMockQuery } from "@/hooks/useMockQuery";
import { TutorCard } from "@/components/dashboard/TutorCard";
import { TutorsSkeleton } from "@/components/dashboard/skeletons/TutorsSkeleton";

export function TutorsPage() {
    const { data: tutors, isLoading } = useMockQuery(fetchTutors);

    if (isLoading || tutors === null) return <TutorsSkeleton />;

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Наши репетиторы</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">
                        Характер и стиль каждого — выберите подходящего
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tutors.map((blobatar) => (
                        <TutorCard key={blobatar.id} blobatar={blobatar} />
                    ))}
                </div>
            </div>
        </div>
    );
}