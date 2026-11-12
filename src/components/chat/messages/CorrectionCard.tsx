// ARCHITECT: карточка правки в ленте чата — блобатар и имя репетитора, его реплика (если она есть)
// и общий CorrectionView. Раньше это была цветная плашка с бейджем severity и зачёркнутым целым
// предложением; теперь цвет остался только на изменённых словах.

import type { EnhancedChatSession, EnhancedMessage, GrammarCorrection } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { CorrectionView } from "@/components/shared/CorrectionView";
import { MessageBubble } from "./MessageBubble";

interface CorrectionCardProps {
    message: EnhancedMessage;
    correction?: GrammarCorrection;
    session: EnhancedChatSession;
}

const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";
const REPLY_BUBBLE =
    "mb-2 max-w-[min(85%,70ch)] rounded-2xl rounded-tl-md bg-[#111113] px-4 py-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base";

export function CorrectionCard({ message, correction, session }: CorrectionCardProps) {
    const repetitor = getBlobatarById(session.repetitorId);

    if (!correction) {
        return <MessageBubble message={message} session={session} />;
    }

    return (
        <div className="flex items-start gap-3">
            <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            <div className="min-w-0 flex-1">
                {repetitor && <p className={AUTHOR_NAME}>{repetitor.name}</p>}

                {message.content && (
                    <div className={REPLY_BUBBLE}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                )}

                <CorrectionView correction={correction} className="max-w-[min(85%,70ch)]" />
            </div>
        </div>
    );
}
