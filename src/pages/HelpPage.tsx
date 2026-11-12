// ARCHITECT: публичный /help. Шапка лендинга фиксирована (h-16), поэтому main получает pt-16 —
// иначе заголовок уезжает под неё. Футер тот же, что на лендинге: страница часть публичного сайта.

import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { HelpCenter } from "@/components/help/HelpCenter";

export function HelpPage() {
    useEffect(() => {
        document.title = "Центр помощи — Blobus";
    }, []);

    return (
        <>
            <Header />
            <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-black pt-16">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    <HelpCenter />
                </div>
            </main>
            <Footer />
        </>
    );
}
