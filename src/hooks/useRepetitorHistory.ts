// ARCHITECT: состояние открытой истории и вычисление строки вставки живут отдельным хуком: шаг
// остаётся композицией, а логика «где встанет панель и куда уйдёт фокус» не раздувает его выше
// лимита в 150 строк. Хук владеет только историей: выбор персонажа приходит из мастера и с
// открытием истории никак не связан.

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Blobatar, BlobatarId } from "@/types/blobatar";

interface UseRepetitorHistoryOptions {
    /** Идентификаторы карточек в порядке обхода. */
    ids: readonly BlobatarId[];
    selectedId: BlobatarId | null;
}

interface PanelState {
    id: BlobatarId;
    isOpen: boolean;
}

export interface RepetitorHistory {
    isPanelOpen: boolean;
    openBlobatar: Blobatar | null;
    /** Последний индекс ряда, в котором стоит источник: после него вставляется панель. */
    rowEnd: number;
    /** Число колонок сетки на текущей ширине: нужно для позиции указателя. */
    columns: number;
    /** Колонка карточки-источника: указатель встаёт над её центром. */
    columnIndex: number;
    panelElementRef: RefObject<HTMLElement | null>;
    registerHistoryButton: (index: number, node: HTMLButtonElement | null) => void;
    handleToggleHistory: (id: BlobatarId) => void;
    handleClose: () => void;
    handleExitComplete: () => void;
    handleStepKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function useRepetitorHistory({
    ids,
    selectedId,
}: UseRepetitorHistoryOptions): RepetitorHistory {
    const shouldReduceMotion = useReducedMotion();

    // ARCHITECT: панель помнит id и после закрытия: пока играет анимация исчезновения, строка
    // вставки обязана остаться на месте, иначе панель телепортируется. Состояние чистит
    // AnimatePresence, когда панель ушла из DOM. При возврате на шаг панель уже открыта для
    // выбранного персонажа, поэтому человек видит контекст своего решения.
    const [panel, setPanel] = useState<PanelState | null>(() =>
        selectedId === null ? null : { id: selectedId, isOpen: true }
    );
    const panelStateRef = useRef<PanelState | null>(panel);
    const panelElementRef = useRef<HTMLElement | null>(null);
    const historyButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    // ARCHITECT: фокус переносим в панель только на открытие по действию пользователя: на
    // возврате на шаг панель открыта сама, и забирать фокус у человека нельзя.
    const focusOnOpenRef = useRef(false);

    // ARCHITECT: число колонок берём по тем же брейкпоинтам, что у сетки. От него зависит строка
    // вставки, и на ресайзе она пересчитывается сама — панель остаётся под своим рядом.
    const isWide = useMediaQuery("(min-width: 1024px)");
    const isMedium = useMediaQuery("(min-width: 640px)");
    const columns = isWide ? 3 : isMedium ? 2 : 1;

    const openBlobatar = panel === null ? null : getBlobatarById(panel.id) ?? null;
    const openIndex = panel === null ? -1 : ids.indexOf(panel.id);
    // ARCHITECT: строка вставки — конец ряда источника, но не дальше последнего персонажа: у
    // неполного последнего ряда панель встаёт сразу под своей единственной карточкой.
    const rowEnd =
        openIndex < 0 ? -1 : Math.min(Math.ceil((openIndex + 1) / columns) * columns, ids.length);
    // ARCHITECT: колонка источника — это индекс внутри ряда, а не внутри списка: указатель
    // полосы должен смотреть на карточку, а не на её номер в общем порядке.
    const columnIndex = openIndex < 0 ? 0 : openIndex % columns;
    const isPanelOpen = panel !== null && panel.isOpen;

    const applyPanel = useCallback((next: PanelState | null) => {
        panelStateRef.current = next;
        setPanel(next);
    }, []);

    const focusHistoryButton = useCallback(
        (id: BlobatarId) => {
            historyButtonRefs.current[ids.indexOf(id)]?.focus();
        },
        [ids]
    );

    const registerHistoryButton = useCallback((index: number, node: HTMLButtonElement | null) => {
        historyButtonRefs.current[index] = node;
    }, []);

    // ARCHITECT: колбэк почти без зависимостей: карточки мемоизированы, и открытие панели не
    // должно перерисовывать десять карточек, поэтому текущее состояние читаем из ref.
    const handleToggleHistory = useCallback(
        (id: BlobatarId) => {
            const current = panelStateRef.current;

            if (current !== null && current.isOpen && current.id === id) {
                applyPanel({ id, isOpen: false });
                focusHistoryButton(id);
                return;
            }

            focusOnOpenRef.current = true;
            applyPanel({ id, isOpen: true });
        },
        [applyPanel, focusHistoryButton]
    );

    const handleClose = useCallback(() => {
        const current = panelStateRef.current;
        if (current === null || !current.isOpen) return;

        applyPanel({ id: current.id, isOpen: false });
        focusHistoryButton(current.id);
    }, [applyPanel, focusHistoryButton]);

    const handleExitComplete = useCallback(() => {
        if (panelStateRef.current !== null && panelStateRef.current.isOpen) return;
        applyPanel(null);
    }, [applyPanel]);

    // ARCHITECT: Escape слушаем на всём шаге, а не на панели: закрывать историю нужно и когда
    // фокус уже ушёл на кнопку закрытия или на карточку.
    const handleStepKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "Escape" || panelStateRef.current?.isOpen !== true) return;
            event.preventDefault();
            handleClose();
        },
        [handleClose]
    );

    useEffect(() => {
        if (!isPanelOpen || !focusOnOpenRef.current) return;
        focusOnOpenRef.current = false;

        const element = panelElementRef.current;
        if (element === null) return;

        element.focus({ preventScroll: true });
        element.scrollIntoView({
            behavior: shouldReduceMotion ? "auto" : "smooth",
            block: "nearest",
        });
    }, [isPanelOpen, panel, shouldReduceMotion]);

    return {
        isPanelOpen,
        openBlobatar,
        rowEnd,
        columns,
        columnIndex,
        panelElementRef,
        registerHistoryButton,
        handleToggleHistory,
        handleClose,
        handleExitComplete,
        handleStepKeyDown,
    };
}

