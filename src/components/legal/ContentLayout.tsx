// ARCHITECT: оболочка контентных страниц отделена от юридической надстройки, чтобы /about, /changelog и
// будущая /docs не наследовали дату вступления в силу и перекрёстные ссылки правовых документов;
// LegalLayout остаётся тонкой надстройкой над этим файлом.
// ARCHITECT: кнопка возврата берёт существующий ключ legal.layout.home: словари в этой задаче не
// правятся, а нейтрального ключа «на главную» в common нет.
// ARCHITECT: children рендерятся без обёртки — страница сама задаёт ритм секций, а правовая мета
// остаётся прямой дочерью article, как до выноса (порядок и вложенность не меняются).

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components/shared/Seo";
import { cn } from "@/lib/utils";
import { CONTENT_PILL } from "@/lib/surfaces";

interface ContentLayoutProps {
    readonly title: string;
    readonly intro?: string;
    readonly jsonLd?: object;
    readonly children: ReactNode;
}

export function ContentLayout({ title, intro, jsonLd, children }: ContentLayoutProps) {
    const { t } = useTranslation("legal");
    const { pathname } = useLocation();

    return (
        <>
            <Seo path={pathname} jsonLd={jsonLd} />

            <main id="main" tabIndex={-1} className="min-h-dvh w-full bg-black px-6 py-20 sm:px-8 sm:py-28">
                <article className="mx-auto w-full max-w-3xl">
                    <Link to="/" className={cn(CONTENT_PILL, "text-xs")}>
                        {t("legal.layout.home")}
                    </Link>

                    <h1 className="mt-8 text-3xl font-normal tracking-tight text-[#f0f0f5] md:text-5xl">
                        {title}
                    </h1>
                    {intro !== undefined && (
                        <p className="mt-5 text-base leading-relaxed text-[#f0f0f5]/60">{intro}</p>
                    )}

                    {children}
                </article>
            </main>
        </>
    );
}