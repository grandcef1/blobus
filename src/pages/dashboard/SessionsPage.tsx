// ARCHITECT: раздел «Сессии» — вход к любой остановленной теме. Поиск и фильтры не добавляю:
// их не просили, а список умещается на экране.
// ARCHITECT: список приходит через useMockQuery, поэтому скелетон показывается пока данные в пути,
// а не потому что страница подключена лениво.
// ARCHITECT: сетка одна колонка на телефоне и две с lg — карточка несёт четыре строки данных,
// в две колонки на планшете текст начал бы переноситься.

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchSessions } from "@/api/sessions";
import { useMockQuery } from "@/hooks/useMockQuery";
import { SessionsSkeleton } from "@/components/dashboard/skeletons/SessionsSkeleton";
import { FOCUS_RING, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { SessionCard } from "./SessionCard";

export function SessionsPage() {
    const { data: sessions, isLoading } = useMockQuery(fetchSessions);

    if (isLoading || sessions === null) return <SessionsSkeleton />;

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Сессии</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">Диалоги с репетитором, свежие сверху</p>
                </motion.header>

                {sessions.length === 0 ? (
                    <div className="rounded-2xl bg-[#111113] p-4 md:p-5">
                        <p className="text-sm text-[#f0f0f5]/50">Пока нет ни одной сессии</p>
                        <Link to="/session/new" className={cn(PRIMARY_BUTTON, FOCUS_RING, "mt-4")}>
                            Новая сессия
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {sessions.map((session) => (
                            <SessionCard key={session.id} session={session} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
