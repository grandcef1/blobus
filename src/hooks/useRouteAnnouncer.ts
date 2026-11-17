import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// ARCHITECT: бюджет поиска якоря — по времени, а не по кадрам: лендинг грузится ленивым чанком, и на
// холодной загрузке по медленной сети 160 мс не хватает; 3 секунды покрывают такую задержку.
const SCROLL_TARGET_BUDGET_MS = 3000;

// ARCHITECT: SPA не сообщает скринридеру о смене экрана и не сбрасывает скролл.
// Фокус на главный лендмарк + объявление заголовка нового экрана.
export function useRouteAnnouncer(): void {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const main = document.getElementById("main");
    const heading = main?.querySelector("h1") ?? document.querySelector("h1");
    const title = heading?.textContent?.trim() || document.title;

    if (main) main.focus({ preventScroll: true });

    // ARCHITECT: прокрутка может жить не на window, а на внутреннем контейнере layout.
    // Сбрасываем и window, и всех прокручиваемых предков — иначе при смене раздела
    // пользователь остаётся в середине нового текста. Второй проход в rAF ловит
    // момент, когда высота нового контента уже посчитана.
    const resetScroll = (): void => {
      window.scrollTo({ top: 0, behavior: "auto" });
      let node: HTMLElement | null = main;
      while (node) {
        if (node.scrollHeight > node.clientHeight) {
          node.scrollTo({ top: 0, behavior: "auto" });
        }
        node = node.parentElement;
      }
    };

    // ARCHITECT: переход с якорем скроллит к секции, а не наверх; поиск идёт в rAF, пока элемент не
    // появится или пока не истечёт бюджет времени — иначе на медленной сети якорь молча терялся.
    const targetId = hash.replace(/^#/, "");
    let frame = 0;

    const scrollToSection = (deadline: number): void => {
      const section = document.getElementById(targetId);
      if (section !== null) {
        section.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }
      if (performance.now() < deadline) {
        frame = requestAnimationFrame(() => scrollToSection(deadline));
      }
    };

    if (targetId === "") {
      resetScroll();
      frame = requestAnimationFrame(resetScroll);
    } else {
      scrollToSection(performance.now() + SCROLL_TARGET_BUDGET_MS);
    }

    let region = document.getElementById("route-announcer");
    if (!region) {
      region = document.createElement("div");
      region.id = "route-announcer";
      region.setAttribute("aria-live", "polite");
      region.setAttribute("role", "status");
      region.className = "sr-only";
      document.body.appendChild(region);
    }
    region.textContent = title;

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
}
