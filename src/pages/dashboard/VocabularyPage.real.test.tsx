// ARCHITECT: страница проверяется на моке useVocabulary — сервер здесь не нужен, контракт чтения уже
// покрыт server/routes/vocabulary.test.ts. Негативные проверки обязательны: null-поля не рендерятся,
// пустой словарь и пустой поиск различаются, ошибка даёт повтор запроса, режим повторения пишет исход.

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VocabularyPage } from "@/pages/dashboard/VocabularyPage";
import { renderWithProviders } from "@/test/utils";
import type { VocabularyEntryDto } from "@/api/progress";
import type { VocabularyResult } from "@/hooks/useVocabulary";
import type { VocabularyWord } from "@/types/progress";

const { useVocabularyMock, markWordReviewedMock } = vi.hoisted(() => ({
    useVocabularyMock: vi.fn(),
    markWordReviewedMock: vi.fn(),
}));

vi.mock("@/hooks/useVocabulary", () => ({ useVocabulary: useVocabularyMock }));
vi.mock("@/api/progress", () => ({ markWordReviewed: markWordReviewedMock }));

const refetchMock = vi.fn(async () => undefined);

const ENTRIES: VocabularyEntryDto[] = [
    {
        id: "a1b2c3d4-0001-4000-8000-000000000001",
        term: "collaborate",
        translation: "сотрудничать",
        context: "We need to collaborate on this project.",
        exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
        sourceLessonId: null,
        stage: 1,
        nextDueAt: "2026-11-18T09:00:00.000Z",
        createdAt: "2026-11-18T09:00:00.000Z",
        updatedAt: "2026-11-18T09:30:00.000Z",
    },
];

const BARE_ENTRY: VocabularyEntryDto = {
    id: "a1b2c3d4-0002-4000-8000-000000000002",
    term: "deadline",
    translation: null,
    context: null,
    exampleTranslation: null,
    sourceLessonId: null,
    stage: 2,
    nextDueAt: "2026-11-18T09:30:00.000Z",
    createdAt: "2026-11-17T09:00:00.000Z",
    updatedAt: "2026-11-17T09:30:00.000Z",
};

const FUTURE_ENTRY: VocabularyEntryDto = {
    id: "a1b2c3d4-0003-4000-8000-000000000003",
    term: "postpone",
    translation: "откладывать",
    context: null,
    exampleTranslation: null,
    sourceLessonId: null,
    stage: 3,
    nextDueAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-11-17T09:00:00.000Z",
    updatedAt: "2026-11-17T09:30:00.000Z",
};

const MOCK_WORD: VocabularyWord = {
    id: "word_1",
    word: "collaborate",
    translation: "сотрудничать",
    pronunciation: "/kəˈlæbəreɪt/",
    partOfSpeech: "verb",
    examples: [{ sentence: "We need to collaborate on this project." }],
    learnedAt: Date.parse("2026-11-18T09:00:00.000Z"),
    lastReviewedAt: Date.parse("2026-11-18T09:30:00.000Z"),
    reviewCount: 3,
    mastery: 85,
    modeIds: ["interview"],
};

interface RealOptions {
    readonly entries?: VocabularyEntryDto[];
    readonly isLoading?: boolean;
    readonly isError?: boolean;
}

// ARCHITECT: явные фабрики вместо спреда Partial: поля возвращаются заполненными, тип результата точный.
function realResult(options: RealOptions = {}): VocabularyResult {
    return {
        kind: "real",
        entries: options.entries ?? [],
        isLoading: options.isLoading ?? false,
        isError: options.isError ?? false,
        error: options.isError === true ? new Error("boom") : null,
        refetch: refetchMock,
    };
}

function mockResult(words: VocabularyWord[]): VocabularyResult {
    return {
        kind: "mock",
        words,
        isLoading: false,
        isError: false,
        error: null,
        refetch: refetchMock,
    };
}

beforeEach(() => {
    refetchMock.mockClear();
    markWordReviewedMock.mockReset();
    markWordReviewedMock.mockResolvedValue(ENTRIES[0]);
});

afterEach(() => {
    useVocabularyMock.mockReset();
});

describe("VocabularyPage на реальных записях", () => {
    it("6.1 real-список: term/translation/context видны, mastery и озвучки нет", () => {
        useVocabularyMock.mockReturnValue(realResult({ entries: ENTRIES }));
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByRole("heading", { name: "collaborate" })).toBeInTheDocument();
        expect(screen.getByText("сотрудничать")).toBeInTheDocument();
        expect(screen.getByText("We need to collaborate on this project.")).toBeInTheDocument();
        expect(screen.getByText("Нам нужно сотрудничать над этим проектом.")).toBeInTheDocument();
        expect(screen.queryByText("85%")).not.toBeInTheDocument();
        expect(screen.queryByText("/kəˈlæbəreɪt/")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Произнести collaborate" })
        ).not.toBeInTheDocument();
        expect(screen.getByText("1 слов в коллекции")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    });

    it("6.2 real translation=null и context=null: эти строки не рендерятся", () => {
        useVocabularyMock.mockReturnValue(realResult({ entries: [BARE_ENTRY] }));
        const { container } = renderWithProviders(<VocabularyPage />);

        expect(screen.getByRole("heading", { name: "deadline" })).toBeInTheDocument();
        // единственный текст в карточке — term; пустых абзацев под ним нет
        expect(screen.getByRole("article").querySelectorAll("p")).toHaveLength(0);
        expect(container.textContent).not.toContain("—");
    });

    it("6.3 real пусто: EmptyState словаря", () => {
        useVocabularyMock.mockReturnValue(realResult());
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByText("Словарь пока пуст")).toBeInTheDocument();
        expect(screen.getByText("Слова добавляются из уроков и повторений.")).toBeInTheDocument();
    });

    it("6.4 real поиск без совпадений: состояние поиска, а не пустого словаря", async () => {
        const user = userEvent.setup();
        useVocabularyMock.mockReturnValue(realResult({ entries: ENTRIES }));
        renderWithProviders(<VocabularyPage />);

        await user.type(screen.getByPlaceholderText("Поиск слова или перевода"), "zzz");

        expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
        expect(screen.queryByText("Словарь пока пуст")).not.toBeInTheDocument();
    });

    it("6.5 real ошибка: ErrorState, повтор вызывает refetch", async () => {
        const user = userEvent.setup();
        useVocabularyMock.mockReturnValue(realResult({ isError: true }));
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Обновить" }));

        expect(refetchMock).toHaveBeenCalledTimes(1);
    });

    it("6.6 mock: та же карточка без mastery и озвучки, повтор доступен", () => {
        useVocabularyMock.mockReturnValue(mockResult([MOCK_WORD]));
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByRole("heading", { name: "collaborate" })).toBeInTheDocument();
        expect(screen.getByText("We need to collaborate on this project.")).toBeInTheDocument();
        expect(screen.queryByText("85%")).not.toBeInTheDocument();
        expect(screen.queryByText("/kəˈlæbəreɪt/")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Произнести collaborate" })
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
    });

    it("6.7 повторение: ответ, «Помню» пишет исход, очередь заканчивается", async () => {
        const user = userEvent.setup();
        useVocabularyMock.mockReturnValue(realResult({ entries: ENTRIES }));
        renderWithProviders(<VocabularyPage />);

        await user.click(screen.getByRole("button", { name: "Повторить" }));

        expect(screen.getByText("К повтору: 1")).toBeInTheDocument();
        expect(screen.queryByText("сотрудничать")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Показать ответ" }));

        expect(screen.getByText("сотрудничать")).toBeInTheDocument();
        expect(screen.getByText("Нам нужно сотрудничать над этим проектом.")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Помню" }));

        expect(markWordReviewedMock).toHaveBeenCalledWith(ENTRIES[0].id, "remembered");
        expect(await screen.findByText("На сегодня всё")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Закрыть" }));

        expect(screen.getByRole("heading", { name: "collaborate" })).toBeInTheDocument();
    });

    it("6.8 повторение недоступно, когда ни одно слово не подошло по сроку", () => {
        useVocabularyMock.mockReturnValue(realResult({ entries: [FUTURE_ENTRY] }));
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByRole("heading", { name: "postpone" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
    });

    it("6.9 кнопка добавления открывает модалку, повтор и счётчик не изменились", async () => {
        const user = userEvent.setup();
        useVocabularyMock.mockReturnValue(realResult({ entries: ENTRIES }));
        renderWithProviders(<VocabularyPage />);

        expect(screen.getByText("1 слов в коллекции")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Добавить слово" }));

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(screen.getByLabelText("Слово")).toBeInTheDocument();

        await user.keyboard("{Escape}");

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        // ARCHITECT: режим повторения не изменился: кнопка по-прежнему открывает карточку.
        await user.click(screen.getByRole("button", { name: "Повторить" }));

        expect(screen.getByRole("button", { name: "Показать ответ" })).toBeInTheDocument();
    });
});
