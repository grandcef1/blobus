// ARCHITECT: логика шага теста — состояние сессии, производные значения и переходы между фазами.
// Вынесена из компонента: шаг остаётся разметкой фаз, а правила (что считается последним вопросом,
// когда уходит отправка ответов, когда сессия закрывается) читаются в одном месте.
// ARCHITECT: сама сессия живёт в сторе: мастер перемонтирует шаг при переходах между шагами, и
// локальное состояние уносило бы с собой ответы.
// ARCHITECT: уровень считает сервер (фиксированная форма из 30 вопросов): клиент отправляет ответы и
// показывает то, что вернул сервер — ни балл, ни уровень локально не выводятся.
// ARCHITECT: пройденный тест не предлагается заново: сохранённый результат открывает шаг сразу на
// экране итога, иначе возврат назад по мастеру обнулял бы уже определённый уровень.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    fetchPlacementQuestions,
    fetchPlacementResultDto,
    saveListeningResult,
    saveResult,
    submitPlacementAnswers,
} from "@/api/placement";
import { usePlacementSession } from "@/store/placement";
import type { PlacementPhase } from "@/store/placement";
import { toast } from "@/store/toast";
import type {
    PlacementAnswerDto,
    PlacementItem,
    PlacementResult,
    PlacementResultDto,
} from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";

interface PlacementTestController {
    phase: PlacementPhase;
    savedResult: PlacementResult | null;
    item: PlacementItem | null;
    questionNumber: number;
    total: number;
    selectedOptionId: string | null;
    includeListening: boolean;
    isLastQuestion: boolean;
    /** Есть незаконченная сессия: кнопка описания продолжает её, а не начинает заново. */
    hasProgress: boolean;
    answer: (optionId: string) => void;
    advance: () => void;
    back: () => void;
    startOrResume: () => void;
    toggleListening: (value: boolean) => void;
    finishListening: (level: EnglishLevel) => void;
    /** Выход из сводки: закрывает сессию и отдаёт уровень мастеру. */
    complete: () => void;
}

// ARCHITECT: мост серверного DTO в legacy-результат: дорожки равномерны до Placement 1A, потому что сервер
// отдаёт один уровень на форму, а аудирование считается отдельной проверкой. Серверный результат авторитетен.
function toPlacementResult(dto: PlacementResultDto): PlacementResult {
    return {
        score: dto.score,
        overall: dto.level,
        grammar: dto.level,
        speaking: dto.level,
        general: dto.level,
        listening: null,
        listeningSkipped: true,
        takenAt: Date.parse(dto.createdAt),
    };
}
export function usePlacementTest(
    onComplete: (level: EnglishLevel) => void
): PlacementTestController {
    const { t } = useTranslation("placement");
    const {
        phase: sessionPhase,
        includeListening,
        questions,
        answers,
        currentIndex,
        start,
        answer: storeAnswer,
        goNext,
        goPrev,
        setPhase,
        setIncludeListening,
        reset,
    } = usePlacementSession();

    const [savedResult, setSavedResult] = useState<PlacementResult | null>(null);
    // ARCHITECT: гарды в ref, а не в состоянии: два клика в одном такте не успевают увидеть setState и оба
    // ушли бы в сеть — повторный запрос блокируется сразу.
    const submittingRef = useRef(false);
    const loadingRef = useRef(false);

    // ARCHITECT: при маунте читается только результат: тот же GET отвечает и про пройденный тест, поэтому
    // второй раз банк не запрашиваем — его приносит старт.
    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const dto = await fetchPlacementResultDto();

                if (cancelled || dto === null) return;

                setSavedResult(toPlacementResult(dto));
                setPhase("result");
            } catch {
                // ARCHITECT: сбой чтения не мешает пройти тест: отказ станет виден на отправке ответов.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [setPhase]);

    const total = questions.length;
    const hasProgress = total > 0;
    // ARCHITECT: незаконченная сессия важнее сохранённого результата: она и есть текущий прогресс,
    // поэтому возврат на шаг продолжает тест, а не показывает чужой итог.
    const isTestInProgress = hasProgress && sessionPhase !== "result";
    const phase: PlacementPhase =
        isTestInProgress || savedResult === null ? sessionPhase : "result";

    const current = questions[currentIndex];
    // ARCHITECT: DTO и PlacementItem совпадают по полям, но варианты в DTO readonly — отдаём копию, чтобы
    // потребители (PlacementTestPhase и PlacementQuestion) не могли править банк.
    const item: PlacementItem | null =
        current === undefined ? null : { ...current, options: [...current.options] };
    const questionNumber = currentIndex + 1;
    const selectedOptionId = current === undefined ? null : (answers[current.id] ?? null);
    const isLastQuestion = total > 0 && questionNumber === total;

    /** Ответы в форме сервера: optionId → индекс варианта; неотвеченный вопрос даёт -1 и блокирует отправку. */
    const toAnswerDtos = (): PlacementAnswerDto[] =>
        questions.map((question) => {
            const optionId = answers[question.id];

            return {
                questionId: question.id,
                choice:
                    optionId === undefined
                        ? -1
                        : question.options.findIndex((option) => option.id === optionId),
            };
        });

    // ARCHITECT: отправка одна: пока запрос в полёте или результат уже получен, повторный клик ничего не
    // шлёт — серверный результат всё равно один на пользователя.
    const submit = async (): Promise<PlacementResultDto | null> => {
        if (submittingRef.current || savedResult !== null) return null;

        const payload = toAnswerDtos();

        if (payload.length === 0 || payload.some((entry) => entry.choice < 0)) {
            toast.error(t("test.error"));
            return null;
        }

        submittingRef.current = true;

        try {
            const dto = await submitPlacementAnswers(payload);
            const bridged = toPlacementResult(dto);

            // ARCHITECT: legacy-хранилище обновляется для читателей профиля и уровня новой сессии
            // (useStartSession): серверный результат авторитетен, мост нужен только им.
            saveResult(bridged);
            setSavedResult(bridged);

            return dto;
        } catch {
            // ARCHITECT: отказ оставляет человека на последнем вопросе: отправку можно повторить кнопкой.
            toast.error(t("test.error"));
            return null;
        } finally {
            submittingRef.current = false;
        }
    };

    const handleAdvance = () => {
        if (!isLastQuestion) {
            goNext();
            return;
        }

        void (async () => {
            const dto = await submit();

            if (dto === null) return;

            // ARCHITECT: аудирование идёт сразу после ответов и остаётся локальным до Placement 1A: сервер
            // знает только основной результат.
            if (includeListening) {
                setPhase("listening");
                return;
            }

            setPhase("result");
        })();
    };
    return {
        phase,
        savedResult,
        item,
        questionNumber,
        total,
        selectedOptionId,
        includeListening,
        isLastQuestion,
        hasProgress,
        answer: (optionId) => {
            if (item === null || selectedOptionId !== null) return;
            storeAnswer(item.id, optionId);
        },
        advance: handleAdvance,
        // ARCHITECT: «Назад» внутри теста возвращает к предыдущему вопросу, а на первом — к описанию:
        // ответы остаются, поэтому возврат не стоит повторного прохождения.
        back: () => (currentIndex > 0 ? goPrev() : setPhase("intro")),
        startOrResume: () => {
            if (hasProgress) {
                setPhase("questions");
                return;
            }

            // ARCHITECT: банк приходит с сервера: без него начинать нечем, поэтому отказ показывается тостом,
            // а шаг остаётся в интро — повторить можно той же кнопкой.
            void (async () => {
                if (loadingRef.current) return;

                loadingRef.current = true;

                try {
                    const loaded = await fetchPlacementQuestions();

                    start(includeListening, loaded);
                } catch {
                    toast.error(t("test.error"));
                } finally {
                    loadingRef.current = false;
                }
            })();
        },
        toggleListening: setIncludeListening,
        finishListening: (level) => {
            // ARCHITECT: аудирование остаётся локальным до Placement 1A: уровень дозаписывается в legacy-мост,
            // серверная строка результата при этом не меняется.
            setSavedResult(saveListeningResult(level));
            setPhase("result");
        },
        complete: () => {
            if (savedResult === null) return;
            // ARCHITECT: сессия закрывается на выходе из сводки: вернувшись на шаг позже, пользователь
            // снова увидит итог, а не незаконченный тест.
            reset();
            onComplete(savedResult.overall);
        },
    };
}
