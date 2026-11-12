// ARCHITECT: заголовок вкладки — часть навигации, поэтому правило одно: короткое имя раздела
// дополняется до «Раздел — Blobus», а полный заголовок (уже содержащий имя продукта) берётся как
// есть. Хук вместо ручных эффектов на страницах: заголовок ставится в одном месте, и протечка
// названия одного экрана на соседний становится невозможной.

import { useEffect } from "react";

const PRODUCT = "Blobus";

export function useDocumentTitle(title: string): void {
    useEffect(() => {
        document.title = title.includes(PRODUCT) ? title : `${title} — ${PRODUCT}`;
    }, [title]);
}