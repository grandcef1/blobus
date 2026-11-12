// ARCHITECT: ядро центра помощи. Одна страница обслуживает публичный /help и раздел /app/help,
// поэтому вся логика — обзор, тред и создание обращения — живёт здесь, а страницы остаются
// тонкими обёртками. Аноним видит FAQ и предложение войти; обращения — только авторизованным.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { getTicketById, getTickets } from "@/api/support";
import { useAuthStore } from "@/store/auth";
import { FOCUS_RING, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { HelpFaqList } from "./HelpFaqList";
import { TicketList } from "./TicketList";
import { TicketThread } from "./TicketThread";
import { NewTicketDialog } from "./NewTicketDialog";

export function HelpCenter() {
    const user = useAuthStore((state) => state.user);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

    const selectedTicket = selectedTicketId ? getTicketById(selectedTicketId) : undefined;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Центр помощи</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">
                        Ответы на частые вопросы и связь с поддержкой
                    </p>
                </div>

                {user && (
                    <button
                        type="button"
                        onClick={() => setIsNewTicketOpen(true)}
                        className={cn(PRIMARY_BUTTON, FOCUS_RING)}
                    >
                        <Plus className="size-4" aria-hidden="true" />
                        Новое обращение
                    </button>
                )}
            </header>

            {selectedTicket ? (
                <div className="mx-auto w-full max-w-3xl">
                    <button
                        type="button"
                        onClick={() => setSelectedTicketId(null)}
                        className={cn(
                            "mb-4 flex min-h-11 items-center gap-2 text-sm text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]",
                            FOCUS_RING
                        )}
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        К обращениям
                    </button>

                    {/* ARCHITECT: key по id — при переходе между тредами состояние ленты не переносится */}
                    <TicketThread key={selectedTicket.id} ticket={selectedTicket} />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                    <HelpFaqList />

                    {user ? (
                        <TicketList
                            tickets={getTickets()}
                            onSelect={(ticketId) => setSelectedTicketId(ticketId)}
                        />
                    ) : (
                        <section className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5">
                            <p className="text-sm text-[#f0f0f5]/60">
                                Войдите, чтобы видеть обращения и писать в поддержку
                            </p>
                            <Link to="/login" className={cn(PRIMARY_BUTTON, FOCUS_RING, "mt-4")}>
                                Войти
                            </Link>
                        </section>
                    )}
                </div>
            )}

            <NewTicketDialog
                open={isNewTicketOpen}
                onOpenChange={setIsNewTicketOpen}
                onCreated={(ticketId) => setSelectedTicketId(ticketId)}
            />
        </div>
    );
}
