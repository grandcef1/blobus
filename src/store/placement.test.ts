// ARCHITECT: стор фиксированной сессии и хук шага проверяются вместе: стор держит последовательность банка и
// неизменяемость ответов, хук — загрузку банка, маппинг ответов в форму сервера и мост серверного DTO в
// legacy-результат. Адаптер мокается целиком: транспорт покрыт в src/api/placement.test.ts.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { FIXED_PLACEMENT_QUESTIONS } from "@/api/mocks/placementFixed";
import { usePlacementTest } from "@/hooks/usePlacementTest";
import { usePlacementSession } from "@/store/placement";
import type { PlacementAnswerDto, PlacementResult, PlacementResultDto } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";

// ARCHITECT: адаптер мокается целиком: тесты проверяют поведение шага, а не транспорт.
const { adapter, toastErrorMock } = vi.hoisted(() => ({
    adapter: {
        fetchPlacementQuestions: vi.fn(),
        submitPlacementAnswers: vi.fn(),
        fetchPlacementResultDto: vi.fn(),
        saveResult: vi.fn(),
        saveListeningResult: vi.fn(),
    },
    toastErrorMock: vi.fn(),
}));

vi.mock("@/api/placement", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/placement")>();
    return { ...actual, ...adapter };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

const TOTAL = 30;
const QUESTIONS = FIXED_PLACEMENT_QUESTIONS;
const DTO: PlacementResultDto = { level: "B1", score: 47, createdAt: "2026-12-02T10:00:00.000Z" };
/** Мост, который хук строит из DTO: дорожки равномерны, аудирование пустое до отдельной проверки. */
const BRIDGE: PlacementResult = {
    score: 47,
    overall: "B1",
    grammar: "B1",
    speaking: "B1",
    general: "B1",
    listening: null,
    listeningSkipped: true,
    takenAt: Date.parse(DTO.createdAt),
};

/** Отвечает на весь банк одним и тем же вариантом и ставит курсор на последний вопрос. */
function answerAllThenReachLast(optionIndex: number): void {
    const session = usePlacementSession.getState();

    for (const question of QUESTIONS) session.answer(question.id, question.options[optionIndex].id);

    usePlacementSession.setState({ currentIndex: QUESTIONS.length - 1 });
}

/** Промисы эффектов и отправки разрешаются внутри act: иначе React ругается на обновление вне act. */
async function flush(): Promise<void> {
    await act(async () => undefined);
}

describe("стор фиксированной сессии", () => {
    it("старт кладёт банк, ответ фиксируется один раз, курсор не выходит за банк", () => {
        usePlacementSession.getState().start(false, QUESTIONS);

        const started = usePlacementSession.getState();

        expect(started.phase).toBe("questions");
        expect(started.questions).toHaveLength(TOTAL);
        expect(started.currentIndex).toBe(0);
        expect(started.answers).toEqual({});

        const [first, second] = QUESTIONS;

        usePlacementSession.getState().answer(first.id, first.options[0].id);
        usePlacementSession.getState().answer(first.id, second.options[3].id);

        // ARCHITECT: ответ неизменен после установки: повторный выбор не переписывает его.
        expect(usePlacementSession.getState().answers[first.id]).toBe(first.options[0].id);

        usePlacementSession.getState().goPrev();
        expect(usePlacementSession.getState().currentIndex).toBe(0);

        for (let step = 0; step < TOTAL + 5; step += 1) usePlacementSession.getState().goNext();

        expect(usePlacementSession.getState().currentIndex).toBe(TOTAL - 1);
    });

    it("сброс возвращает сессию в интро и очищает банк", () => {
        usePlacementSession.getState().start(true, QUESTIONS);
        usePlacementSession.getState().reset();

        const state = usePlacementSession.getState();

        expect(state.phase).toBe("intro");
        expect(state.questions).toEqual([]);
        expect(state.includeListening).toBe(false);
        expect(state.currentIndex).toBe(0);
    });

    it("версия 1: migrate сбрасывает адаптивную сессию, повреждённое состояние не восстанавливается", () => {
        const options = usePlacementSession.persist.getOptions();

        expect(options.version).toBe(1);
        // ARCHITECT: состояние v0 (адаптивный движок с trackState) несовместимо с фиксированной формой.
        expect(
            options.migrate?.(
                { phase: "questions", trackState: { grammar: {} }, askedItemIds: ["grammar_a1_1"] },
                0
            )
        ).toMatchObject({ phase: "intro", questions: [], answers: {}, currentIndex: 0 });

        // ARCHITECT: фаза вопросов без загруженного банка — повреждение: шаг возвращается в интро.
        const current = usePlacementSession.getState();
        const corrupt = options.merge?.(
            { phase: "questions", includeListening: false, answers: {}, currentIndex: 3 },
            current
        );

        expect(corrupt?.phase).toBe("intro");
        expect(corrupt?.questions).toEqual([]);
    });
});
describe("хук шага теста", () => {
    let submitted: readonly PlacementAnswerDto[] = [];

    beforeEach(() => {
        usePlacementSession.getState().reset();
        submitted = [];
        adapter.fetchPlacementQuestions.mockResolvedValue([...QUESTIONS]);
        adapter.fetchPlacementResultDto.mockResolvedValue(null);
        adapter.submitPlacementAnswers.mockImplementation(
            async (answers: readonly PlacementAnswerDto[]) => {
                submitted = answers;

                return DTO;
            }
        );
        adapter.saveResult.mockImplementation((result: PlacementResult) => result);
        adapter.saveListeningResult.mockImplementation((level: EnglishLevel) => ({
            ...BRIDGE,
            listening: level,
            listeningSkipped: false,
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        usePlacementSession.getState().reset();
    });

    it("старт грузит банк и переводит шаг в вопросы", async () => {
        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();

        expect(result.current.phase).toBe("intro");
        expect(result.current.total).toBe(0);

        act(() => result.current.startOrResume());
        await flush();

        expect(adapter.fetchPlacementQuestions).toHaveBeenCalledTimes(1);
        expect(result.current.phase).toBe("questions");
        expect(result.current.total).toBe(TOTAL);
        expect(result.current.item?.id).toBe(QUESTIONS[0].id);
        expect(result.current.isLastQuestion).toBe(false);
        expect(result.current.hasProgress).toBe(true);
    });

    it("отказ загрузки банка: тост и шаг остаётся в интро", async () => {
        adapter.fetchPlacementQuestions.mockRejectedValue(new ApiError(500, "HTTP 500"));
        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();

        act(() => result.current.startOrResume());
        await flush();

        expect(toastErrorMock).toHaveBeenCalledWith("Не удалось связаться с сервером теста");
        expect(result.current.phase).toBe("intro");
        expect(result.current.total).toBe(0);
    });

    it("последний вопрос: отправка с маппингом optionId→choice и мост в legacy-результат", async () => {
        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();
        act(() => result.current.startOrResume());
        await flush();

        act(() => answerAllThenReachLast(2));

        expect(result.current.isLastQuestion).toBe(true);

        act(() => result.current.advance());
        await flush();

        // ARCHITECT: маппинг в форму сервера: choice — индекс выбранного варианта, а не его буква.
        expect(submitted).toHaveLength(TOTAL);
        expect(submitted[0]).toEqual({ questionId: QUESTIONS[0].id, choice: 2 });

        expect(adapter.saveResult).toHaveBeenCalledWith(BRIDGE);
        expect(result.current.savedResult).toEqual(BRIDGE);
        expect(result.current.phase).toBe("result");
    });
    it("повторные клики не дублируют отправку", async () => {
        let resolveSubmit: (dto: PlacementResultDto) => void = () => undefined;

        adapter.submitPlacementAnswers.mockImplementation(
            () =>
                new Promise<PlacementResultDto>((resolve) => {
                    resolveSubmit = resolve;
                })
        );

        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();
        act(() => result.current.startOrResume());
        await flush();
        act(() => answerAllThenReachLast(1));

        // ARCHITECT: второй клик приходит, пока запрос в полёте: гард держит его до ответа сервера.
        act(() => result.current.advance());
        act(() => result.current.advance());

        expect(adapter.submitPlacementAnswers).toHaveBeenCalledTimes(1);

        await act(async () => resolveSubmit(DTO));

        // ARCHITECT: после полученного результата отправка тоже не повторяется.
        act(() => result.current.advance());
        await flush();

        expect(adapter.submitPlacementAnswers).toHaveBeenCalledTimes(1);
    });

    it("отказ отправки: тост, попытка остаётся на последнем вопросе", async () => {
        adapter.submitPlacementAnswers.mockRejectedValue(new ApiError(400, "HTTP 400"));
        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();
        act(() => result.current.startOrResume());
        await flush();
        act(() => answerAllThenReachLast(0));

        act(() => result.current.advance());
        await flush();

        expect(toastErrorMock).toHaveBeenCalledWith("Не удалось связаться с сервером теста");
        expect(result.current.phase).toBe("questions");
        expect(result.current.savedResult).toBeNull();
        expect(result.current.isLastQuestion).toBe(true);
    });

    it("аудирование: после отправки фаза listening, finishListening дозаписывает уровень", async () => {
        const { result } = renderHook(() => usePlacementTest(vi.fn()));

        await flush();
        act(() => result.current.toggleListening(true));
        act(() => result.current.startOrResume());
        await flush();
        act(() => answerAllThenReachLast(1));

        act(() => result.current.advance());
        await flush();

        expect(result.current.phase).toBe("listening");

        act(() => result.current.finishListening("B2"));

        expect(adapter.saveListeningResult).toHaveBeenCalledWith("B2");
        expect(result.current.savedResult?.listening).toBe("B2");
        expect(result.current.phase).toBe("result");
    });

    it("готовый результат открывает шаг на итоге, complete отдаёт уровень мастеру", async () => {
        adapter.fetchPlacementResultDto.mockResolvedValue(DTO);
        const onComplete = vi.fn();
        const { result } = renderHook(() => usePlacementTest(onComplete));

        await flush();

        expect(result.current.phase).toBe("result");
        expect(result.current.savedResult).toEqual(BRIDGE);

        act(() => result.current.complete());

        expect(onComplete).toHaveBeenCalledWith("B1");
        expect(usePlacementSession.getState().phase).toBe("intro");
    });
});
