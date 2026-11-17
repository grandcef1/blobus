    // src/components/landing/Footer/Footer.types.ts

    import type { LanguageCode } from "@/lib/i18n";

    // ARCHITECT: код языка берётся из i18n: список поддерживаемых языков не должен дублироваться —
    // иначе переключатель однажды предложит язык, которого нет в словарях.
    export type { LanguageCode };

    export interface FooterLinkItem {
    /** Бренд-имя соцсети: не переводится, служит ключом для иконки. */
    readonly label: string;
    readonly href: string;
    readonly external?: boolean;
    }

    // ARCHITECT: текст колонок хранится ключом словаря, а не строкой: строки живут в src/locales,
    // поэтому компонент не может показать русский текст в английском интерфейсе.
    export type FooterColumnTitleKey =
    | "columns.product.title"
    | "columns.resources.title"
    | "columns.company.title"
    | "columns.legal.title";

    export type FooterColumnLinkKey =
    | "columns.product.features"
    | "columns.product.howItWorks"
    | "columns.product.pricing"
    | "columns.product.faq"
    | "columns.resources.docs"
    | "columns.resources.api"
    | "columns.resources.changelog"
    | "columns.resources.status"
    | "columns.company.contacts"
    | "columns.company.blog"
    | "columns.company.about"
    | "columns.company.whatsNew"
    | "columns.resources.reportBug"
    | "columns.legal.privacy"
    | "columns.legal.terms"
    | "columns.legal.cookies"
    | "columns.legal.help"
    | "columns.legal.support";

    export interface FooterColumnLinkItem {
    readonly labelKey: FooterColumnLinkKey;
    readonly href: string;
    readonly external?: boolean;
    }

    export interface FooterColumnItem {
    readonly titleKey: FooterColumnTitleKey;
    readonly links: readonly FooterColumnLinkItem[];
    }

    // ARCHITECT: Порядок языков задан в src/lib/i18n.ts (SUPPORTED_LANGUAGES) — здесь только подписи.

    export interface LanguageOption {
    readonly code: LanguageCode;
    readonly label: string;
    // ARCHITECT: Двухбуквенный код языка вместо флага-эмодзи.
    // Флаги (а) не рендерятся на Windows и (б) кодируют страны, а не языки.
    readonly short: string;
    }

    // ARCHITECT: подписи рассылки — ключи словаря footer: их читают Footer и NewsletterForm,
    // а перевод живёт в src/locales.
    export interface FooterNewsletterCopy {
    readonly titleKey: "newsletter.title";
    readonly descriptionKey: "newsletter.description";
    readonly placeholderKey: "newsletter.placeholder";
    readonly buttonKey: "newsletter.button";
    readonly successKey: "newsletter.success";
    }