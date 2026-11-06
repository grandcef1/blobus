// src/components/landing/Footer/SocialLinks.tsx
// ARCHITECT: Монохромные соцсети. Серый → белый на hover. Без цветных акцентов.

import { motion } from 'framer-motion';
import type { ComponentType } from 'react';
import type { FooterLinkItem } from './Footer.types';
import { XIcon, LinkedInIcon, GitHubIcon, DiscordIcon } from './BrandIcons';

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

export function SocialLinks({ links }: SocialLinksProps) {
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
        </div>
    );
}