import { useTranslation } from "react-i18next";

// ARCHITECT: первый фокусируемый элемент документа — иначе клавиатурный пользователь
// проходит всю навигацию заново на каждом экране.
export function SkipToContent() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-[#f0f0f5] focus:px-4 focus:text-sm focus:font-medium focus:text-black"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
