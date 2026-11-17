// ARCHITECT: лента спроектирована на рост — новый пост = запись в ENTRIES + три ключа в словарях,
// разметку менять не нужно; дата через Intl по текущему языку, локальный парсинг защищает от сдвига суток.

import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ContentLayout } from "@/components/legal/ContentLayout";
import { breadcrumbForRoute } from "@/lib/structured-data";

// ARCHITECT: ключи — строковые литералы (проектный паттерн *_KEYS): t(entry.titleKey) типизируется,
// конкатенации ключей в рантайме нет. Дата — ISO без времени, часовой пояс добавляется при рендере.
const ENTRIES = [
    {
        id: "launch",
        date: "2026-11-18",
        tagKey: "changelog.launch.tag",
        titleKey: "changelog.launch.title",
        bodyKey: "changelog.launch.body",
    },
] as const;

export function ChangelogPage() {
    const { t, i18n } = useTranslation("common");
    const { pathname } = useLocation();

    // ARCHITECT: форматтер создаётся в рендере, поэтому смена языка сразу меняет порядок и название
    // месяца; суффикс T00:00:00 обязателен — без него ISO-дата читается как UTC и в отрицательных
    // часовых поясах уезжает на день назад.
    const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <ContentLayout
            title={t("changelog.title")}
            intro={t("changelog.subtitle")}
            jsonLd={breadcrumbForRoute(pathname)}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
            >
                {ENTRIES.map((entry) => (
                    // ARCHITECT: карточка поста — монохромная поверхность проекта, тег текстовый,
                    // а не цветная плашка: лента не должна выглядеть набором бейджей.
                    <article
                        key={entry.id}
                        className="rounded-2xl border border-white/5 bg-[#111113] p-6 sm:p-8"
                    >
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#f0f0f5]/60">
                            <span className="uppercase tracking-[0.2em]">{t(entry.tagKey)}</span>
                            <time dateTime={entry.date} className="tracking-[0.02em]">
                                {dateFormatter.format(new Date(`${entry.date}T00:00:00`))}
                            </time>
                        </div>
                        <h2 className="mt-4 text-xl font-normal tracking-tight text-[#f0f0f5] md:text-2xl">
                            {t(entry.titleKey)}
                        </h2>
                        <p className="mt-3 text-base leading-relaxed text-[#f0f0f5]/70">
                            {t(entry.bodyKey)}
                        </p>
                    </article>
                ))}
            </motion.div>
        </ContentLayout>
    );
}