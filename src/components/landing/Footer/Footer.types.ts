    // src/components/landing/Footer/Footer.types.ts

    export interface FooterLinkItem {
    readonly label: string;
    readonly href: string;
    readonly external?: boolean;
    }

    export interface FooterColumnItem {
    readonly title: string;
    readonly links: readonly FooterLinkItem[];
    }

    // ARCHITECT: Порядок языков: основной язык проекта первым.
    export type LanguageCode = 'ru' | 'en' | 'es';

    export interface LanguageOption {
    readonly code: LanguageCode;
    readonly label: string;
    // ARCHITECT: Двухбуквенный код языка вместо флага-эмодзи.
    // Флаги (а) не рендерятся на Windows и (б) кодируют страны, а не языки.
    readonly short: string;
    }

    export interface FooterDataShape {
    readonly columns: readonly FooterColumnItem[];
    readonly social: readonly FooterLinkItem[];
    readonly copyright: string;
    readonly newsletter: {
        readonly title: string;
        readonly description: string;
        readonly placeholder: string;
        readonly buttonLabel: string;
        readonly successLabel: string;
    };
    }