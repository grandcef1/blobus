// src/components/landing/Footer/FooterLink.tsx
// ARCHITECT: Чистая монохромная ссылка. Серый → белый. Без цветных акцентов.

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { FooterLinkItem } from './Footer.types';

interface FooterLinkProps {
    readonly link: FooterLinkItem;
}

export function FooterLink({ link }: FooterLinkProps) {
    const { label, href, external = false } = link;

    return (
        <motion.a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="group inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors duration-200 hover:text-white"
            whileHover={{ x: 3 }}
            transition={{ type: 'tween', duration: 0.15 }}
        >
            <span>{label}</span>
            {external && (
                <ExternalLink
                    className="h-3 w-3 opacity-0 transition-opacity duration-200 group-hover:opacity-50"
                    aria-hidden="true"
                />
            )}
        </motion.a>
    );
}