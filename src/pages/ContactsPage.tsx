// ARCHITECT: контактная страница — публичный экран без авторизации. Тексты лежат в common.json,
// адрес поддержки — в src/lib/legal.ts: почта не дублируется по трём словарям.
// ARCHITECT: оболочка та же, что у правовых документов, поэтому заголовок, дата и перекрёстная
// навигация не расходятся по виду между /contacts и /privacy.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { LEGAL_INLINE_LINK } from "@/components/legal/legal.styles";
import { OPERATOR_CONTACT_EMAIL } from "@/lib/legal";

export function ContactsPage() {
    const { t } = useTranslation("common");

    return (
        <LegalLayout title={t("contacts.title")} intro={t("contacts.lead")}>
            <LegalSection title={t("contacts.emailLabel")} body={t("contacts.emailHint")}>
                <a href={`mailto:${OPERATOR_CONTACT_EMAIL}`} className={LEGAL_INLINE_LINK}>
                    {OPERATOR_CONTACT_EMAIL}
                </a>
            </LegalSection>

            <LegalSection title={t("contacts.help.title")} body={t("contacts.help.body")}>
                <Link to="/help" className={LEGAL_INLINE_LINK}>
                    {t("contacts.help.link")}
                </Link>
            </LegalSection>

            <LegalSection title={t("contacts.privacy.title")} body={t("contacts.privacy.body")}>
                <Link to="/privacy" className={LEGAL_INLINE_LINK}>
                    {t("contacts.privacy.link")}
                </Link>
            </LegalSection>
        </LegalLayout>
    );
}
