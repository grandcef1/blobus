// src/pages/Landing.tsx
// ARCHITECT: добавлен Footer. Порядок: Hero -> Features -> HowItWorks -> Pricing -> Faq -> Footer

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/how-it-works/HowItWorksSection';
import { PricingSection } from '@/components/landing/pricing/PricingSection';
import { FaqSection } from '@/components/landing/faq/FaqSection';
import { Footer } from '@/components/landing/Footer';
import { Seo } from '@/components/shared/Seo';
import { HOME_JSON_LD } from '@/lib/structured-data';


function useSmoothAnchorScroll(): void {
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        const onClick = (event: MouseEvent): void => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const anchor = target.closest('a[href^="#"]');
            if (!anchor) return;

            const id = anchor.getAttribute('href')?.slice(1);
            if (!id) return;

            const section = document.getElementById(id);
            if (!section) return;

            event.preventDefault();
            const HEADER_OFFSET_PX = 120;
            const top = section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
            // ARCHITECT: плавный переход к секции — движение; при reduced motion прыгаем сразу.
            window.scrollTo({ top, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
        };

        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, [shouldReduceMotion]);
}

export function Landing() {
    useSmoothAnchorScroll();

    return (
        <>
            {/* ARCHITECT: заголовок, description и JSON-LD лендинга едут из seo-routes.json и
                src/lib/structured-data.ts — теми же строками, что попадают в статический HTML
                prerender'а. Поэтому title больше не берётся из словаря: язык SEO — ru. */}
            <Seo path="/" jsonLd={HOME_JSON_LD} />
            <Header />
            <main id="main" tabIndex={-1} className="min-h-dvh w-full max-w-full overflow-x-hidden bg-black">
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <PricingSection />
                <FaqSection />
            </main>
            <Footer />
        </>
    );
}
