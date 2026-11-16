// ARCHITECT: общая оболочка правовых документов. Заголовок, дата вступления, контакт и перекрёстные
// ссылки живут здесь, поэтому сами страницы содержат только текст и не могут разойтись по виду.
// ARCHITECT: дата форматируется через Intl по текущему языку i18n, а не строкой в словаре: порядок
// дня и месяца в ru/en/es разный, и «16.11.2026» в английском тексте читалось бы как опечатка.

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/shared/Seo";
import { LEGAL_PAGES, OPERATOR_CONTACT_EMAIL, legalEffectiveDate } from "@/lib/legal";
import { breadcrumbForRoute } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { LEGAL_INLINE_LINK, LEGAL_PILL, LEGAL_PILL_CURRENT } from "./legal.styles";

interface LegalLayoutProps {
    readonly title: string;
    readonly intro: string;
    readonly children: ReactNode;
}

export function LegalLayout({ title, intro, children }: LegalLayoutProps) {
    const { t, i18n } = useTranslation("legal");
    const { pathname } = useLocation();

    const effectiveDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(
        legalEffectiveDate()
    );

    return (
        <>
            {/* ARCHITECT: метаданные правовых документов ставит общая оболочка: title и description
                берутся из seo-routes.json по текущему пути, крошки — из structured-data. Страницы
                передают только текст, поэтому разойтись по заголовкам они не могут. */}
            <Seo path={pathname} jsonLd={breadcrumbForRoute(pathname)} />

            <main className="min-h-dvh w-full bg-black px-6 py-20 sm:px-8 sm:py-28">
            <article className="mx-auto w-full max-w-3xl">
                <Link to="/" className={cn(LEGAL_PILL, "text-xs")}>
                    {t("legal.layout.home")}
                </Link>

                <h1 className="mt-8 text-3xl font-normal tracking-tight text-[#f0f0f5] md:text-5xl">
                    {title}
                </h1>
                <p className="mt-5 text-base leading-relaxed text-[#f0f0f5]/60">{intro}</p>

                <p className="mt-4 text-sm text-[#f0f0f5]/40">
                    {t("legal.layout.effective", { date: effectiveDate })}
                </p>
                <p className="mt-1 text-sm text-[#f0f0f5]/40">
                    {t("legal.layout.contactLabel")}{" "}
                    <a href={`mailto:${OPERATOR_CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK}>
                        {OPERATOR_CONTACT_EMAIL}
                    </a>
                </p>

                <div className="mt-14 flex flex-col gap-12">{children}</div>

                {/* ARCHITECT: aria-current помечает открытый документ — перекрёстная навигация
                    остаётся одним списком, а не «меню без текущего пункта». */}
                <nav
                    aria-label={t("legal.layout.navLabel")}
                    className="mt-16 flex flex-wrap gap-3 border-t border-white/5 pt-8"
                >
                    {LEGAL_PAGES.map((page) => (
                        <Link
                            key={page.id}
                            to={page.path}
                            aria-current={pathname === page.path ? "page" : undefined}
                            className={cn(LEGAL_PILL, pathname === page.path && LEGAL_PILL_CURRENT)}
                        >
                            {t(page.labelKey)}
                        </Link>
                    ))}
                </nav>
            </article>
        </main>
        </>
    );
}
