// ARCHITECT: юридическая специфика (дата вступления, почта оператора, перекрёстные ссылки) осталась здесь,
// общая оболочка вынесена в ContentLayout.
// ARCHITECT: дата форматируется через Intl по текущему языку i18n, а не строкой в словаре: порядок
// дня и месяца в ru/en/es разный, и «16.11.2026» в английском тексте читалось бы как опечатка.
// ARCHITECT: всё юридическое передаётся в children одним фрагментом: React не создаёт узел под fragment,
// поэтому DOM правовых страниц остаётся прежним (мета — прямые дети article, навигация — после секций).

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ContentLayout } from "./ContentLayout";
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
        <ContentLayout title={title} intro={intro} jsonLd={breadcrumbForRoute(pathname)}>
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
        </ContentLayout>
    );
}
