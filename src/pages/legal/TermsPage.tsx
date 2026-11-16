// ARCHITECT: условия использования. Все разделы однородны (заголовок + абзацы), поэтому страница
// собирается из списка id: текст живёт в словаре, порядок — здесь, дублирования ключей нет.

import { useTranslation } from "react-i18next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { OPERATOR_CONTACT_EMAIL } from "@/lib/legal";

const SECTIONS = [
    "service",
    "ai",
    "account",
    "forbidden",
    "content",
    "payment",
    "termination",
    "liability",
    "law",
    "changes",
    "contact",
] as const;

export function TermsPage() {
    const { t } = useTranslation("legal");
    const vars = { email: OPERATOR_CONTACT_EMAIL };

    return (
        <LegalLayout
            title={t("legal.terms.title")}
            intro={t("legal.terms.intro")}
        >
            {SECTIONS.map((id) => (
                <LegalSection
                    key={id}
                    title={t(`legal.terms.sections.${id}.title`)}
                    body={t(`legal.terms.sections.${id}.body`, vars)}
                />
            ))}
        </LegalLayout>
    );
}
