// ARCHITECT: заголовок вкладки — часть навигации, поэтому правило одно: короткое имя раздела
// дополняется до «Раздел — Blobus», а полный заголовок (уже содержащий имя продукта) берётся как
// есть. Формат живёт функцией: им пользуются и хук (разделы приложения), и Seo (публичные страницы),
// иначе страницы одного сайта показывали бы имя продукта по-разному.

import { useEffect } from "react";

const PRODUCT = "Blobus";

export function formatDocumentTitle(title: string): string {
    return title.includes(PRODUCT) ? title : `${title} — ${PRODUCT}`;
}

export function useDocumentTitle(title: string): void {
    useEffect(() => {
        document.title = formatDocumentTitle(title);
    }, [title]);
}
