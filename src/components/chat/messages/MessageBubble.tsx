// ARCHITECT: Пузырёк сообщения — у сообщений бота блобатар слева и имя.
// Контраст смягчён: пользовательские сообщения — bg-[#141416], не белые.

import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
    message: EnhancedMessage;
    session: EnhancedChatSession;
}

export function MessageBubble({ message, session }: MessageBubbleProps) {
    const isUser = message.role === "user";
    const repetitor = getBlobatarById(session.repetitorId);

    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-[#141416] px-4 py-3 text-sm leading-relaxed text-[#f0f0f5] md:max-w-[70%]">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            <div className="min-w-0 flex-1">
                {repetitor && (
                    <p className="mb-1 text-xs font-medium text-[#f0f0f5]/50">
                        {repetitor.name}
                    </p>
                )}
                <div
                    className={cn(
                        "max-w-full rounded-2xl rounded-tl-md bg-[#111113] px-4 py-3 text-sm leading-relaxed text-[#f0f0f5]/85",
                        "md:max-w-[85%]"
                    )}
                >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            </div>
        </div>
    );
}