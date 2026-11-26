// ARCHITECT: серверный банк теста уровня — профессиональная ФИКСИРОВАННАЯ форма из 30 заданий: по пять на
// каждый уровень (два grammar + три general). Форма одна на всех, поэтому уровень считается по общей шкале, а
// пересдача не подбирает удобный набор. Верный ответ живёт только здесь и наружу не отдаётся (publicQuestions),
// балл и уровень считает исключительно сервер — клиентские score/level не принимаются вовсе (§16.2).
// ARCHITECT: задания оригинальные: тексты написаны для этого банка по дескрипторам CEFR (Council of Europe) с
// подачей в стиле EF SET; материалы EF SET, Cambridge и других экзаменов не воспроизводятся. Рубрика: ровно
// один верный вариант из четырёх, дистракторы — та же часть речи и типичные ошибки учащихся, без «all/none of
// the above» и двусмысленности; general — лексика в контексте, прагматика и функциональный язык, не trivia.
// Модуль чистый: без DOM, React и Supabase.

/** Дорожка задания: grammar — форма и конструкция, general — лексика в контексте и функциональный язык. */
export type PlacementSkill = "grammar" | "general";

/** Уровень по CEFR: он же ограничение колонки placement_results.level. */
export type PlacementLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Вариант ответа: клиент адресует вариант по букве, как и раньше. */
export interface PlacementOption {
    readonly id: string;
    readonly text: string;
}

export interface PlacementQuestion {
    readonly id: string;
    readonly skill: PlacementSkill;
    readonly level: PlacementLevel;
    readonly prompt: string;
    readonly options: readonly [PlacementOption, PlacementOption, PlacementOption, PlacementOption];
    /** Индекс верного варианта в options: это поле не покидает модуль. */
    readonly correctIndex: 0 | 1 | 2 | 3;
}

/** Ответ пользователя: id вопроса и индекс выбранного варианта. */
export interface PlacementAnswer {
    readonly questionId: string;
    readonly choice: number;
}

/** Итог теста: балл 0-100 и уровень по CEFR. */
export interface PlacementScore {
    readonly score: number;
    readonly level: PlacementLevel;
}

/** Вопрос в том виде, в каком он уходит клиенту: без correctIndex. */
export interface PlacementQuestionDto {
    readonly id: string;
    readonly skill: PlacementSkill;
    readonly level: PlacementLevel;
    readonly prompt: string;
    readonly options: readonly PlacementOption[];
}

/** Порядок заданий: от A1 к C2, внутри уровня сначала grammar — он же порядок показа формы. */
export const QUESTIONS: readonly PlacementQuestion[] = [
    {
        id: "grammar_a1_1",
        skill: "grammar",
        level: "A1",
        prompt: "Tom ___ a new bicycle.",
        options: [
            { id: "a", text: "have" },
            { id: "b", text: "has" },
            { id: "c", text: "having" },
            { id: "d", text: "is have" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a1_2",
        skill: "grammar",
        level: "A1",
        prompt: "___ your parents at home now?",
        options: [
            { id: "a", text: "Do" },
            { id: "b", text: "Is" },
            { id: "c", text: "Are" },
            { id: "d", text: "Does" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a1_1",
        skill: "general",
        level: "A1",
        prompt: "Продавец спрашивает: «Can I help you?» Ты хочешь посмотреть товар, но пока не решил, что купить. Что ответить?",
        options: [
            { id: "a", text: "Yes, I am fine." },
            { id: "b", text: "Nice to meet you." },
            { id: "c", text: "You're welcome." },
            { id: "d", text: "I'm just looking, thanks." },
        ],
        correctIndex: 3,
    },
    {
        id: "general_a1_2",
        skill: "general",
        level: "A1",
        prompt: "Ты ищешь в магазине воду. Какая вывеска подскажет, где её искать?",
        options: [
            { id: "a", text: "Clothes" },
            { id: "b", text: "Drinks" },
            { id: "c", text: "Shoes" },
            { id: "d", text: "Books" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_a1_3",
        skill: "general",
        level: "A1",
        prompt: "Ты хочешь узнать время у прохожего. Как спросить?",
        options: [
            { id: "a", text: "What is time now you?" },
            { id: "b", text: "Excuse me, what time is it?" },
            { id: "c", text: "How is the time?" },
            { id: "d", text: "Time, please, you?" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a2_1",
        skill: "grammar",
        level: "A2",
        prompt: "Yesterday we ___ dinner at my grandmother's house.",
        options: [
            { id: "a", text: "eat" },
            { id: "b", text: "eaten" },
            { id: "c", text: "ate" },
            { id: "d", text: "eats" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_a2_2",
        skill: "grammar",
        level: "A2",
        prompt: "This bag is ___ than my old one.",
        options: [
            { id: "a", text: "more heavy" },
            { id: "b", text: "heaviest" },
            { id: "c", text: "heavier" },
            { id: "d", text: "heavy" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a2_1",
        skill: "general",
        level: "A2",
        prompt: "Ты в кафе и хочешь попросить счёт. Что сказать официанту?",
        options: [
            { id: "a", text: "Give me money, please." },
            { id: "b", text: "Where is my bill is?" },
            { id: "c", text: "Could we have the bill, please?" },
            { id: "d", text: "I want to pay you now." },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a2_2",
        skill: "general",
        level: "A2",
        prompt: "Объявление на вокзале: «The 6:40 train to York is delayed». Что это значит?",
        options: [
            { id: "a", text: "поезд отменили" },
            { id: "b", text: "поезд уже ушёл" },
            { id: "c", text: "поезд отправится позже" },
            { id: "d", text: "поезд приехал раньше" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a2_3",
        skill: "general",
        level: "A2",
        prompt: "Коллега пишет: «Can you send me the file by Friday?» О чём он просит?",
        options: [
            { id: "a", text: "найти файл в пятницу" },
            { id: "b", text: "прочитать файл после пятницы" },
            { id: "c", text: "удалить файл после пятницы" },
            { id: "d", text: "прислать файл до пятницы" },
        ],
        correctIndex: 3,
    },
    {
        id: "grammar_b1_1",
        skill: "grammar",
        level: "B1",
        prompt: "I haven't seen Daniel ___ we left school.",
        options: [
            { id: "a", text: "for" },
            { id: "b", text: "during" },
            { id: "c", text: "since" },
            { id: "d", text: "from" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_b1_2",
        skill: "grammar",
        level: "B1",
        prompt: "If the weather ___ better tomorrow, we'll walk to the lake.",
        options: [
            { id: "a", text: "will be" },
            { id: "b", text: "is" },
            { id: "c", text: "was" },
            { id: "d", text: "were" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b1_1",
        skill: "general",
        level: "B1",
        prompt: "Руководитель пишет: «Could you look into the invoice issue and get back to me by Wednesday?» Что от тебя ждут?",
        options: [
            { id: "a", text: "оплатить счёт в среду" },
            { id: "b", text: "напомнить о встрече в среду" },
            { id: "c", text: "переслать письмо в бухгалтерию" },
            { id: "d", text: "разобраться в проблеме и ответить до среды" },
        ],
        correctIndex: 3,
    },
    {
        id: "general_b1_2",
        skill: "general",
        level: "B1",
        prompt: "В письме клиенту: «We apologize for the inconvenience and will refund your payment in full». Что сделает компания?",
        options: [
            { id: "a", text: "заменит товар" },
            { id: "b", text: "вернёт деньги полностью" },
            { id: "c", text: "продлит гарантию" },
            { id: "d", text: "предложит скидку" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b1_3",
        skill: "general",
        level: "B1",
        prompt: "Ты не согласен с коллегой и хочешь сказать об этом мягко. Какой вариант уместен?",
        options: [
            { id: "a", text: "No, that's wrong." },
            { id: "b", text: "I don't listen to this." },
            { id: "c", text: "I'm not sure I agree — could you explain that part again?" },
            { id: "d", text: "Everyone knows you are mistaken." },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_b2_1",
        skill: "grammar",
        level: "B2",
        prompt: "The new safety rules ___ to all staff before the inspection.",
        options: [
            { id: "a", text: "explained" },
            { id: "b", text: "were explain" },
            { id: "c", text: "have explaining" },
            { id: "d", text: "were explained" },
        ],
        correctIndex: 3,
    },
    {
        id: "grammar_b2_2",
        skill: "grammar",
        level: "B2",
        prompt: "Our manager asked whether the figures ___ by the end of the week.",
        options: [
            { id: "a", text: "could be finalized" },
            { id: "b", text: "can be finalize" },
            { id: "c", text: "will finalize" },
            { id: "d", text: "have finalizing" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b2_1",
        skill: "general",
        level: "B2",
        prompt: "В отчёте написано: «Sales figures fell short of our forecast». Что произошло?",
        options: [
            { id: "a", text: "продажи превысили прогноз" },
            { id: "b", text: "продажи оказались ниже прогноза" },
            { id: "c", text: "прогноз отменили" },
            { id: "d", text: "продажи остались неизменными" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b2_2",
        skill: "general",
        level: "B2",
        prompt: "Клиент пишет: «I'd appreciate it if you could keep me posted on any changes». О чём он просит?",
        options: [
            { id: "a", text: "отправить ему изменения письмом" },
            { id: "b", text: "не менять условия договора" },
            { id: "c", text: "подписать новые условия" },
            { id: "d", text: "сообщать ему об изменениях" },
        ],
        correctIndex: 3,
    },
    {
        id: "general_b2_3",
        skill: "general",
        level: "B2",
        prompt: "На встрече коллега говорит: «Let's park that idea and come back to it after the launch». Что он предлагает?",
        options: [
            { id: "a", text: "сразу заняться этой идеей" },
            { id: "b", text: "отложить идею и вернуться к ней позже" },
            { id: "c", text: "отправить идею на согласование" },
            { id: "d", text: "исключить идею из плана" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_1",
        skill: "grammar",
        level: "C1",
        prompt: "___ had the guests arrived than the power went out.",
        options: [
            { id: "a", text: "No sooner" },
            { id: "b", text: "Hardly" },
            { id: "c", text: "Scarcely" },
            { id: "d", text: "Whenever" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_c1_2",
        skill: "grammar",
        level: "C1",
        prompt: "The inspectors demanded that the equipment ___ before the next shift.",
        options: [
            { id: "a", text: "is inspected" },
            { id: "b", text: "be inspected" },
            { id: "c", text: "will inspect" },
            { id: "d", text: "inspecting" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_c1_1",
        skill: "general",
        level: "C1",
        prompt: "«Her remarks were beside the point». Что имеет в виду говорящий?",
        options: [
            { id: "a", text: "замечания были резкими" },
            { id: "b", text: "замечания были не по теме" },
            { id: "c", text: "замечания были уместны" },
            { id: "d", text: "замечания записали неверно" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_c1_2",
        skill: "general",
        level: "C1",
        prompt: "Письмо начинается так: «Further to our conversation on Tuesday, I am writing to confirm the terms we discussed». Какой это регистр?",
        options: [
            { id: "a", text: "дружеский разговорный" },
            { id: "b", text: "формальный деловой" },
            { id: "c", text: "научный технический" },
            { id: "d", text: "рекламный публицистический" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_c1_3",
        skill: "general",
        level: "C1",
        prompt: "«I'm not convinced the proposal is worth pursuing». Что говорит человек?",
        options: [
            { id: "a", text: "уверен, что предложение нужно принять" },
            { id: "b", text: "предлагает доработать отчёт" },
            { id: "c", text: "сомневается, стоит ли продолжать" },
            { id: "d", text: "отказывается обсуждать тему" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_c2_1",
        skill: "grammar",
        level: "C2",
        prompt: "___ the funding be withdrawn, the project would have to be suspended.",
        options: [
            { id: "a", text: "Would" },
            { id: "b", text: "Should" },
            { id: "c", text: "Were" },
            { id: "d", text: "Had" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c2_2",
        skill: "grammar",
        level: "C2",
        prompt: "The report is said ___ before the deadline, despite the staffing problems.",
        options: [
            { id: "a", text: "to complete" },
            { id: "b", text: "to be completing" },
            { id: "c", text: "to have completed" },
            { id: "d", text: "to have been completed" },
        ],
        correctIndex: 3,
    },
    {
        id: "general_c2_1",
        skill: "general",
        level: "C2",
        prompt: "Коллега говорит: «I don't want to steal your thunder, but the numbers tell a different story». Что он делает?",
        options: [
            { id: "a", text: "просит поделиться данными" },
            { id: "b", text: "хвалит твою презентацию" },
            { id: "c", text: "меняет тему разговора" },
            { id: "d", text: "мягко перебивает и возражает фактами" },
        ],
        correctIndex: 3,
    },
    {
        id: "general_c2_2",
        skill: "general",
        level: "C2",
        prompt: "«The policy, however well intentioned, has done more harm than good». Какова позиция автора?",
        options: [
            { id: "a", text: "признаёт замысел, но считает последствия вредными" },
            { id: "b", text: "полностью поддерживает политику" },
            { id: "c", text: "считает политику неясной" },
            { id: "d", text: "предлагает отложить политику" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c2_3",
        skill: "general",
        level: "C2",
        prompt: "«The findings are suggestive rather than conclusive». Что утверждает автор?",
        options: [
            { id: "a", text: "результаты окончательно доказаны" },
            { id: "b", text: "результаты намекают на вывод, но не доказывают его" },
            { id: "c", text: "результаты опровергнуты" },
            { id: "d", text: "результаты ещё не собраны" },
        ],
        correctIndex: 1,
    },
];

/** Известные id заданий: по этому набору маршрут требует полный комплект ответов, не доходя до скоринга. */
export const QUESTION_IDS: ReadonlySet<string> = new Set(QUESTIONS.map((question) => question.id));

/** Вопросы для клиента: копия без correctIndex и с копиями вариантов — сам банк править нельзя. */
export function publicQuestions(): readonly PlacementQuestionDto[] {
    return QUESTIONS.map((question) => ({
        id: question.id,
        skill: question.skill,
        level: question.level,
        prompt: question.prompt,
        options: question.options.map((option) => ({ id: option.id, text: option.text })),
    }));
}

// ARCHITECT: полосы шкалы 0-100: ниже 20 — A1, дальше 20/40/60/75/90 и C2 сверху. Список идёт от старшей
// полосы: первая подошедшая и есть уровень.
const LEVEL_THRESHOLDS: readonly { readonly min: number; readonly level: PlacementLevel }[] = [
    { min: 90, level: "C2" },
    { min: 75, level: "C1" },
    { min: 60, level: "B2" },
    { min: 40, level: "B1" },
    { min: 20, level: "A2" },
];

/** Уровень по баллу: чистый переход, поэтому проверяется отдельно от маршрута. */
export function levelForScore(score: number): PlacementLevel {
    return LEVEL_THRESHOLDS.find((entry) => score >= entry.min)?.level ?? "A1";
}

// ARCHITECT: скоринг чистый и без БД: балл — доля верных ответов от отправленных, знаменатель задаёт сам
// набор ответов. Неизвестный id здесь молча не засчитывается: маршрут принимает только полный комплект.
export function computePlacement(answers: readonly PlacementAnswer[]): PlacementScore {
    const byId = new Map(QUESTIONS.map((question) => [question.id, question]));
    let correct = 0;

    for (const answer of answers) {
        const question = byId.get(answer.questionId);

        if (question !== undefined && question.correctIndex === answer.choice) correct += 1;
    }

    const score = answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100);

    return { score, level: levelForScore(score) };
}
