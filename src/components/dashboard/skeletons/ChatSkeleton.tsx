// ARCHITECT: скелетон чата: шапка сессии, реплики репетитора и пользователя разной ширины и полоса
// ввода. Реплики прижаты к правому краю, как настоящие сообщения пользователя, поэтому после
// загрузки лента не переставляется.

import { Skeleton } from "@/components/ui/skeleton";

const BUBBLES = [
    { id: 0, side: "left", width: "w-64" },
    { id: 1, side: "right", width: "w-44" },
    { id: 2, side: "left", width: "w-72" },
    { id: 3, side: "right", width: "w-52" },
] as const;

export function ChatSkeleton() {
    return (
        <div
            className="flex h-[calc(100dvh-3.5rem)] flex-col bg-black md:h-dvh"
            aria-busy="true"
        >
            <div className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5 md:px-6">
                <Skeleton className="size-10 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <Skeleton className="size-8 shrink-0 rounded-full" />
            </div>

            <div className="flex-1 overflow-hidden px-3 py-6 md:px-6">
                <div className="mx-auto flex max-w-3xl flex-col gap-5">
                    {BUBBLES.map((bubble) => (
                        <div
                            key={bubble.id}
                            className={
                                bubble.side === "right"
                                    ? "flex justify-end"
                                    : "flex items-start gap-3"
                            }
                        >
                            {bubble.side === "left" && (
                                <Skeleton className="size-8 shrink-0 rounded-2xl" />
                            )}
                            <Skeleton className={`h-16 ${bubble.width} rounded-2xl`} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-white/5 px-3 py-3 md:px-6">
                <div className="mx-auto flex max-w-3xl items-center gap-2">
                    <Skeleton className="h-11 flex-1 rounded-2xl" />
                    <Skeleton className="size-11 shrink-0 rounded-full" />
                </div>
            </div>
        </div>
    );
}