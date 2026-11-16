import { Menu } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

// ARCHITECT: единый источник навигации — якоря для плавного скролла; подписи лежат ключами в
// словаре landing, поэтому шапка переводится вместе со страницей.
const NAV_LINKS = [
    { labelKey: "nav.features", href: "#features" },
    { labelKey: "nav.howItWorks", href: "#how-it-works" },
    { labelKey: "nav.pricing", href: "#pricing" },
    { labelKey: "nav.faq", href: "#faq" },
] as const;

export function Header() {
    const navigate = useNavigate();
    const { t } = useTranslation("landing");
    const { t: tCommon } = useTranslation("common");

    // Добавь обработчики:
    const handleLogin = () => {
        // ARCHITECT: вход — самостоятельный экран /login, а не мастер настройки
        navigate('/login');
    };

    const handleGetStarted = () => {
        // ARCHITECT: Для новых пользователей — онбординг
        navigate('/onboarding');
    };
    return (
        // ARCHITECT: фиксированная панель h-16, полупрозрачный чёрный с blur, тонкая светлая граница
        <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-black/80 backdrop-blur-md">
            <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* ARCHITECT: Логотип теперь ведет на корневой путь "/", что перезагружает/возвращает на главную. */}
                <a
                    href="/"
                    className="font-bold text-xl text-[#f0f0f5] hover:text-white transition-colors"
                    aria-label={tCommon('a11y.homeLink')}
                >
                    Blobus
                </a>

                {/* ARCHITECT: десктопная навигация — скрыта на мобильных, видна с md */}
                <nav
                    aria-label={tCommon('a11y.mainNav')}
                    className="hidden items-center gap-8 md:flex"
                >
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-[#f0f0f5]/70 transition-colors hover:text-white"
                        >
                            {t(link.labelKey)}
                        </a>
                    ))}
                </nav>

                {/* ARCHITECT: кнопки справа — видны только на десктопе */}
                <div className="hidden items-center gap-3 md:flex">
                    <Button
                        variant="outline"
                        onClick={handleLogin}
                        className="rounded-full shadow-none border border-[#f0f0f5]/30 bg-transparent text-[#f0f0f5] hover:bg-[#f0f0f5]/10 hover:text-white"
                    >
                        {tCommon('actions.login')}
                    </Button>
                    <Button
                        onClick={handleGetStarted}
                        className="rounded-full shadow-none bg-[#f0f0f5] text-black hover:bg-white"
                    >
                        {tCommon('actions.start')}
                    </Button>
                </div>

                {/* ARCHITECT: мобильное меню (< md) — бургер открывает Sheet с теми же ссылками и кнопками */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tCommon('a11y.openMenu')}
                            className="text-[#f0f0f5] hover:bg-white/10 hover:text-white md:hidden"
                        >
                            <Menu aria-hidden="true" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-72 sm:w-72">
                        <SheetHeader>
                            <SheetTitle>Blobus</SheetTitle>
                            <SheetDescription>{tCommon('a11y.siteNav')}</SheetDescription>
                        </SheetHeader>

                        <nav
                            aria-label={tCommon('a11y.mobileNav')}
                            className="flex flex-col gap-1 px-4"
                        >
                            {NAV_LINKS.map((link) => (
                                // ARCHITECT: SheetClose — переход по якорю автоматически закрывает drawer
                                <SheetClose asChild key={link.href}>
                                    <a
                                        href={link.href}
                                        className="rounded-xl px-3 py-2.5 text-base text-[#f0f0f5]/80 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]/60"
                                    >
                                        {t(link.labelKey)}
                                    </a>
                                </SheetClose>
                            ))}
                        </nav>

                        {/* ARCHITECT: кнопки внутри тёмной панели — тёмные варианты: primary как
                            в шапке (светлая пилюля), secondary — стеклянный ghost с border-white/20. */}
                        <div className="mt-auto flex flex-col gap-3 p-6">
                            <Button
                                onClick={handleGetStarted}
                                className="w-full rounded-full bg-[#f0f0f5] text-black shadow-none hover:bg-white"
                            >
                                {tCommon('actions.start')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleLogin}
                                className="w-full rounded-full border border-white/20 bg-transparent text-[#f0f0f5] shadow-none hover:bg-white/5 hover:text-white"
                            >
                                {tCommon('actions.login')}
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
