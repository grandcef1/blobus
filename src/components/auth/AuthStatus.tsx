// ARCHITECT: статусный экран — один вид на восемь состояний (письмо отправлено, ссылка истекла, почта
// подтверждена и т.д.). Собирать его в каждой форме заново значило бы развести вид и доступность:
// role="status" + aria-live обязаны стоять одинаково, иначе часть состояний остаётся беззвучной.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TITLE } from "./auth.styles";

interface AuthStatusProps {
    readonly title: string;
    readonly body: string;
    readonly hint?: string;
    readonly icon?: ReactNode;
    readonly children?: ReactNode;
}

export function AuthStatus({ title, body, hint, icon, children }: AuthStatusProps) {
    return (
        <div className="flex flex-col gap-5">
            {/* ARCHITECT: live-регион охватывает только текст: кнопки внутри role="status"
                переобъявлялись бы скринридером при каждом изменении состояния. */}
            <div role="status" aria-live="polite" className="flex flex-col gap-2">
                <p className={cn(AUTH_STATUS_TITLE, "flex items-center gap-2")}>
                    {icon}
                    {title}
                </p>
                <p className="text-sm leading-relaxed text-[#f0f0f5]/60">{body}</p>
                {hint && <p className="text-xs leading-relaxed text-[#f0f0f5]/40">{hint}</p>}
            </div>
            {children}
        </div>
    );
}
