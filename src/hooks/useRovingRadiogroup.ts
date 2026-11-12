// ARCHITECT: клавиатурная модель радиогруппы: roving tabindex, стрелки с закольцовыванием,
// Home и End, выбор по Enter и пробелу. Логика вынесена из шага отдельным хуком: она не про
// разметку, а шаг от неё раздувался выше лимита в 150 строк. Раскрытие истории в модель не
// входит: панель истории не radio, её закрытие обрабатывает сам шаг.

import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { BlobatarId } from "@/types/blobatar";

interface RovingRadiogroupOptions {
    /** Идентификаторы в порядке обхода. */
    ids: readonly BlobatarId[];
    /** Индекс сфокусированного элемента на момент монтирования. */
    initialIndex?: number;
    /** Выбор сфокусированного элемента по Enter и пробелу. */
    onSelect: (id: BlobatarId) => void;
}

export interface RovingRadiogroup {
    focusedIndex: number;
    setFocusedIndex: (index: number) => void;
    handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    registerRadio: (index: number, node: HTMLButtonElement | null) => void;
}

export function useRovingRadiogroup({
    ids,
    initialIndex = 0,
    onSelect,
}: RovingRadiogroupOptions): RovingRadiogroup {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex);
    const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // ARCHITECT: стрелка переводит реальный фокус, а не только внутренний индекс: при
    // перестроении сетки фокус не теряется, потому что ссылки на кнопки живут здесь.
    const focusRadio = useCallback((index: number) => {
        setFocusedIndex(index);
        radioRefs.current[index]?.focus();
    }, []);

    const registerRadio = useCallback((index: number, node: HTMLButtonElement | null) => {
        radioRefs.current[index] = node;
    }, []);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            const lastIndex = ids.length - 1;

            switch (event.key) {
                case "ArrowRight":
                case "ArrowDown":
                    event.preventDefault();
                    focusRadio(focusedIndex >= lastIndex ? 0 : focusedIndex + 1);
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    event.preventDefault();
                    focusRadio(focusedIndex <= 0 ? lastIndex : focusedIndex - 1);
                    break;
                case "Home":
                    event.preventDefault();
                    focusRadio(0);
                    break;
                case "End":
                    event.preventDefault();
                    focusRadio(lastIndex);
                    break;
                case "Enter":
                case " ":
                    event.preventDefault();
                    onSelect(ids[focusedIndex]);
                    break;
            }
        },
        [focusRadio, focusedIndex, ids, onSelect]
    );

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        registerRadio,
    };
}
