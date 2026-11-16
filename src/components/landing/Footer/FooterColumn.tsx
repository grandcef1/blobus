// src/components/landing/Footer/FooterColumn.tsx
// ARCHITECT: Усилена типографика — треккинг заголовков, чёткая иерархия.
// ARCHITECT: заголовок колонки приходит ключом словаря: тексты футера живут только в src/locales.

import { useTranslation } from 'react-i18next';
import type { FooterColumnItem } from './Footer.types';
import { FooterLink } from './FooterLink';

interface FooterColumnProps {
    readonly column: FooterColumnItem;
}

export function FooterColumn({ column }: FooterColumnProps) {
    const { t } = useTranslation('footer');
    const { titleKey, links } = column;
    const title = t(titleKey);

    return (
        <nav aria-label={title} className="flex flex-col gap-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600">
                {title}
            </h3>
            <ul className="flex flex-col gap-3">
                {links.map((link) => (
                    <li key={`${titleKey}-${link.href}`}>
                        <FooterLink link={link} />
                    </li>
                ))}
            </ul>
        </nav>
    );
}
