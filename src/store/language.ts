// ARCHITECT: состояние языка для UI. Правда о языке живёт в i18next (он же сохраняет выбор в
// localStorage через детектор), а стор только даёт React актуальное значение и одну точку смены —
// так переключатель не может разойтись с переводами.

import { create } from "zustand";
import i18n, {
    DEFAULT_LANGUAGE,
    LANGUAGE_STORAGE_KEY,
    SUPPORTED_LANGUAGES,
    detectLanguage,
    ensureLanguage,
    type LanguageCode,
} from "@/lib/i18n";

function toSupported(code: string | undefined): LanguageCode {
    const short = (code ?? "").split("-")[0]?.toLowerCase();
    return SUPPORTED_LANGUAGES.find((item) => item === short) ?? DEFAULT_LANGUAGE;
}

// ARCHITECT: <html lang> должен совпадать с языком интерфейса: от него зависят переносы, чтение
// скринридером и перевод страницы браузером. Ставим сразу на старте, а не только при переключении.
const initialLang = detectLanguage();
document.documentElement.lang = initialLang;

interface LanguageState {
    lang: LanguageCode;
    setLanguage: (code: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
    lang: initialLang,
    setLanguage: (code) => {
        void (async () => {
            // ARCHITECT: сначала бандл целевого языка, только потом смена языка и запись выбора — иначе
            // интерфейс мигнул бы сырыми ключами. Сбой загрузки оставляет текущий язык и не пишет
            // localStorage: пользователь не должен получить «выбранный» язык без переводов.
            if (!(await ensureLanguage(code))) return;

            try {
                await i18n.changeLanguage(code);
            } catch {
                return;
            }

            localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
            document.documentElement.lang = code;
            set({ lang: code });
        })();
    },
}));

// ARCHITECT: смена языка из любого места синхронизирует стор и <html lang>, иначе переключатель
// показывал бы прежний язык.
i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
    useLanguageStore.setState({ lang: toSupported(lng) });
});
