// ARCHITECT: состояние языка для UI. Правда о языке живёт в i18next (он же сохраняет выбор в
// localStorage через детектор), а стор только даёт React актуальное значение и одну точку смены —
// так переключатель не может разойтись с переводами.

import { create } from "zustand";
import i18n, {
    DEFAULT_LANGUAGE,
    LANGUAGE_STORAGE_KEY,
    SUPPORTED_LANGUAGES,
    type LanguageCode,
} from "@/lib/i18n";

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
        // ARCHITECT: только явный выбор пользователя фиксируется в хранилище: у детектора caches
        // пустой, поэтому автоопределённый язык туда не попадает.
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
        document.documentElement.lang = code;
        set({ lang: code });
        void i18n.changeLanguage(code);
    },
}));

// ARCHITECT: смена языка из любого места синхронизирует стор и <html lang>, иначе переключатель
// показывал бы прежний язык.
i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
    useLanguageStore.setState({ lang: toSupported(lng) });
});
