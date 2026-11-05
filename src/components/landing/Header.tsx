import { Menu } from "lucide-react";

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

// ARCHITECT: единый источник навигации — якоря для плавного скролла.
const NAV_LINKS = [
    { label: "Возможности", href: "#features" },
    { label: "Как работает", href: "#how-it-works" },
    { label: "Тарифы", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
] as const;

export function Header() {
    return (
        // ARCHITECT: фиксированная панель h-16, полупрозрачный чёрный с blur, тонкая светлая граница
        <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-black/80 backdrop-blur-md">
            <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                
                {/* ARCHITECT: Логотип теперь ведет на корневой путь "/", что перезагружает/возвращает на главную. */}
                <a
                    href="/"
                    className="font-bold text-xl text-[#f0f0f5] hover:text-white transition-colors"
                    aria-label="Перейти на главную страницу"
                >
                    Blobus
                </a>

                {/* ARCHITECT: десктопная навигация — скрыта на мобильных, видна с md */}
                <nav
                    aria-label="Основная навигация"
                    className="hidden items-center gap-8 md:flex"
                >
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-[#f0f0f5]/70 transition-colors hover:text-white"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* ARCHITECT: кнопки справа — видны только на десктопе */}
                <div className="hidden items-center gap-3 md:flex">
                    <Button
                        variant="outline"
                        className="rounded-full shadow-none border border-[#f0f0f5]/30 bg-transparent text-[#f0f0f5] hover:bg-[#f0f0f5]/10 hover:text-white"
                    >
                        Войти
                    </Button>
                    <Button className="rounded-full shadow-none bg-[#f0f0f5] text-black hover:bg-white">
                        Начать
                    </Button>
                </div>

                {/* ARCHITECT: мобильное меню (< md) — бургер открывает Sheet с теми же ссылками и кнопками */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Открыть меню"
                            className="text-[#f0f0f5] hover:bg-white/10 hover:text-white md:hidden"
                        >
                            <Menu aria-hidden="true" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-72 sm:w-72">
                        <SheetHeader>
                            <SheetTitle>Blobus</SheetTitle>
                            <SheetDescription>Навигация по сайту</SheetDescription>
                        </SheetHeader>

                        <nav
                            aria-label="Мобильная навигация"
                            className="flex flex-col gap-1 px-4"
                        >
                            {NAV_LINKS.map((link) => (
                                // ARCHITECT: SheetClose — переход по якорю автоматически закрывает drawer
                                <SheetClose asChild key={link.href}>
                                    <a
                                        href={link.href}
                                        className="rounded-md px-2 py-2 text-base text-black/80 transition-colors hover:bg-black/5 hover:text-black"
                                    >
                                        {link.label}
                                    </a>
                                </SheetClose>
                            ))}
                        </nav>

                        <div className="mt-auto flex flex-col gap-3 p-6">
                            <Button className="w-full rounded-full bg-black text-[#f0f0f5] shadow-none hover:bg-zinc-800">
                                Начать
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full rounded-full border-black/30 bg-transparent text-black shadow-none hover:bg-black/5 hover:text-black"
                            >
                                Войти
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
