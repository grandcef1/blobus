// ARCHITECT: jsdom — не браузер: перечисленные API в нём отсутствуют или громко ругаются в консоль, а
// код приложения (matchMedia, наблюдения за вьюпортом, шейдерный фон, скачивание файлов, canvas)
// вызывает их при монтировании. Моки собраны здесь, а не в каждом тесте: иначе новый тест падал бы на
// отсутствующем API jsdom, а не на своей логике.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import i18n, { DEFAULT_LANGUAGE } from "@/lib/i18n";

// ARCHITECT: paper-design поднимает WebGL2 и бросает исключение, когда контекста нет: в jsdom шейдеров
// не существует, поэтому фоновая сетка подменяется заглушкой.
vi.mock("@paper-design/shaders-react", () => ({ MeshGradient: () => null }));

// ARCHITECT: медиазапросы jsdom всегда отвечают matches: false; явный мок фиксирует это и даёт
// addEventListener, которого в старых сборках jsdom нет.
function createMatchMedia(query: string): MediaQueryList {
    return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
    };
}

window.matchMedia = createMatchMedia;

// ARCHITECT: наблюдателей за вьюпортом в jsdom нет; компонентам важен факт подписки, а не измерения.
class IntersectionObserverMock {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "0px";
    readonly thresholds: number[] = [];

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}

class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

window.IntersectionObserver = IntersectionObserverMock;
window.ResizeObserver = ResizeObserverMock;

// ARCHITECT: scrollTo и canvas-контекст — «not implemented» в jsdom: прокрутка в тестах не проверяется,
// а webgl2 отключён сознательно (приложение проверяет поддержку и без него просто не включает фон).
window.scrollTo = () => undefined;
HTMLCanvasElement.prototype.getContext = () => null;

// ARCHITECT: скачивание файлов строится на object URL, которого в jsdom нет.
URL.createObjectURL = () => "blob:blobus-test";
URL.revokeObjectURL = () => undefined;

// ARCHITECT: язык тестов не должен зависеть от navigator jsdom (en-US): фиксируем ru — основной язык
// продукта и эталон типизации ключей t().
await i18n.changeLanguage(DEFAULT_LANGUAGE);

// ARCHITECT: globals выключены, поэтому автоматический cleanup Testing Library не регистрируется —
// размонтируем руками, иначе эффекты предыдущего теста живут в следующем.
afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
});
