// src/components/landing/Footer/Footer.data.ts
// ARCHITECT: структура футера (адреса, состав колонок) отделена от текста: подписи лежат ключами в
// src/locales/{ru,en,es}/footer.json. Языки и соцсети остаются данными — их имена не переводятся.

import type {
    FooterColumnItem,
    FooterLinkItem,
    FooterNewsletterCopy,
    LanguageOption,
} from './Footer.types';

// ARCHITECT: колонки уравнены по три ссылки (3/3/3/3), все адресаты реальные и уникальные; FAQ убран,
// потому что он внутри Центра помощи; mailto убран, потому что почта живёт на /contacts; auth-ссылок
// нет, чтобы колонка не схлопывалась при входе пользователя.
export const FOOTER_COLUMNS: readonly FooterColumnItem[] = [
    {
        titleKey: 'columns.product.title',
        links: [
            { labelKey: 'columns.product.features', href: '#features' },
            { labelKey: 'columns.product.howItWorks', href: '#how-it-works' },
            { labelKey: 'columns.product.pricing', href: '#pricing' },
        ],
    },
    {
        titleKey: 'columns.resources.title',
        links: [
            { labelKey: 'columns.resources.docs', href: '/docs' },
            { labelKey: 'columns.legal.help', href: '/help' },
            {
                labelKey: 'columns.resources.reportBug',
                href: 'https://github.com/grandcef1/blobus/issues',
                external: true,
            },
        ],
    },
    {
        titleKey: 'columns.company.title',
        links: [
            { labelKey: 'columns.company.about', href: '/about' },
            { labelKey: 'columns.company.whatsNew', href: '/changelog' },
            { labelKey: 'columns.company.contacts', href: '/contacts' },
        ],
    },
    {
        titleKey: 'columns.legal.title',
        links: [
            { labelKey: 'columns.legal.privacy', href: '/privacy' },
            { labelKey: 'columns.legal.terms', href: '/terms' },
            { labelKey: 'columns.legal.cookies', href: '/cookies' },
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
