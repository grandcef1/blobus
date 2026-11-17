// src/components/landing/Footer/SocialLinks.tsx
// ARCHITECT: Монохромные соцсети. Серый → белый на hover. Без цветных акцентов.

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import type { FooterLinkItem } from './Footer.types';
import {
    XIcon,
    LinkedInIcon,
    GitHubIcon,
    DiscordIcon,
    TelegramIcon,
    InstagramIcon,
} from './BrandIcons';

interface SocialLinksProps {
    readonly links: readonly FooterLinkItem[];
}

type BrandIconComponent = ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, BrandIconComponent> = {
    Twitter: XIcon,
    LinkedIn: LinkedInIcon,
    GitHub: GitHubIcon,
    Discord: DiscordIcon,
};

// ARCHITECT: макеты не ссылки, потому что аккаунтов ещё нет, а мёртвые ссылки запрещены;
// они не фокусируемы и помечены aria-disabled — при появлении URL переезжают в Footer.data.
const SOCIAL_PLACEHOLDERS: readonly {
    readonly id: string;
    readonly label: string;
    readonly Icon: BrandIconComponent;
}[] = [
    { id: 'telegram', label: 'Telegram', Icon: TelegramIcon },
    { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
];

export function SocialLinks({ links }: SocialLinksProps) {
    const { t } = useTranslation('footer');

    return (
        <div className="flex items-center gap-2">
            {links.map((link) => {
                const Icon = ICON_MAP[link.label];
                if (!Icon) return null;

                return (
                    <motion.a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors duration-200 hover:bg-zinc-900 hover:text-white"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        <Icon className="h-4 w-4" />
                    </motion.a>
                );
            })}

            {SOCIAL_PLACEHOLDERS.map(({ id, label, Icon }) => (
                <span
                    key={id}
                    role="img"
                    aria-label={label}
                    aria-disabled="true"
                    title={t('social.comingSoon')}
                    className="flex h-9 w-9 cursor-default items-center justify-center rounded-full text-zinc-500 opacity-40"
                >
                    <Icon className="h-4 w-4" />
                </span>
            ))}
        </div>
    );
}