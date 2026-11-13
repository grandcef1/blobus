// ARCHITECT: аудирование ищут в «Обзоре»: тест уровня предлагает его как опцию, поэтому после теста
// подсказка живёт на стартовой странице приложения. Карточка исчезает, как только уровень получен:
// результат читается из хранилища при каждом рендере, а «Обзор» после проверки монтируется заново.
// ARCHITECT: проверка открывается отдельным экраном /app/listening, а не диалогом: у экрана есть
// адрес, и в него возвращаются из истории браузера.

import { Link } from "react-router-dom";
import { Volume2 } from "lucide-react";
import { getResult } from "@/api/placement";
import { FOCUS_RING, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

export function ListeningPromptCard() {
    if (getResult()?.listening) return null;

    return (
        <section
            aria-labelledby="listening-prompt-title"
            className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
        >
            <div className="min-w-0">
                <h2
                    id="listening-prompt-title"
                    className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80"
                >
                    <Volume2 className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                    Аудирование не проверено
                </h2>
                <p className="mt-1 text-sm leading-[1.6] text-[#f0f0f5]/50">
                    Шесть коротких заданий на понимание на слух. Два прослушивания на задание.
                </p>
            </div>

            <Link to="/app/listening" className={cn(PRIMARY_BUTTON, FOCUS_RING, "shrink-0")}>
                Проверить
            </Link>
        </section>
    );
}