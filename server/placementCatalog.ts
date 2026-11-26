// ARCHITECT: серверный банк заданий теста уровня и его скоринг. Верный ответ живёт только здесь и наружу
// не отдаётся (publicQuestions), а уровень и балл считает исключительно сервер — клиентские score/level не
// принимаются вовсе (§16.2).
// ARCHITECT: задания перенесены 1:1 из клиентского src/api/mocks/placementTest.ts (авторский банк проекта,
// методология подачи — EF SET): id, формулировка, варианты и верный ответ совпадают символ в символ, поэтому
// после перевода клиента на real (C-0d2) вопросы не разъедутся. Модуль чистый: без DOM, React и Supabase.

/** Дорожка задания: те же ярлыки, что в клиентском банке. */
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

/** Порядок заданий задаёт порядок, в котором их видит клиент. */
export const QUESTIONS: readonly PlacementQuestion[] = [
    {
        id: "grammar_a1_1",
        skill: "grammar",
        level: "A1",
        prompt: "She ___ a teacher.",
        options: [
            { id: "a", text: "is" },
            { id: "b", text: "are" },
            { id: "c", text: "am" },
            { id: "d", text: "be" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_a1_2",
        skill: "grammar",
        level: "A1",
        prompt: "There are five ___ in the room.",
        options: [
            { id: "a", text: "child" },
            { id: "b", text: "children" },
            { id: "c", text: "childs" },
            { id: "d", text: "childes" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a1_3",
        skill: "grammar",
        level: "A1",
        prompt: "___ you like coffee?",
        options: [
            { id: "a", text: "Are" },
            { id: "b", text: "Does" },
            { id: "c", text: "Do" },
            { id: "d", text: "Is" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_a1_4",
        skill: "grammar",
        level: "A1",
        prompt: "___ your name?",
        options: [
            { id: "a", text: "What is" },
            { id: "b", text: "What are" },
            { id: "c", text: "How is" },
            { id: "d", text: "Which are" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_a1_5",
        skill: "grammar",
        level: "A1",
        prompt: "He ___ football every Saturday.",
        options: [
            { id: "a", text: "play" },
            { id: "b", text: "plays" },
            { id: "c", text: "playing" },
            { id: "d", text: "is play" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_a1_1",
        skill: "general",
        level: "A1",
        prompt: "Ты встречаешь коллегу в девять утра. Что уместно сказать?",
        options: [
            { id: "a", text: "Good morning." },
            { id: "b", text: "Good night." },
            { id: "c", text: "Goodbye." },
            { id: "d", text: "See you yesterday." },
        ],
        correctIndex: 0,
    },
    {
        id: "general_a1_2",
        skill: "general",
        level: "A1",
        prompt: "Знакомый спрашивает: «How are you?» Какой ответ уместен?",
        options: [
            { id: "a", text: "I am twenty five." },
            { id: "b", text: "I'm fine, thanks." },
            { id: "c", text: "Yes, please." },
            { id: "d", text: "You are welcome." },
        ],
        correctIndex: 1,
    },
    {
        id: "general_a1_3",
        skill: "general",
        level: "A1",
        prompt: "Какое слово близко по значению к big?",
        options: [
            { id: "a", text: "small" },
            { id: "b", text: "short" },
            { id: "c", text: "large" },
            { id: "d", text: "slow" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a1_4",
        skill: "general",
        level: "A1",
        prompt: "Что уместно ответить на «Thank you»?",
        options: [
            { id: "a", text: "Thank you too." },
            { id: "b", text: "You're welcome." },
            { id: "c", text: "Please." },
            { id: "d", text: "Sorry." },
        ],
        correctIndex: 1,
    },
    {
        id: "general_a1_5",
        skill: "general",
        level: "A1",
        prompt: "Какое слово обозначает число?",
        options: [
            { id: "a", text: "apple" },
            { id: "b", text: "Monday" },
            { id: "c", text: "seven" },
            { id: "d", text: "table" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_a2_1",
        skill: "grammar",
        level: "A2",
        prompt: "We ___ to the cinema last Sunday.",
        options: [
            { id: "a", text: "go" },
            { id: "b", text: "went" },
            { id: "c", text: "goes" },
            { id: "d", text: "gone" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a2_2",
        skill: "grammar",
        level: "A2",
        prompt: "She is ___ than her brother.",
        options: [
            { id: "a", text: "tall" },
            { id: "b", text: "taller" },
            { id: "c", text: "tallest" },
            { id: "d", text: "more tall" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a2_3",
        skill: "grammar",
        level: "A2",
        prompt: "I have lived here ___ 2019.",
        options: [
            { id: "a", text: "for" },
            { id: "b", text: "since" },
            { id: "c", text: "from" },
            { id: "d", text: "during" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_a2_4",
        skill: "grammar",
        level: "A2",
        prompt: "There isn't ___ milk in the fridge.",
        options: [
            { id: "a", text: "some" },
            { id: "b", text: "many" },
            { id: "c", text: "a" },
            { id: "d", text: "any" },
        ],
        correctIndex: 3,
    },
    {
        id: "grammar_a2_5",
        skill: "grammar",
        level: "A2",
        prompt: "I'm good ___ maths.",
        options: [
            { id: "a", text: "at" },
            { id: "b", text: "in" },
            { id: "c", text: "on" },
            { id: "d", text: "for" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_a2_1",
        skill: "general",
        level: "A2",
        prompt: "Какая просьба звучит вежливо?",
        options: [
            { id: "a", text: "Open the window." },
            { id: "b", text: "You open the window." },
            { id: "c", text: "Could you open the window, please?" },
            { id: "d", text: "Opening the window." },
        ],
        correctIndex: 2,
    },
    {
        id: "general_a2_2",
        skill: "general",
        level: "A2",
        prompt: "Ты в кафе и хочешь сделать заказ. Как сказать?",
        options: [
            { id: "a", text: "I'd like a coffee, please." },
            { id: "b", text: "Give me coffee." },
            { id: "c", text: "Coffee me." },
            { id: "d", text: "I coffee now." },
        ],
        correctIndex: 0,
    },
    {
        id: "general_a2_3",
        skill: "general",
        level: "A2",
        prompt: "Какая надпись означает, что входить нельзя?",
        options: [
            { id: "a", text: "Push" },
            { id: "b", text: "No entry" },
            { id: "c", text: "Open" },
            { id: "d", text: "Exit" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_a2_4",
        skill: "general",
        level: "A2",
        prompt: "На двери надпись «Out of order». Что это значит?",
        options: [
            { id: "a", text: "не работает" },
            { id: "b", text: "открыто круглосуточно" },
            { id: "c", text: "выход справа" },
            { id: "d", text: "нет свободных мест" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_a2_5",
        skill: "general",
        level: "A2",
        prompt: "Как вежливо спросить дорогу до вокзала?",
        options: [
            { id: "a", text: "Where station?" },
            { id: "b", text: "Give me station." },
            { id: "c", text: "Could you tell me the way to the station?" },
            { id: "d", text: "Station please you." },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_b1_1",
        skill: "grammar",
        level: "B1",
        prompt: "If I ___ more time, I would travel around the world.",
        options: [
            { id: "a", text: "have" },
            { id: "b", text: "had" },
            { id: "c", text: "will have" },
            { id: "d", text: "has" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_b1_2",
        skill: "grammar",
        level: "B1",
        prompt: "The report ___ by the team yesterday.",
        options: [
            { id: "a", text: "was written" },
            { id: "b", text: "wrote" },
            { id: "c", text: "is writing" },
            { id: "d", text: "has written" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_b1_3",
        skill: "grammar",
        level: "B1",
        prompt: "He asked me where I ___ from.",
        options: [
            { id: "a", text: "come" },
            { id: "b", text: "came" },
            { id: "c", text: "am coming" },
            { id: "d", text: "will come" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_b1_4",
        skill: "grammar",
        level: "B1",
        prompt: "I ___ in this city since 2020.",
        options: [
            { id: "a", text: "live" },
            { id: "b", text: "have lived" },
            { id: "c", text: "lived" },
            { id: "d", text: "am living" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_b1_5",
        skill: "grammar",
        level: "B1",
        prompt: "You ___ smoke in the office.",
        options: [
            { id: "a", text: "must" },
            { id: "b", text: "don't have to" },
            { id: "c", text: "must not" },
            { id: "d", text: "could" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_b1_1",
        skill: "general",
        level: "B1",
        prompt: "«I'm afraid I can't make it tonight». Что значит make it?",
        options: [
            { id: "a", text: "прийти, успеть на встречу" },
            { id: "b", text: "приготовить ужин" },
            { id: "c", text: "сделать что-то новое" },
            { id: "d", text: "заработать деньги" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b1_2",
        skill: "general",
        level: "B1",
        prompt: "«I'm really sorry I'm late». Какой ответ принимает извинение?",
        options: [
            { id: "a", text: "You are late." },
            { id: "b", text: "That's all right, it happens." },
            { id: "c", text: "Sorry." },
            { id: "d", text: "I don't care." },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b1_3",
        skill: "general",
        level: "B1",
        prompt: "В письме: «Please find the report attached». Что просит сделать автор?",
        options: [
            { id: "a", text: "посмотреть файл во вложении" },
            { id: "b", text: "найти отчёт в интернете" },
            { id: "c", text: "распечатать письмо" },
            { id: "d", text: "отправить отчёт обратно" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b1_4",
        skill: "general",
        level: "B1",
        prompt: "«Could you give me a hand?» — о чём просят?",
        options: [
            { id: "a", text: "пожать руку" },
            { id: "b", text: "помочь" },
            { id: "c", text: "передать предмет" },
            { id: "d", text: "подсказать время" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b1_5",
        skill: "general",
        level: "B1",
        prompt: "Коллега пишет: «Sorry for the delay in replying». Что он делает?",
        options: [
            { id: "a", text: "извиняется за поздний ответ" },
            { id: "b", text: "напоминает о встрече" },
            { id: "c", text: "просит отсрочку по проекту" },
            { id: "d", text: "отменяет встречу" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_b2_1",
        skill: "grammar",
        level: "B2",
        prompt: "By the time we arrived, the film ___.",
        options: [
            { id: "a", text: "already started" },
            { id: "b", text: "had already started" },
            { id: "c", text: "has already started" },
            { id: "d", text: "already starts" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_b2_2",
        skill: "grammar",
        level: "B2",
        prompt: "She suggested ___ the meeting until Friday.",
        options: [
            { id: "a", text: "to postpone" },
            { id: "b", text: "postpone" },
            { id: "c", text: "postponing" },
            { id: "d", text: "postponed" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_b2_3",
        skill: "grammar",
        level: "B2",
        prompt: "Not only ___ the deadline, but she also improved the process.",
        options: [
            { id: "a", text: "she met" },
            { id: "b", text: "did she meet" },
            { id: "c", text: "she did meet" },
            { id: "d", text: "met she" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_b2_4",
        skill: "grammar",
        level: "B2",
        prompt: "He is the man ___ car was stolen.",
        options: [
            { id: "a", text: "who" },
            { id: "b", text: "which" },
            { id: "c", text: "whose" },
            { id: "d", text: "that" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_b2_5",
        skill: "grammar",
        level: "B2",
        prompt: "I wish I ___ more careful with the figures.",
        options: [
            { id: "a", text: "am" },
            { id: "b", text: "had been" },
            { id: "c", text: "will be" },
            { id: "d", text: "would be" },
        ],
        correctIndex: 1,
    },
    {
        id: "general_b2_1",
        skill: "general",
        level: "B2",
        prompt: "На встрече говорят: «We'll circle back on that». Что это значит?",
        options: [
            { id: "a", text: "вернуться к теме позже" },
            { id: "b", text: "ходить по кругу" },
            { id: "c", text: "отменить проект" },
            { id: "d", text: "отправить письмо" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b2_2",
        skill: "general",
        level: "B2",
        prompt: "Какое слово ближе всего к crucial?",
        options: [
            { id: "a", text: "optional" },
            { id: "b", text: "unclear" },
            { id: "c", text: "essential" },
            { id: "d", text: "ordinary" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_b2_3",
        skill: "general",
        level: "B2",
        prompt: "Руководитель пишет: «Let's touch base next week». Что ожидается?",
        options: [
            { id: "a", text: "короткий разговор о статусе" },
            { id: "b", text: "письменный отчёт" },
            { id: "c", text: "формальная аттестация" },
            { id: "d", text: "новый проект" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b2_4",
        skill: "general",
        level: "B2",
        prompt: "Отчёт «due on Friday». Что это значит?",
        options: [
            { id: "a", text: "его нужно сдать до пятницы" },
            { id: "b", text: "его опубликуют в пятницу" },
            { id: "c", text: "его оплатили в пятницу" },
            { id: "d", text: "его отменили в пятницу" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_b2_5",
        skill: "general",
        level: "B2",
        prompt: "«It's a win-win situation» значит…",
        options: [
            { id: "a", text: "кто-то останется в минусе" },
            { id: "b", text: "обе стороны в выигрыше" },
            { id: "c", text: "ситуация пока неясна" },
            { id: "d", text: "сделка сорвалась" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_1",
        skill: "grammar",
        level: "C1",
        prompt: "Hardly ___ when the storm broke.",
        options: [
            { id: "a", text: "we had arrived" },
            { id: "b", text: "had we arrived" },
            { id: "c", text: "we arrived" },
            { id: "d", text: "did we arrive" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_2",
        skill: "grammar",
        level: "C1",
        prompt: "Were it not for her support, I ___ the course.",
        options: [
            { id: "a", text: "would quit" },
            { id: "b", text: "would have quit" },
            { id: "c", text: "will quit" },
            { id: "d", text: "had quit" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_3",
        skill: "grammar",
        level: "C1",
        prompt: "___ the outcome, the team remained calm.",
        options: [
            { id: "a", text: "However" },
            { id: "b", text: "Whatever" },
            { id: "c", text: "Whenever" },
            { id: "d", text: "Wherever" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_4",
        skill: "grammar",
        level: "C1",
        prompt: "No sooner ___ than the phone rang.",
        options: [
            { id: "a", text: "I had sat down" },
            { id: "b", text: "had I sat down" },
            { id: "c", text: "I sat down" },
            { id: "d", text: "did I sit down" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c1_5",
        skill: "grammar",
        level: "C1",
        prompt: "The proposal is worth ___.",
        options: [
            { id: "a", text: "to consider" },
            { id: "b", text: "consider" },
            { id: "c", text: "considering" },
            { id: "d", text: "considered" },
        ],
        correctIndex: 2,
    },
    {
        id: "general_c1_1",
        skill: "general",
        level: "C1",
        prompt: "«The proposal is a non-starter». Что это значит?",
        options: [
            { id: "a", text: "у неё нет шансов с самого начала" },
            { id: "b", text: "ей не хватает финансирования" },
            { id: "c", text: "её отложили на год" },
            { id: "d", text: "её приняли единогласно" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c1_2",
        skill: "general",
        level: "C1",
        prompt: "Какой вариант — самый дипломатичный способ не согласиться?",
        options: [
            { id: "a", text: "You're wrong." },
            { id: "b", text: "That makes no sense." },
            { id: "c", text: "I see your point, but I'd look at it differently." },
            { id: "d", text: "Nobody agrees with you." },
        ],
        correctIndex: 2,
    },
    {
        id: "general_c1_3",
        skill: "general",
        level: "C1",
        prompt: "Автор пишет, что политика — «a double-edged sword». Что он имеет в виду?",
        options: [
            { id: "a", text: "у неё есть и плюсы, и минусы" },
            { id: "b", text: "она бесполезна" },
            { id: "c", text: "она незаконна" },
            { id: "d", text: "она временная" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c1_4",
        skill: "general",
        level: "C1",
        prompt: "«To play devil's advocate» значит…",
        options: [
            { id: "a", text: "намеренно спорить, проверяя позицию" },
            { id: "b", text: "поддерживать слабую идею" },
            { id: "c", text: "передать вопрос юристу" },
            { id: "d", text: "уклониться от спора" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c1_5",
        skill: "general",
        level: "C1",
        prompt: "«The elephant in the room» — это…",
        options: [
            { id: "a", text: "большой приятный сюрприз" },
            { id: "b", text: "редкий удачный случай" },
            { id: "c", text: "очевидная проблема, о которой молчат" },
            { id: "d", text: "лишняя деталь в отчёте" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_c2_1",
        skill: "grammar",
        level: "C2",
        prompt: "Little ___ that the decision would be reversed.",
        options: [
            { id: "a", text: "they suspected" },
            { id: "b", text: "did they suspect" },
            { id: "c", text: "they did suspect" },
            { id: "d", text: "suspected they" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c2_2",
        skill: "grammar",
        level: "C2",
        prompt: "The committee recommended that the rule ___ amended.",
        options: [
            { id: "a", text: "is" },
            { id: "b", text: "was" },
            { id: "c", text: "be" },
            { id: "d", text: "will be" },
        ],
        correctIndex: 2,
    },
    {
        id: "grammar_c2_3",
        skill: "grammar",
        level: "C2",
        prompt: "Such ___ the demand that tickets sold out in minutes.",
        options: [
            { id: "a", text: "was" },
            { id: "b", text: "were" },
            { id: "c", text: "is" },
            { id: "d", text: "being" },
        ],
        correctIndex: 0,
    },
    {
        id: "grammar_c2_4",
        skill: "grammar",
        level: "C2",
        prompt: "Had it not been for the rain, we ___ earlier.",
        options: [
            { id: "a", text: "would leave" },
            { id: "b", text: "would have left" },
            { id: "c", text: "will leave" },
            { id: "d", text: "left" },
        ],
        correctIndex: 1,
    },
    {
        id: "grammar_c2_5",
        skill: "grammar",
        level: "C2",
        prompt: "___ what may, the project goes ahead.",
        options: [
            { id: "a", text: "Come" },
            { id: "b", text: "Coming" },
            { id: "c", text: "Comes" },
            { id: "d", text: "To come" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c2_1",
        skill: "general",
        level: "C2",
        prompt: "«To hedge one's bets» значит…",
        options: [
            { id: "a", text: "снижать риск, оставляя варианты открытыми" },
            { id: "b", text: "делать двойную ставку" },
            { id: "c", text: "отказываться от решений" },
            { id: "d", text: "действовать решительно" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c2_2",
        skill: "general",
        level: "C2",
        prompt: "Какой вариант выражает наименьшую уверенность?",
        options: [
            { id: "a", text: "We will do it." },
            { id: "b", text: "We are doing it." },
            { id: "c", text: "We have done it." },
            { id: "d", text: "We might consider it at some stage." },
        ],
        correctIndex: 3,
    },
    {
        id: "general_c2_3",
        skill: "general",
        level: "C2",
        prompt: "Критик пишет, что аргумент «not without merit». Критик…",
        options: [
            { id: "a", text: "частично согласен" },
            { id: "b", text: "резко не согласен" },
            { id: "c", text: "не высказывает мнения" },
            { id: "d", text: "полностью хвалит" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c2_4",
        skill: "general",
        level: "C2",
        prompt: "«To muddy the waters» значит…",
        options: [
            { id: "a", text: "запутывать ситуацию" },
            { id: "b", text: "прояснять вопрос" },
            { id: "c", text: "ускорять решение" },
            { id: "d", text: "скрывать свою вину" },
        ],
        correctIndex: 0,
    },
    {
        id: "general_c2_5",
        skill: "general",
        level: "C2",
        prompt: "«I'm not at liberty to say» значит…",
        options: [
            { id: "a", text: "не имею права разглашать" },
            { id: "b", text: "забыл детали" },
            { id: "c", text: "скажу позже" },
            { id: "d", text: "не согласен с решением" },
        ],
        correctIndex: 0,
    },
];

/** Известные id заданий: по этому набору маршрут отклоняет чужие questionId, не доходя до скоринга. */
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
// набор ответов. Неизвестный id здесь молча не засчитывается: маршрут отклоняет такие тела до скоринга.
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
