    // src/components/landing/Footer/Footer.data.ts
    // ARCHITECT: Контент на русском (текущая версия сайта).
    // При подключении i18n (react-i18next) строки уйдут в словари ru/en/es.

    import type { FooterDataShape, LanguageOption } from './Footer.types';

    export const FOOTER_DATA: FooterDataShape = {
    columns: [
        {
        title: 'Продукт',
        links: [
            { label: 'Возможности', href: '#features' },
            { label: 'Как это работает', href: '#how-it-works' },
            { label: 'Тарифы', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
        ],
        },
        {
        title: 'Ресурсы',
        links: [
            { label: 'Документация', href: '/docs' },
            { label: 'API', href: '/api-docs' },
            { label: 'Обновления', href: '/changelog' },
            { label: 'Статус', href: '/status' },
        ],
        },
        {
        title: 'Компания',
        links: [
            { label: 'О нас', href: '/about' },
            { label: 'Контакты', href: '/contacts' },
            { label: 'Блог', href: '/blog' },
            { label: 'Карьера', href: '/careers' },
        ],
        },
        {
        title: 'Право и поддержка',
        links: [
            { label: 'Конфиденциальность', href: '/privacy' },
            { label: 'Условия использования', href: '/terms' },
            { label: 'Файлы cookie', href: '/cookies' },
            { label: 'Центр помощи', href: '/help' },
            { label: 'Поддержка', href: 'mailto:support@blobus.ai', external: true },
        ],
        },
    ],
    social: [
        { label: 'Twitter', href: 'https://twitter.com/blobus_ai', external: true },
        { label: 'LinkedIn', href: 'https://linkedin.com/company/blobus', external: true },
        { label: 'GitHub', href: 'https://github.com/grandcef1/blobus', external: true },
        { label: 'Discord', href: 'https://discord.gg/blobus', external: true },
    ],
    copyright: '© 2026 Blobus. Все права защищены.',
    newsletter: {
        title: 'Будьте в курсе',
        description: 'Новости о функциях и новых релизах — без спама.',
        placeholder: 'Ваш email',
        buttonLabel: 'Подписаться',
        successLabel: 'Готово!',
    },
    };

    // ARCHITECT: Коды языков (RU/EN/ES) вместо флагов: рендерятся одинаково
    // на всех ОС и семантически честны (EN = English, а не "Великобритания").
    export const LANGUAGES: readonly LanguageOption[] = [
    { code: 'ru', label: 'Русский', short: 'ru' },
    { code: 'en', label: 'English', short: 'en' },
    { code: 'es', label: 'Español', short: 'es' },
    ] as const;