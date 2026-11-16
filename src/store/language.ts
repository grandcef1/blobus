// ARCHITECT: состояние языка для UI. Правда о языке живёт в i18next (он же сохраняет выбор в
// localStorage через детектор), а стор только даёт React актуальное значение и одну точку смены —
// так переключатель не может разойтись с переводами.

import { create } from "zustand";
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n";

function toSupported(code: string | undefined): LanguageCode {
    const short = (code ?? "").split("-")[0]?.toLowerCase();
    return SUPPORTED_LANGUAGES.find((item) => item === short) ?? DEFAULT_LANGUAGE;
}

// ARCHITECT: <html lang> должен совпадать с языком интерфейса: от него зависят переносы, чтение
// скринридером и перевод страницы браузером. Ставим сразу на старте, а не только при переключении.
const initialLang = toSupported(i18n.resolvedLanguage ?? i18n.language);
document.documentElement.lang = initialLang;

interface LanguageState {
    lang: LanguageCode;
    setLanguage: (code: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
    lang: initialLang,
    setLanguage: (code) => {
        document.documentElement.lang = code;
        set({ lang: code });
        // ARCHITECT: детектор запишет выбор в localStorage сам при changeLanguage — своего persist нет.
        void i18n.changeLanguage(code);
    },
}));
