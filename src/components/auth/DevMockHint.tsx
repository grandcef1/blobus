// ARCHITECT: панель разработки со ссылками, которые в проде приходят письмом. Существует только в
// dev-сборке (import.meta.env.DEV): без неё цепочку сброса и подтверждения нельзя пройти руками —
// писем нет, а токены детерминированы. Токены намеренно не логируются в консоль.
// ARCHITECT: хук вызывается до проверки DEV: условный return выше хуков ломал бы порядок вызовов.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AUTH_TEXT_LINK } from "./auth.styles";

const MOCK_LINKS = [
    { href: "/reset-password?token=mock-valid", labelKey: "dev.resetValid" },
    { href: "/reset-password?token=mock-expired", labelKey: "dev.resetExpired" },
    { href: "/verify-email?token=mock-valid", labelKey: "dev.verifyValid" },
    { href: "/verify-email?token=mock-expired", labelKey: "dev.verifyExpired" },
] as const;

export function DevMockHint() {
    const { t } = useTranslation("auth");

    if (!import.meta.env.DEV) return null;

    return (
        <aside className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4">
            <p className="text-xs text-[#f0f0f5]/50">{t("dev.title")}</p>
            <ul className="mt-2 flex flex-wrap gap-x-5">
                {MOCK_LINKS.map((link) => (
                    <li key={link.href}>
                        <Link
                            to={link.href}
                            className={cn(AUTH_TEXT_LINK, "text-xs text-[#f0f0f5]/70")}
                        >
                            {t(link.labelKey)}
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
