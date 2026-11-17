// ARCHITECT: «О проекте» объясняет назначение продукта и не пересекается с /docs (руководство по
// использованию) и /help (частые вопросы) — это осознанное разделение контента.

import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ContentLayout } from "@/components/legal/ContentLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { breadcrumbForRoute } from "@/lib/structured-data";

export function AboutPage() {
    const { t } = useTranslation("common");
    const { pathname } = useLocation();

    return (
        <ContentLayout
            title={t("about.title")}
            intro={t("about.lead")}
            jsonLd={breadcrumbForRoute(pathname)}
        >
            {/* ARCHITECT: в ContactsPage motion нет, поэтому появление — простой fade без сдвигов:
                страница не «прыгает» и не спорит с типографикой документа. */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-12"
            >
                <LegalSection title={t("about.whyTitle")} body={t("about.whyBody")} />
                <LegalSection title={t("about.howTitle")} body={t("about.howBody")} />

                {/* ARCHITECT: завершающая заметка отделена тонкой линией и набрана мельче — это
                    ремарка об авторе, а не ещё один раздел документа. */}
                <section className="flex flex-col gap-4 border-t border-white/5 pt-8">
                    <p className="text-sm leading-relaxed text-[#f0f0f5]/70">{t("about.note")}</p>
                </section>
            </motion.div>
        </ContentLayout>
    );
}