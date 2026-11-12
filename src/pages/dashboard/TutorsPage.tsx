// ARCHITECT: «Репетиторы» — страница со всеми персонажами: раскладка и стиль как у остальных
// рабочих экранов, тексты берутся из persona, поэтому своего описания страница не заводит.
// ARCHITECT: одна колонка на телефоне, три на широком экране: сравнение репетиторов идёт глазами,
// поэтому карточки не должны уезжать за горизонтальный скролл.

import { motion } from "framer-motion";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { TutorCard } from "@/components/dashboard/TutorCard";

export function TutorsPage() {
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
                    {MOCK_BLOBATARS.map((blobatar) => (
                        <TutorCard key={blobatar.id} blobatar={blobatar} />
                    ))}
                </div>
            </div>
        </div>
    );
}