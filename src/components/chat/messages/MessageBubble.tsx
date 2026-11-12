// ARCHITECT: Пузырёк сообщения — у сообщений бота блобатар слева и имя.
// ARCHITECT: ширина строки ограничена и долей пузыря, и мерой читаемости 70ch: на широком экране
// процент не срабатывает, и текст разъезжается на всю ленту. Контраст смягчён: тело сообщения —
// white/90 на #111113 / #141416, цветных бордеров нет.

import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    message: EnhancedMessage;
    session: EnhancedChatSession;
}

const BODY_TEXT = "text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base";
const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";

export function MessageBubble({ message, session }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const repetitor = getBlobatarById(session.repetitorId);

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div
                    className={cn(
                        "max-w-[min(80%,70ch)] rounded-2xl rounded-tr-md bg-[#141416] px-4 py-3",
                        BODY_TEXT
                    )}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            <div className="min-w-0 flex-1">
                {repetitor && <p className={AUTHOR_NAME}>{repetitor.name}</p>}
                <div
                    className={cn(
                        "max-w-[min(85%,70ch)] rounded-2xl rounded-tl-md bg-[#111113] px-4 py-3",
                        BODY_TEXT
                    )}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        </div>
    );
}