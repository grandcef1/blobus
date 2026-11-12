// ARCHITECT: публичный /help. Шапка лендинга фиксирована (h-16), поэтому main получает pt-16 —
// иначе заголовок уезжает под неё. Футер тот же, что на лендинге: страница часть публичного сайта.

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { fetchFaqItems } from "@/api/support";
import { HelpCenter } from "@/components/help/HelpCenter";
import { HelpSkeleton } from "@/components/dashboard/skeletons/HelpSkeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMockQuery } from "@/hooks/useMockQuery";

export function HelpPage() {
    // ARCHITECT: публичная страница не входит в AppLayout, поэтому заголовок ставит сама — тем же
    // хуком, что и остальные экраны, чтобы правила совпадали.
    useDocumentTitle("Центр помощи");
    const { data: faqItems, isLoading } = useMockQuery(fetchFaqItems);

    return (
        <>
            <Header />
            <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-black pt-16">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    {isLoading || faqItems === null ? (
                        <HelpSkeleton />
                    ) : (
                        <HelpCenter faqItems={faqItems} />
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
