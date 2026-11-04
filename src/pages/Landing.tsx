import { useEffect } from "react";

import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

// ARCHITECT: плавный скролл к якорям без правки index.css — перехватываем клики по ссылкам вида "#id".
function useSmoothAnchorScroll(): void {
    useEffect(() => {
        const onClick = (event: MouseEvent): void => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            const anchor = target.closest('a[href^="#"]');
            if (!anchor) {
                return;
            }
            const id = anchor.getAttribute("href")?.slice(1);
            if (!id) {
                return;
            }
            const section = document.getElementById(id);
            if (!section) {
                return;
            }
            event.preventDefault();
            // ARCHITECT: small offset so the section top isn't hidden behind the fixed header (h-16).
            // ARCHITECT: отступ 56px, flex items-center для выравнивания Blobatar и текста —
            // контент Hero теперь сам задаёт отступ (pt-[56px] внутри HeroSection), здесь padding-top убран,
            // offset якорей = 64px header + 56px зазор = 120px.
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
            {/* ARCHITECT: отступ 56px, flex items-center для выравнивания Blobatar и текста —
          верхний отступ перенесён внутрь HeroSection (pt-[56px]); здесь padding убран, чтобы не было двойных отступов. */}
            <main className="min-h-dvh bg-black">
                <HeroSection />
                {/* ARCHITECT: секция фич подключена под hero; id="features" внутри — якорь из Header-навигации */}
                <FeaturesSection />
            </main>
        </>
    );
}