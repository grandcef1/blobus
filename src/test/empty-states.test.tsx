// ARCHITECT: пустые состояния подключаются на уровне страниц, поэтому тест проверяет именно проводку
// (пустые данные → EmptyState, поиск без совпадений → отдельный текст), а не только разметку компонента.
// ARCHITECT: api-модули мокаются целиком: тест не зависит ни от содержимого моков, ни от delayMock.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyWord } from "@/types/progress";
import { SessionsPage } from "@/pages/dashboard/SessionsPage";
import { TutorsPage } from "@/pages/dashboard/TutorsPage";
import { VocabularyPage } from "@/pages/dashboard/VocabularyPage";
import { renderWithProviders, resetStores } from "@/test/utils";

const WORD: VocabularyWord = {
    id: "w1",
    word: "deadline",
    translation: "срок",
    pronunciation: "deadline",
    partOfSpeech: "noun",
    examples: [],
    learnedAt: 0,
    lastReviewedAt: 0,
    reviewCount: 1,
    mastery: 40,
    modeIds: ["interview"],
};

// ARCHITECT: набор слов живёт в hoisted-объекте: фабрика vi.mock поднимается выше импортов и не
// видит обычные константы теста.
const vocabulary = vi.hoisted(() => ({ items: [] as VocabularyWord[] }));

vi.mock("@/api/sessions", () => ({ fetchSessions: async () => [] }));
vi.mock("@/api/tutors", () => ({ fetchTutors: async () => [] }));
vi.mock("@/api/progress", () => ({ fetchVocabulary: async () => vocabulary.items }));

beforeEach(() => {
    resetStores();
    vocabulary.items = [];
});

describe("пустые состояния списков", () => {
    it("«Сессии» без данных показывают объяснение и действие", async () => {
        renderWithProviders(<SessionsPage />);

        expect(
            await screen.findByRole("heading", { name: "Пока нет ни одной сессии" })
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Новая сессия" })).toBeInTheDocument();
    });

    it("«Репетиторы» без данных показывают пустое состояние", async () => {
        renderWithProviders(<TutorsPage />);

        expect(
            await screen.findByRole("heading", { name: "Список репетиторов пуст" })
        ).toBeInTheDocument();
    });

    it("пустой словарь и поиск без совпадений различаются текстом", async () => {
        const user = userEvent.setup();
        vocabulary.items = [WORD];

        renderWithProviders(<VocabularyPage />);

        await screen.findByText("1 слов в коллекции");
        await user.type(screen.getByPlaceholderText("Поиск слова или перевода"), "нет-такого");

        expect(screen.getByText("Ничего не найдено")).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Словарь пока пуст" })
        ).not.toBeInTheDocument();
    });
});
