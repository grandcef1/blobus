// ARCHITECT: оглавление обязательно из-за длины страницы (7 разделов, ~35 подразделов);
// якоря нативные, чтобы не конфликтовать со сбросом скролла роутера.
// ARCHITECT: текст целиком из неймспейса docs: ключи в DOCS_SECTIONS идут без префикса, резолв делает
// useTranslation("docs"); локаль изменяется переключателем в шапке и футере, страница не дублирует тексты.

import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ContentLayout } from "@/components/legal/ContentLayout";
import { CONTENT_INLINE_LINK } from "@/lib/surfaces";
import { breadcrumbForRoute } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { DOCS_SECTIONS } from "./docs/docsSections";

export function DocsPage() {
    const { t } = useTranslation("docs");
    const { pathname } = useLocation();

    return (
        <ContentLayout
            title={t("pageTitle")}
            intro={t("pageIntro")}
            jsonLd={breadcrumbForRoute(pathname)}
        >
            <nav
                aria-label={t("tocLabel")}
                className="mt-10 rounded-2xl border border-white/5 bg-[#111113] p-6 sm:p-8"
            >
                <ol className="flex flex-col gap-2 text-sm text-[#f0f0f5]/60">
                    {DOCS_SECTIONS.map((section, index) => (
                        <li key={section.id} className="flex items-baseline gap-3">
                            {/* ARCHITECT: номер генерируется из индекса и не переводится — это порядок, а не текст. */}
                            <span className="tabular-nums text-[#f0f0f5]/60" aria-hidden="true">
                                {index + 1}
                            </span>
                            <a
                                href={`#${section.id}`}
                                className="rounded-sm transition-colors hover:text-[#f0f0f5]"
                            >
                                {t(section.titleKey)}
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            <div className="mt-12 flex flex-col gap-12">
                {DOCS_SECTIONS.map((section) => (
                    <section key={section.id} id={section.id} className="scroll-mt-8">
                        <h2 className="text-xl font-normal tracking-tight text-[#f0f0f5] md:text-2xl">
                            {t(section.titleKey)}
                        </h2>
                        <p className="mt-3 text-base leading-relaxed text-[#f0f0f5]/70">
                            {t(section.introKey)}
                        </p>

                        <div className="mt-6 flex flex-col gap-5">
                            {section.items.map((item) => (
                                <div key={item.titleKey}>
                                    <h3 className="text-base font-medium text-[#f0f0f5]">
                                        {t(item.titleKey)}
                                    </h3>
                                    <p className="mt-2 text-base leading-relaxed text-[#f0f0f5]/70">
                                        {t(item.bodyKey)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* ARCHITECT: helpLink есть только у трёх разделов, поэтому поле проверяется через in —
                            без этого typecheck не сузит union из as const. inline-block нужен из-за mt-6:
                            у CONTENT_INLINE_LINK нет display-класса, и отступ на inline-ссылке не работает. */}
                        {"helpLinkKey" in section && (
                            <Link to="/help" className={cn(CONTENT_INLINE_LINK, "mt-6 inline-block")}>
                                {t(section.helpLinkKey)}
                            </Link>
                        )}
                    </section>
                ))}
            </div>
        </ContentLayout>
    );
}