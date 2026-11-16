// src/components/landing/Footer/Footer.data.ts
// ARCHITECT: структура футера (адреса, состав колонок) отделена от текста: подписи лежат ключами в
// src/locales/{ru,en,es}/footer.json. Языки и соцсети остаются данными — их имена не переводятся.

import type {
    FooterColumnItem,
    FooterLinkItem,
    FooterNewsletterCopy,
    LanguageOption,
} from './Footer.types';

export const FOOTER_COLUMNS: readonly FooterColumnItem[] = [
    {
        titleKey: 'columns.product.title',
        links: [
            { labelKey: 'columns.product.features', href: '#features' },
            { labelKey: 'columns.product.howItWorks', href: '#how-it-works' },
            { labelKey: 'columns.product.pricing', href: '#pricing' },
            { labelKey: 'columns.product.faq', href: '#faq' },
        ],
    },
    {
        titleKey: 'columns.resources.title',
        links: [{ labelKey: 'columns.resources.docs', href: '/docs' }],
    },
    {
        titleKey: 'columns.company.title',
        links: [{ labelKey: 'columns.company.contacts', href: '/contacts' }],
    },
    {
        titleKey: 'columns.legal.title',
        links: [
            { labelKey: 'columns.legal.privacy', href: '/privacy' },
            { labelKey: 'columns.legal.terms', href: '/terms' },
            { labelKey: 'columns.legal.cookies', href: '/cookies' },
            { labelKey: 'columns.legal.help', href: '/help' },
            { labelKey: 'columns.legal.support', href: 'mailto:blobus.support@gmail.com', external: true },
        ],
    },
];

export const FOOTER_SOCIAL: readonly FooterLinkItem[] = [
    { label: 'GitHub', href: 'https://github.com/grandcef1/blobus', external: true },
];

// ARCHITECT: подписи рассылки — ключи: их читают Footer и NewsletterForm, а перевод живёт в словаре.
export const FOOTER_NEWSLETTER: FooterNewsletterCopy = {
    titleKey: 'newsletter.title',
    descriptionKey: 'newsletter.description',
    placeholderKey: 'newsletter.placeholder',
    buttonKey: 'newsletter.button',
    successKey: 'newsletter.success',
};

// ARCHITECT: Коды языков (RU/EN/ES) вместо флагов: рендерятся одинаково
// на всех ОС и семантически честны (EN = English, а не "Великобритания").
// ARCHITECT: название языка пишется на нём самом — так его узнаёт носитель, даже если интерфейс
// сейчас на другом языке.
export const LANGUAGES: readonly LanguageOption[] = [
    { code: 'ru', label: 'Русский', short: 'ru' },
    { code: 'en', label: 'English', short: 'en' },
    { code: 'es', label: 'Español', short: 'es' },
];
