import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { AuthAwareCta } from "./AuthAwareCta";
import { HeaderMobileMenu } from "./HeaderMobileMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";

// ARCHITECT: единый источник навигации — якоря для плавного скролла; подписи лежат ключами в
// словаре landing, поэтому шапка переводится вместе со страницей. Константа живёт здесь, потому
// что react-refresh запрещает экспортировать не-компоненты из .tsx; мобильное меню получает её пропсом.
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
                    {/* ARCHITECT: переключатель языка живёт в шапке рядом с CTA; разделитель —
                        тот же тонкий светлый штрих, что и границы хедера. */}
                    <LanguageSwitcher placement="down" compact />
                    <span className="h-5 w-px bg-white/10" aria-hidden="true" />
                    {/* ARCHITECT: у гостя пара кнопок остаётся как была; у вошедшего её заменяет
                        одна плашка с аватаром, именем и переходом в кабинет. */}
                    <AuthAwareCta>
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
                    </AuthAwareCta>
                </div>

                {/* ARCHITECT: мобильное меню (< md) вынесено в HeaderMobileMenu: хедер остаётся в
                    лимите 150 строк, а состояние Sheet по-прежнему принадлежит Radix. */}
                <HeaderMobileMenu
                    links={NAV_LINKS}
                    onLogin={handleLogin}
                    onGetStarted={handleGetStarted}
                />
            </div>
        </header>
    );
}
