// src/pages/Landing.tsx
// ARCHITECT: добавлен импорт FaqSection. Порядок: Hero -> Features -> HowItWorks -> Pricing -> Faq.

import { useEffect } from "react";

import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/how-it-works/HowItWorksSection";
import { PricingSection } from "@/components/landing/pricing/PricingSection";
import { FaqSection } from "@/components/landing/faq/FaqSection";

function useSmoothAnchorScroll(): void {
    useEffect(() => {
        const onClick = (event: MouseEvent): void => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest('a[href^="#"]');
            if (!anchor) return;
            const id = anchor.getAttribute("href")?.slice(1);
            if (!id) return;
            const section = document.getElementById(id);
            if (!section) return;
            
            event.preventDefault();
            const HEADER_OFFSET_PX = 120;
            const top = section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
            window.scrollTo({ top, behavior: "smooth" });
        };

        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, []);
}

export function Landing() {
    useSmoothAnchorScroll();

    return (
        <>
            <Header />
            <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-black">
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <PricingSection />
                <FaqSection />
            </main>
        </>
    );
}
