// ARCHITECT: мобильное меню вынесено из хедера, чтобы Header вернулся в лимит 150 строк и чтобы
// auth-логика не раздувала файл; состояние Sheet принадлежит Radix, поэтому пропсов состояния нет.
// ARCHITECT: карта навигации приходит пропсом links: правило react-refresh запрещает экспортировать
// константы из .tsx, а дублировать список в двух файлах — гарантированный рассинхрон.

import { Menu } from "lucide-react";
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

import { AuthAwareCta } from "./AuthAwareCta";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavLinkKey = "nav.features" | "nav.howItWorks" | "nav.pricing" | "nav.faq";

interface HeaderMobileMenuProps {
    readonly links: readonly { readonly labelKey: NavLinkKey; readonly href: string }[];
    readonly onLogin: () => void;
    readonly onGetStarted: () => void;
}

export function HeaderMobileMenu({ links, onLogin, onGetStarted }: HeaderMobileMenuProps) {
    const { t } = useTranslation("landing");
    const { t: tCommon } = useTranslation("common");

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tCommon("a11y.openMenu")}
                    className="text-[#f0f0f5] hover:bg-white/10 hover:text-white md:hidden"
                >
                    <Menu aria-hidden="true" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-72">
                <SheetHeader>
                    <SheetTitle>Blobus</SheetTitle>
                    <SheetDescription>{tCommon("a11y.siteNav")}</SheetDescription>
                </SheetHeader>

                <nav aria-label={tCommon("a11y.mobileNav")} className="flex flex-col gap-1 px-4">
                    {links.map((link) => (
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

                {/* ARCHITECT: на мобильных полный переключатель стоит под навигацией и
                    раскрывается вниз внутри панели Sheet (у SheetContent нет overflow-обрезки). */}
                <div className="px-4">
                    <LanguageSwitcher placement="down" />
                </div>

                {/* ARCHITECT: кнопки внутри тёмной панели — тёмные варианты: primary как
                    в шапке (светлая пилюля), secondary — стеклянный ghost с border-white/20. */}
                <div className="mt-auto flex flex-col gap-3 p-6">
                    <AuthAwareCta className="w-full justify-center">
                        <Button
                            onClick={onGetStarted}
                            className="w-full rounded-full bg-[#f0f0f5] text-black shadow-none hover:bg-white"
                        >
                            {tCommon("actions.start")}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onLogin}
                            className="w-full rounded-full border border-white/20 bg-transparent text-[#f0f0f5] shadow-none hover:bg-white/5 hover:text-white"
                        >
                            {tCommon("actions.login")}
                        </Button>
                    </AuthAwareCta>
                </div>
            </SheetContent>
        </Sheet>
    );
}