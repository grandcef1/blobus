// ARCHITECT: политика cookie. Разделы неоднородны (в «функциональные» встроена таблица хранилища, в
// «как управлять» — кнопка), поэтому они собраны явно, а не списком id: так видно, где что стоит.
// ARCHITECT: отзыв согласия живёт на этой странице, потому что обещание «отозвать так же просто, как
// дать» должно иметь место, где это делается.

import { useTranslation } from "react-i18next";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { CookieStorageTable } from "@/components/legal/CookieStorageTable";
import { LEGAL_PILL } from "@/components/legal/legal.styles";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import { useConsentStore } from "@/store/consent";

function ConsentResetButton() {
    const { t } = useTranslation("legal");
    const resetDecision = useConsentStore((state) => state.resetDecision);

    const handleReset = (): void => {
        resetDecision();
        // ARCHITECT: тост подтверждает действие и объясняет, что баннер вернётся: без него кнопка
        // выглядела бы как «ничего не произошло».
        toast.info(t("legal.cookies.reset.toastTitle"), t("legal.cookies.reset.toastDescription"));
    };

    return (
        <button type="button" onClick={handleReset} className={cn(LEGAL_PILL, "w-fit")}>
            {t("legal.cookies.reset.button")}
        </button>
    );
}

export function CookiesPage() {
    const { t } = useTranslation("legal");

    return (
        <LegalLayout
            title={t("legal.cookies.title")}
            intro={t("legal.cookies.intro")}
        >
            <LegalSection
                title={t("legal.cookies.sections.basics.title")}
                body={t("legal.cookies.sections.basics.body")}
            />

            <LegalSection
                title={t("legal.cookies.sections.necessary.title")}
                body={t("legal.cookies.sections.necessary.body")}
            >
                <CookieStorageTable />
            </LegalSection>

            <LegalSection
                title={t("legal.cookies.sections.optional.title")}
                body={t("legal.cookies.sections.optional.body")}
            />

            <LegalSection
                title={t("legal.cookies.sections.control.title")}
                body={t("legal.cookies.sections.control.body")}
            >
                <ConsentResetButton />
            </LegalSection>
        </LegalLayout>
    );
}
