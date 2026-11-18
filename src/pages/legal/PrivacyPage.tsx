// ARCHITECT: публичная политика конфиденциальности. Разделы идут из словаря по id, поэтому порядок
// текста задан здесь, а сам текст правится в src/locales — страница не может показать русский абзац
// в английском интерфейсе.
// ARCHITECT: имя оператора и адрес поддержки подставляются из src/lib/legal.ts: имена собственные и
// контакты не должны дублироваться по трём словарям.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { ProcessorsTable } from "@/components/legal/ProcessorsTable";
import { OPERATOR_CONTACT_EMAIL } from "@/lib/legal";
import { CONTENT_INLINE_LINK } from "@/lib/surfaces";

// ARCHITECT: массив объявлен as const, поэтому id остаются литералами и ключ t() проверяется типами —
// опечатка в имени раздела становится ошибкой сборки.
// ARCHITECT: transfer в списке нет — этот раздел отрисован явно ниже, вместе с остальными, у которых
// есть вложенный блок: иначе он выводился бы дважды.
const LEAD_SECTIONS = ["who", "what", "why", "basis", "ai", "storage"] as const;
// ARCHITECT: reports идёт первым в хвостовом блоке: он продолжает раздел про cookie и хранилище и
// объясняет, чем first-party отчёт отличается от сторонних сервисов.
const TAIL_SECTIONS = ["reports", "rights", "children", "retention", "changes"] as const;

export function PrivacyPage() {
    const { t } = useTranslation("legal");
    const { t: tCommon } = useTranslation("common");
    const vars = { operator: tCommon("legal.operator"), email: OPERATOR_CONTACT_EMAIL };

    return (
        <LegalLayout
            title={t("legal.privacy.title")}
            intro={t("legal.privacy.intro")}
        >
            {LEAD_SECTIONS.map((id) => (
                <LegalSection
                    key={id}
                    title={t(`legal.privacy.sections.${id}.title`)}
                    body={t(`legal.privacy.sections.${id}.body`, vars)}
                />
            ))}

            {/* ARCHITECT: таблица обработчиков стоит внутри своего раздела: состав получателей и
                объяснение «зачем» читаются как один блок, а не как приложение в конце страницы. */}
            <LegalSection
                title={t("legal.privacy.sections.processors.title")}
                body={t("legal.privacy.sections.processors.body")}
            >
                <ProcessorsTable />
            </LegalSection>

            <LegalSection
                title={t("legal.privacy.sections.transfer.title")}
                body={t("legal.privacy.sections.transfer.body", vars)}
            />

            <LegalSection
                title={t("legal.privacy.sections.cookies.title")}
                body={t("legal.privacy.sections.cookies.body", vars)}
            >
                <Link to="/cookies" className={CONTENT_INLINE_LINK}>
                    {t("legal.layout.nav.cookies")}
                </Link>
            </LegalSection>

            {TAIL_SECTIONS.map((id) => (
                <LegalSection
                    key={id}
                    title={t(`legal.privacy.sections.${id}.title`)}
                    body={t(`legal.privacy.sections.${id}.body`, vars)}
                />
            ))}
        </LegalLayout>
    );
}
