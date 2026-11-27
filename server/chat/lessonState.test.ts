// ARCHITECT: движок урока — чистые функции, поэтому здесь проверяются его правила без сети и стека: границы
// pacing, расписание слов, переходы и потолок, метрики правила, лимиты длины по режимам, сборка карточек и
// викторин сервером, проверка ответа викторины и промпт (в том числе запрет эмодзи).

import { describe, expect, it } from "vitest";

import { pickSeed } from "./lessonCatalog.ts";
import { buildLessonPlan } from "./lessonPlan.ts";
import type { LessonPlan } from "./lessonPlan.ts";
import { buildSystemPrompt } from "./prompt.ts";
import {
    MAX_LESSON_TURNS,
    MONTHLY_TOKEN_BUDGET,
    WORD_LIMITS,
    applyTurn,
    buildLessonState,
    fallbackQuiz,
    fallbackWordCard,
    pacingFor,
    readLessonDocument,
    toWordViews,
    tokensPerTurn,
    turnDirectives,
    turnsLeftFor,
    verifyQuizAnswer,
    wordDeadline,
    wordTarget,
} from "./lessonState.ts";
import type { LessonState, LessonTurnInput } from "./lessonState.ts";
import { TUTORS } from "../tutorCatalog.ts";

const PLAN: LessonPlan = buildLessonPlan({ level: "B1", mode: "speaking", locale: "ru" });

/** Состояние урока на нужном этапе: слова скрыты, остаток ходов задаётся тестом. */
function stateAt(turnsLeft: number, overrides: Partial<LessonState> = {}): LessonState {
    return {
        ...buildLessonState({
            level: "B1",
            mode: "speaking",
            locale: "ru",
            plan: PLAN,
            turnsLeft,
        }),
        ...overrides,
    };
}

/** Ход без ошибок и без ответа викторины: базовый случай для проверки расписаний. */
function turn(overrides: Partial<LessonTurnInput> = {}): LessonTurnInput {
    return {
        message: "I usually walk to work.",
        previousMessage: null,
        hasError: false,
        errorType: null,
        quizCorrect: null,
        introducedWord: null,
        recognizedWord: null,
        producedWord: null,
        pattern: null,
        tokens: 800,
        turnsLeft: 12,
        ...overrides,
    };
}

// ARCHITECT: вариационный селектор вынесен из класса символов: линтер считает комбинированный символ в классе
// опечаткой, хотя в эмодзи он идёт отдельной позицией.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}/u;

describe("pacing", () => {
    it("держит границы режимов: NORMAL при A >= R+4, TIGHT R+1..R+3, FINAL 1..R, LAST при A = 0", () => {
        // Слова не введены (5 штук) и правило не освоено: R = 5 + 2 = 7.
        expect(pacingFor(0, 5, false)).toBe("LAST");
        expect(pacingFor(7, 5, false)).toBe("FINAL");
        expect(pacingFor(8, 5, false)).toBe("TIGHT");
        expect(pacingFor(10, 5, false)).toBe("TIGHT");
        expect(pacingFor(11, 5, false)).toBe("NORMAL");
        // Освоенное правило снимает резерв в два хода: R = 1, поэтому один ход уже FINAL.
        expect(pacingFor(1, 1, true)).toBe("FINAL");
        expect(pacingFor(5, 1, true)).toBe("NORMAL");
    });

    it("остаток ходов — меньшее из дневного лимита и месячного бюджета токенов", () => {
        // Ходов по токенам больше дневного лимита: 300000 / 900 ≈ 333, поэтому ограничивают сообщения.
        expect(turnsLeftFor({ messagesRemaining: 5, tokensMonth: 0, recent: [] })).toBe(4);
        // Оценка = 2000 * 1.2 = 2400: остатка бюджета хватает ровно на один ход.
        expect(tokensPerTurn([{ text: "a", tokens: 2000 }])).toBe(2400);
        expect(
            turnsLeftFor({
                messagesRemaining: 3,
                tokensMonth: MONTHLY_TOKEN_BUDGET - 2400,
                recent: [{ text: "a", tokens: 2000 }],
            })
        ).toBe(1);
        expect(
            turnsLeftFor({ messagesRemaining: 20, tokensMonth: MONTHLY_TOKEN_BUDGET, recent: [] })
        ).toBe(0);
    });

    it("лимиты слов хода выдаются по режиму и предупреждение звучит только при входе в TIGHT и FINAL", () => {
        expect(WORD_LIMITS.NORMAL).toEqual({ first: 40, follow: 50 });
        expect(turnDirectives(stateAt(20), 20).limits).toEqual(WORD_LIMITS.NORMAL);
        expect(turnDirectives(stateAt(8), 8).limits).toEqual(WORD_LIMITS.TIGHT);
        expect(turnDirectives(stateAt(3), 3).limits).toEqual(WORD_LIMITS.FINAL);
        expect(turnDirectives(stateAt(0), 0).limits).toEqual(WORD_LIMITS.LAST);

        // Вход в режим считается по прошлому ходу: в NORMAL предупреждения нет, в TIGHT и FINAL оно одно.
        const normal = { ...stateAt(20), pacing_mode: "NORMAL" as const };

        expect(turnDirectives(normal, 8).warning).toBe(true);
        expect(turnDirectives({ ...normal, pacing_mode: "TIGHT" }, 8).warning).toBe(false);
        expect(turnDirectives({ ...normal, pacing_mode: "TIGHT" }, 3).warning).toBe(true);
        expect(turnDirectives(stateAt(20), 20).warning).toBe(false);
    });
});

describe("расписание слов", () => {
    it("слово k не позже хода 2k, пятое — к девятому ходу", () => {
        expect([1, 2, 3, 4, 5].map(wordDeadline)).toEqual([2, 4, 6, 8, 9]);
        expect([1, 2, 3, 4, 5].map(wordTarget)).toEqual([1, 3, 5, 7, 9]);
    });

    it("все пять слов вводятся по расписанию: при ошибке слово переносится, но не позже дедлайна", () => {
        let state = stateAt(12);

        for (let index = 0; index < 9; index += 1) {
            const directives = turnDirectives(state, 12 - index);
            // ARCHITECT: ходы 2, 4 и 6 идут с ошибкой по правилу: слово на них вводится только по дедлайну.
            const hasError = index % 2 === 1 && index < 6;

            state = applyTurn(
                state,
                turn({
                    message: `Sentence number ${index}.`,
                    hasError,
                    errorType: hasError ? "form" : null,
                    introducedWord: directives.nextWord === null ? null : directives.nextWord.word,
                    turnsLeft: 12 - index,
                })
            );
        }

        expect(state.words.map((word) => word.status)).toEqual([
            "introduced",
            "introduced",
            "introduced",
            "introduced",
            "introduced",
        ]);
        // Расписание выполнено: следующего слова уже нет.
        expect(turnDirectives(state, 1).nextWord).toBeNull();
    });

    it("сиды исключаются по последним урокам", () => {
        const first = pickSeed(0, []);
        const second = pickSeed(0, [first.id]);
        const third = pickSeed(0, [first.id, second.id]);

        expect(second.id).not.toBe(first.id);
        expect(third.id).not.toBe(first.id);
        expect(third.id).not.toBe(second.id);
    });

    it("статусы двигаются только вперёд: узнанное и употреблённое не возвращается", () => {
        let state = stateAt(12);
        const first = state.words[0]?.word ?? "";

        state = applyTurn(state, turn({ introducedWord: first }));
        state = applyTurn(state, turn({ recognizedWord: first, quizCorrect: true }));
        state = applyTurn(state, turn({ introducedWord: first }));

        expect(state.words[0]?.status).toBe("recognized");

        state = applyTurn(state, turn({ producedWord: first }));
        state = applyTurn(state, turn({ recognizedWord: first }));

        expect(state.words[0]?.status).toBe("produced");
    });

    it("блок слов итогового хода отдаёт слово, значение и статус", () => {
        const views = toWordViews(stateAt(3));

        expect(views).toHaveLength(5);
        expect(views[0]?.word).toBe(PLAN.targetWords[0]);
        expect(views[0]?.status).toBe("hidden");
        // Пример английской речи в блок не уходит: клиенту нужны слово, значение и статус.
        expect(JSON.stringify(views)).not.toContain('"example"');
    });
});

describe("этапы урока", () => {
    it("идёт S1 → S2 → S3 и не тратит ходы впустую", () => {
        let state = stateAt(20);

        state = applyTurn(state, turn({ message: "First sentence is here.", turnsLeft: 19 }));
        expect(state.stage).toBe("S2");
        state = applyTurn(state, turn({ message: "Second sentence is here.", turnsLeft: 18 }));
        expect(state.stage).toBe("S2");
        state = applyTurn(state, turn({ message: "Third sentence is here.", turnsLeft: 17 }));
        expect(state.stage).toBe("S3");
    });

    it("уходит в S5, когда правило освоено и все слова введены", () => {
        const ready = stateAt(20, {
            stage: "S3",
            turn_index: 5,
            words: stateAt(20).words.map((word) => ({ ...word, status: "introduced" as const })),
            rule: { correct_total: 3, correct_streak: 1, mastered: false, open_error: null },
        });
        const next = applyTurn(
            ready,
            turn({ message: "Another sentence is here.", turnsLeft: 19 })
        );

        expect(next.rule.mastered).toBe(true);
        expect(next.stage).toBe("S5");
    });

    it("S5 уходит в итог после двух верных проверок, а нулевой остаток отправляет в итог сразу", () => {
        const review = stateAt(2, {
            stage: "S5",
            words: stateAt(2).words.map((word) => ({ ...word, status: "introduced" as const })),
        });
        const one = applyTurn(review, turn({ quizCorrect: true, turnsLeft: 2 }));

        expect(one.checks_done).toBe(1);
        expect(one.stage).toBe("S5");

        const two = applyTurn(one, turn({ quizCorrect: true, turnsLeft: 2 }));

        expect(two.stage).toBe("S6");
        expect(applyTurn(stateAt(20), turn({ turnsLeft: 0 })).stage).toBe("S6");
    });

    it("жёсткий потолок 18 ходов отправляет урок в итог и задаёт LAST", () => {
        let state = stateAt(40);

        for (let index = 0; index < MAX_LESSON_TURNS; index += 1)
            state = applyTurn(
                state,
                turn({ message: `Sentence number ${index} is here.`, turnsLeft: 40 - index })
            );

        expect(state.turn_index).toBe(MAX_LESSON_TURNS);
        expect(state.stage).toBe("S6");
        expect(state.pacing_mode).toBe("LAST");
        expect(turnDirectives(state, 22).wrap).toBe(true);
    });
});

describe("метрики правила", () => {
    it("верное в другом предложении считается, повтор той же фразы — нет", () => {
        const once = applyTurn(stateAt(20), turn({ message: "I go to work by bus." }));

        expect(once.rule.correct_total).toBe(1);

        const repeat = applyTurn(
            once,
            turn({ message: "I go to work by bus.", previousMessage: "I go to work by bus." })
        );

        expect(repeat.rule.correct_total).toBe(1);

        const other = applyTurn(
            once,
            turn({ message: "She reads books at night.", previousMessage: "I go to work by bus." })
        );

        expect(other.rule.correct_total).toBe(2);
        expect(other.rule.correct_streak).toBe(2);
    });

    it("провал викторины не считается верным ходом, а правило осваивается по четырём верным", () => {
        const failed = applyTurn(stateAt(20), turn({ quizCorrect: false }));

        expect(failed.rule.correct_total).toBe(0);
        expect(failed.rule.correct_streak).toBe(0);

        let state = stateAt(20);

        for (let index = 0; index < 4; index += 1)
            state = applyTurn(state, turn({ message: `Sentence number ${index} is here.` }));

        expect(state.rule.correct_total).toBe(4);
        expect(state.rule.mastered).toBe(true);
    });

    it("третья повторная ошибка помечает паттерн слабым и возвращает урок в проверку", () => {
        let state = stateAt(20);

        for (let index = 0; index < 3; index += 1)
            state = applyTurn(
                state,
                turn({
                    message: `Wrong sentence number ${index} is here.`,
                    hasError: true,
                    errorType: "tense",
                    pattern: "Present Simple",
                })
            );

        expect(state.rule.open_error).toEqual({ type: "tense", count: 3 });
        expect(state.stage).toBe("S4");
        expect(state.weak_patterns).toEqual(["Present Simple"]);

        // Другая ошибка сбрасывает счётчик повторов: слабым помечается именно повторяющийся паттерн.
        const other = applyTurn(
            state,
            turn({
                message: "Another wrong sentence is here.",
                hasError: true,
                errorType: "order",
                pattern: "word order",
            })
        );

        expect(other.rule.open_error).toEqual({ type: "order", count: 1 });
    });
});

describe("викторины", () => {
    const practice = stateAt(20, { stage: "S3", turn_index: 2 });

    it("обязательны не реже двух ходов из трёх, всегда после ошибки и никогда в WRAP", () => {
        // Каждый третий ход идёт без викторины: за десять ходов их не меньше шести.
        expect(turnDirectives({ ...practice, turn_index: 0 }, 20).quizRequired).toBe(true);
        expect(turnDirectives({ ...practice, turn_index: 1 }, 19).quizRequired).toBe(true);
        expect(turnDirectives({ ...practice, turn_index: 2 }, 18).quizRequired).toBe(false);
        expect(turnDirectives(stateAt(20), 20).quizRequired).toBe(false);
        expect(turnDirectives(stateAt(0), 0).quizRequired).toBe(false);

        const broken = {
            ...practice,
            turn_index: 2,
            rule: { ...practice.rule, open_error: { type: "form" as const, count: 1 } },
        };

        expect(turnDirectives(broken, 18).quizRequired).toBe(true);
    });

    it("тип викторины берётся по виду ошибки, а третий повтор заменяется ротацией", () => {
        const mapped = (errorType: "tense" | "form" | "order"): string =>
            applyTurn(
                practice,
                turn({ message: `Wrong sentence about ${errorType}.`, hasError: true, errorType })
            ).next_activity_type;

        expect(mapped("tense")).toBe("choice");
        expect(mapped("form")).toBe("gap-fill");
        expect(mapped("order")).toBe("word-order");

        let state = practice;
        const types: string[] = [];

        for (let index = 0; index < 3; index += 1) {
            state = applyTurn(
                state,
                turn({
                    message: `Wrong sentence ${index} here.`,
                    hasError: true,
                    errorType: "tense",
                })
            );
            types.push(state.next_activity_type);
        }

        // Один тип не идёт три хода подряд: третий повтор заменён следующим в ротации.
        expect(types).toEqual(["choice", "choice", "gap-fill"]);
    });

    it("после трёх верных подряд просит собственное предложение, а проверка берёт тип из ротации", () => {
        let state = stateAt(20);

        for (let index = 0; index < 3; index += 1)
            state = applyTurn(state, turn({ message: `Sentence number ${index} is here.` }));

        expect(state.next_activity_type).toBe("sentence");

        const directives = turnDirectives(state, 17);

        expect(directives.activityType).toBe("sentence");
        expect(directives.quizType).not.toBe("sentence");
    });
});

describe("проверка ответа викторины сервером", () => {
    it("сверяет выбор, пропуск и порядок слов по сохранённому верному ответу", () => {
        const choice = {
            type: "choice" as const,
            prompt: "Pick one",
            options: [
                { id: "a", text: "go" },
                { id: "b", text: "went" },
            ],
            answerId: "b",
        };

        expect(verifyQuizAnswer(choice, "b")).toBe(true);
        expect(verifyQuizAnswer(choice, "a")).toBe(false);
        expect(
            verifyQuizAnswer(
                { type: "gap-fill", prompt: "No ___ needed.", answer: "went" },
                " Went "
            )
        ).toBe(true);
        expect(
            verifyQuizAnswer({ type: "gap-fill", prompt: "No ___ needed.", answer: "went" }, "go")
        ).toBe(false);
        expect(
            verifyQuizAnswer(
                {
                    type: "word-order",
                    prompt: "Put in order",
                    words: ["home", "went", "I"],
                    answer: "I went home",
                },
                "i WENT home."
            )
        ).toBe(true);
        // Проверять нечего: викторины в прошлом ходу не было.
        expect(verifyQuizAnswer(null, "b")).toBeNull();
    });
});

describe("fallback сервера", () => {
    it("карточка слова собирается из состояния урока", () => {
        const word = stateAt(20).words[2];
        const card = word === undefined ? null : fallbackWordCard(word);

        expect(card).toEqual({
            term: word?.word,
            translation: word?.meaning,
            context: word?.example,
        });
    });

    it("викторина собирается сама: пропуск, выбор и порядок слов, без эмодзи", () => {
        const state = { ...stateAt(20), turn_index: 1 };
        const word = state.words[0];

        expect(word).toBeDefined();

        if (word === undefined) return;

        const gap = fallbackQuiz(state, word, "gap-fill");
        const choice = fallbackQuiz(state, word, "choice");
        const order = fallbackQuiz(state, word, "word-order");

        expect(gap).toMatchObject({ type: "gap-fill", answer: word.word });
        expect(order).toMatchObject({ type: "word-order", answer: word.example });

        if (choice?.type !== "choice") throw new Error("ожидался выбор");

        // Верный вариант стоит не первым: место задаёт номер хода, а не порядок слов в плане.
        expect(choice.answerId).toBe("b");
        expect(choice.options[1]?.text).toBe(word.word);
        expect(choice.options.find((option) => option.id === choice.answerId)?.text).toBe(
            word.word
        );
        expect(EMOJI.test(JSON.stringify([gap, choice, order]))).toBe(false);
    });
});

describe("документ урока", () => {
    it("читает состояние из документа и терпит старую плоскую форму плана", () => {
        const state = stateAt(20);

        expect(readLessonDocument({ plan: PLAN, state })?.state).toEqual(state);

        // ARCHITECT: строку, записанную приветствием, читаем как план без состояния: прогресс не теряется.
        const legacy = readLessonDocument(PLAN);

        expect(legacy?.plan).toEqual(PLAN);
        expect(legacy?.state).toBeNull();
        expect(readLessonDocument({ plan: PLAN, extra: 1 })).toBeNull();
        expect(readLessonDocument(null)).toBeNull();
    });
});

describe("промпт", () => {
    function promptFor(lesson: Parameters<typeof buildSystemPrompt>[0]["lesson"]): string {
        return buildSystemPrompt({
            tutor: TUTORS[0],
            mode: "speaking",
            level: "B1",
            explanationLocale: "ru",
            autoCorrection: true,
            history: [],
            message: "Hello",
            plan: PLAN,
            activity: "quick-choice",
            perk: null,
            lesson,
            turn: { phase: "awaiting_user", task: null, cyrillic: false, start: false },
        });
    }

    it("несёт LESSON_STATE, лимиты хода и запрет эмодзи", () => {
        const prompt = promptFor(turnDirectives(stateAt(3), 3));

        // S0 — служебный старт: первый ход урока всегда крючок S1.
        expect(prompt).toContain("LESSON_STATE: stage=S1");
        expect(prompt).toContain(`до ${WORD_LIMITS.FINAL.first} слов`);
        expect(prompt).toContain("2-6 слов");
        expect(prompt).toContain("эмодзи запрещены");
        // Раскрытия слова урока на первом ходу нет: оно живёт только в описании фишки последнего хода.
        expect(prompt).not.toContain("назови слово урока");
        expect(EMOJI.test(prompt)).toBe(false);
    });

    it("на обязательной проверке называет тип викторины, а на итоговом ходу просит подводку", () => {
        const practice = promptFor(turnDirectives(stateAt(20, { stage: "S3", turn_index: 1 }), 19));

        expect(practice).toContain("обязан нести викторину типа");

        const wrap = promptFor(turnDirectives(stateAt(0), 0));

        expect(wrap).toContain("последний ход урока");
        expect(wrap).toContain("вопросов не задавай");
    });
});
