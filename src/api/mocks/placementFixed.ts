// ARCHITECT: фикстура серверного банка теста уровня для мок-режима: те же 30 вопросов и те же полосы, что в
// server/placementCatalog.ts, поэтому до переключения UI на real (C-0d3b) мок-поток оценивает уровень так же,
// как сервер. Публичная форма вопросов верного ответа не содержит: он лежит отдельной картой ниже.
// ARCHITECT: ключ мока попадает в бандл, как и текущий мок-банк; серверный скоринг авторитетен, риск — только
// самооценка пользователя в мок-режиме.

import type { EnglishLevel } from "@/types/onboarding";
import type { PlacementAnswerDto, PlacementQuestionDto } from "@/types/placement";

/** Форма теста: порядок и тексты — как в серверном банке (A1..C2, внутри уровня сначала grammar). */
export const FIXED_PLACEMENT_QUESTIONS: readonly PlacementQuestionDto[] = [
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
    },
    {
        id: "general_a1_1",
        skill: "general",
        level: "A1",
        prompt: 'A shop assistant asks: "Can I help you?" You want to look around first. What do you say?',
        options: [
            { id: "a", text: "Yes, I am fine." },
            { id: "b", text: "Nice to meet you." },
            { id: "c", text: "You're welcome." },
            { id: "d", text: "I'm just looking, thanks." },
        ],
    },
    {
        id: "general_a1_2",
        skill: "general",
        level: "A1",
        prompt: "You are looking for water in a shop. Which sign shows where to find it?",
        options: [
            { id: "a", text: "Clothes" },
            { id: "b", text: "Drinks" },
            { id: "c", text: "Shoes" },
            { id: "d", text: "Books" },
        ],
    },
    {
        id: "general_a1_3",
        skill: "general",
        level: "A1",
        prompt: "You want to ask a stranger for the time. What do you say?",
        options: [
            { id: "a", text: "What is time now you?" },
            { id: "b", text: "Excuse me, what time is it?" },
            { id: "c", text: "How is the time?" },
            { id: "d", text: "Time, please, you?" },
        ],
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
    },
    {
        id: "general_a2_1",
        skill: "general",
        level: "A2",
        prompt: "You are in a cafe and want to pay. What do you say to the waiter?",
        options: [
            { id: "a", text: "Give me money, please." },
            { id: "b", text: "Where is my bill is?" },
            { id: "c", text: "Could we have the bill, please?" },
            { id: "d", text: "I want to pay you now." },
        ],
    },
    {
        id: "general_a2_2",
        skill: "general",
        level: "A2",
        prompt: 'An announcement at the station says: "The 6:40 train to York is delayed." What does it mean?',
        options: [
            { id: "a", text: "The train is cancelled." },
            { id: "b", text: "The train has already left." },
            { id: "c", text: "The train will leave later." },
            { id: "d", text: "The train arrived early." },
        ],
    },
    {
        id: "general_a2_3",
        skill: "general",
        level: "A2",
        prompt: 'A colleague writes: "Can you send me the file by Friday?" What is the colleague asking for?',
        options: [
            { id: "a", text: "To open the file on Friday." },
            { id: "b", text: "To read the file after Friday." },
            { id: "c", text: "To delete the file after Friday." },
            { id: "d", text: "To send the file before Friday." },
        ],
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
    },
    {
        id: "general_b1_1",
        skill: "general",
        level: "B1",
        prompt: 'Your manager writes: "Could you look into the invoice issue and get back to me by Wednesday?" What is expected from you?',
        options: [
            { id: "a", text: "To pay the invoice on Wednesday." },
            { id: "b", text: "To remind about the meeting on Wednesday." },
            { id: "c", text: "To forward the email to accounts." },
            { id: "d", text: "To check the problem and reply by Wednesday." },
        ],
    },
    {
        id: "general_b1_2",
        skill: "general",
        level: "B1",
        prompt: 'A letter to a customer says: "We apologize for the inconvenience and will refund your payment in full." What will the company do?',
        options: [
            { id: "a", text: "Replace the goods." },
            { id: "b", text: "Refund the money in full." },
            { id: "c", text: "Extend the guarantee." },
            { id: "d", text: "Offer a discount." },
        ],
    },
    {
        id: "general_b1_3",
        skill: "general",
        level: "B1",
        prompt: "You disagree with a colleague and want to say it politely. Which option is appropriate?",
        options: [
            { id: "a", text: "No, that's wrong." },
            { id: "b", text: "I don't listen to this." },
            { id: "c", text: "I'm not sure I agree — could you explain that part again?" },
            { id: "d", text: "Everyone knows you are mistaken." },
        ],
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
    },
    {
        id: "general_b2_1",
        skill: "general",
        level: "B2",
        prompt: 'A report says: "Sales figures fell short of our forecast." What happened?',
        options: [
            { id: "a", text: "Sales were above the forecast." },
            { id: "b", text: "Sales were below the forecast." },
            { id: "c", text: "The forecast was cancelled." },
            { id: "d", text: "Sales stayed the same." },
        ],
    },
    {
        id: "general_b2_2",
        skill: "general",
        level: "B2",
        prompt: 'A client writes: "I\'d appreciate it if you could keep me posted on any changes." What is the client asking for?',
        options: [
            { id: "a", text: "A written summary of the changes." },
            { id: "b", text: "No changes to the contract." },
            { id: "c", text: "To sign the new terms." },
            { id: "d", text: "Updates about any changes." },
        ],
    },
    {
        id: "general_b2_3",
        skill: "general",
        level: "B2",
        prompt: 'In a meeting a colleague says: "Let\'s park that idea and come back to it after the launch." What does the colleague suggest?',
        options: [
            { id: "a", text: "Dealing with the idea right now." },
            { id: "b", text: "Putting the idea aside until later." },
            { id: "c", text: "Sending the idea for approval." },
            { id: "d", text: "Dropping the idea from the plan." },
        ],
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
    },
    {
        id: "general_c1_1",
        skill: "general",
        level: "C1",
        prompt: '"Her remarks were beside the point." What does the speaker mean?',
        options: [
            { id: "a", text: "The remarks were rather harsh." },
            { id: "b", text: "The remarks were off the topic." },
            { id: "c", text: "The remarks were appropriate." },
            { id: "d", text: "The remarks were written down wrongly." },
        ],
    },
    {
        id: "general_c1_2",
        skill: "general",
        level: "C1",
        prompt: 'A letter begins: "Further to our conversation on Tuesday, I am writing to confirm the terms we discussed." What is the register of the letter?',
        options: [
            { id: "a", text: "Friendly and conversational." },
            { id: "b", text: "Formal and businesslike." },
            { id: "c", text: "Scientific and technical." },
            { id: "d", text: "Promotional and journalistic." },
        ],
    },
    {
        id: "general_c1_3",
        skill: "general",
        level: "C1",
        prompt: '"I\'m not convinced the proposal is worth pursuing." What is the speaker saying?',
        options: [
            { id: "a", text: "The proposal should definitely be accepted." },
            { id: "b", text: "The report needs more work." },
            { id: "c", text: "It is doubtful whether to go ahead." },
            { id: "d", text: "The topic is closed for discussion." },
        ],
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
    },
    {
        id: "general_c2_1",
        skill: "general",
        level: "C2",
        prompt: 'A colleague says: "I don\'t want to steal your thunder, but the numbers tell a different story." What is the colleague doing?',
        options: [
            { id: "a", text: "Asking to share the data." },
            { id: "b", text: "Praising your presentation." },
            { id: "c", text: "Changing the subject." },
            { id: "d", text: "Interrupting gently to disagree with the facts." },
        ],
    },
    {
        id: "general_c2_2",
        skill: "general",
        level: "C2",
        prompt: '"The policy, however well intentioned, has done more harm than good." What is the author\'s position?',
        options: [
            { id: "a", text: "The intention is acknowledged, but the effects are judged harmful." },
            { id: "b", text: "The policy is fully supported." },
            { id: "c", text: "The policy is seen as unclear." },
            { id: "d", text: "The policy should be postponed." },
        ],
    },
    {
        id: "general_c2_3",
        skill: "general",
        level: "C2",
        prompt: '"The findings are suggestive rather than conclusive." What does the author state?',
        options: [
            { id: "a", text: "The results are finally proven." },
            { id: "b", text: "The results hint at a conclusion without proving it." },
            { id: "c", text: "The results have been refuted." },
            { id: "d", text: "The results have not been collected yet." },
        ],
    },
];

/** Верный вариант каждого задания — индекс в options (0..3). Серверный аналог: правильный ответ в банке. */
export const FIXED_PLACEMENT_KEY: Readonly<Record<string, number>> = {
    grammar_a1_1: 1,
    grammar_a1_2: 2,
    general_a1_1: 3,
    general_a1_2: 1,
    general_a1_3: 1,
    grammar_a2_1: 2,
    grammar_a2_2: 2,
    general_a2_1: 2,
    general_a2_2: 2,
    general_a2_3: 3,
    grammar_b1_1: 2,
    grammar_b1_2: 1,
    general_b1_1: 3,
    general_b1_2: 1,
    general_b1_3: 2,
    grammar_b2_1: 3,
    grammar_b2_2: 0,
    general_b2_1: 1,
    general_b2_2: 3,
    general_b2_3: 1,
    grammar_c1_1: 0,
    grammar_c1_2: 1,
    general_c1_1: 1,
    general_c1_2: 1,
    general_c1_3: 2,
    grammar_c2_1: 1,
    grammar_c2_2: 3,
    general_c2_1: 3,
    general_c2_2: 0,
    general_c2_3: 1,
};

/** Полосы шкалы 0-100: те же границы, что в server/placementCatalog.ts. */
export const FIXED_PLACEMENT_LEVEL_BANDS: readonly {
    readonly min: number;
    readonly level: EnglishLevel;
}[] = [
    { min: 90, level: "C2" },
    { min: 75, level: "C1" },
    { min: 60, level: "B2" },
    { min: 40, level: "B1" },
    { min: 20, level: "A2" },
];

/** Уровень по баллу: та же полоса, что у серверного levelForScore. */
export function levelForFixedScore(score: number): EnglishLevel {
    return FIXED_PLACEMENT_LEVEL_BANDS.find((entry) => score >= entry.min)?.level ?? "A1";
}

// ARCHITECT: скоринг фикстуры повторяет серверный computePlacement: доля верных ответов от отправленных, а
// неизвестный id молча не засчитывается — как на сервере до проверки полного комплекта.
export function scoreFixedPlacement(answers: readonly PlacementAnswerDto[]): {
    readonly score: number;
    readonly level: EnglishLevel;
} {
    const correct = answers.filter(
        (answer) => FIXED_PLACEMENT_KEY[answer.questionId] === answer.choice
    ).length;
    const score = answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100);

    return { score, level: levelForFixedScore(score) };
}
