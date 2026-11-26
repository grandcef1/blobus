// ARCHITECT: server-side placement question bank: a professional FIXED form of 30 items, five per CEFR level
// (two grammar + three general). The form is the same for everyone, so the level is measured on one scale and a
// retake cannot pick an easier set. The correct option lives only here and never leaves the server
// (publicQuestions); the score and the level are computed by the server alone — client-supplied score/level are
// rejected outright (16.2).
// ARCHITECT: every item is original: the texts were written for this bank from the CEFR descriptors (Council of
// Europe) in the EF SET presentation style; EF SET, Cambridge and other exam materials are never reproduced. The
// bank is English-only, because the form is shown on every locale and must read as one professional test: no
// Russian hints or options anywhere. Rubric: exactly one correct option out of four, distractors share the part
// of speech and repeat typical learner errors, with no "all/none of the above" and no ambiguity; general covers
// lexis in context, pragmatics and functional language rather than trivia.
// Pure module: no DOM, React or Supabase.

/** Item track: grammar is form and construction, general is lexis in context and functional language. */
export type PlacementSkill = "grammar" | "general";

/** CEFR level: it is also the placement_results.level constraint. */
export type PlacementLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Answer option: the client addresses an option by letter, as before. */
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
    /** Index of the correct option in options: this field never leaves the module. */
    readonly correctIndex: 0 | 1 | 2 | 3;
}

/** User answer: the item id and the index of the chosen option. */
export interface PlacementAnswer {
    readonly questionId: string;
    readonly choice: number;
}

/** Test outcome: a 0-100 score and the CEFR level. */
export interface PlacementScore {
    readonly score: number;
    readonly level: PlacementLevel;
}

/** Item as the client sees it: without correctIndex. */
export interface PlacementQuestionDto {
    readonly id: string;
    readonly skill: PlacementSkill;
    readonly level: PlacementLevel;
    readonly prompt: string;
    readonly options: readonly PlacementOption[];
}

/** Item order: A1 to C2, grammar first inside a level — it is also the order the form is shown in. */
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
        prompt: 'A shop assistant asks: "Can I help you?" You want to look around first. What do you say?',
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
        prompt: "You are looking for water in a shop. Which sign shows where to find it?",
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
        prompt: "You want to ask a stranger for the time. What do you say?",
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
        prompt: "You are in a cafe and want to pay. What do you say to the waiter?",
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
        prompt: 'An announcement at the station says: "The 6:40 train to York is delayed." What does it mean?',
        options: [
            { id: "a", text: "The train is cancelled." },
            { id: "b", text: "The train has already left." },
            { id: "c", text: "The train will leave later." },
            { id: "d", text: "The train arrived early." },
        ],
        correctIndex: 2,
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
        prompt: 'Your manager writes: "Could you look into the invoice issue and get back to me by Wednesday?" What is expected from you?',
        options: [
            { id: "a", text: "To pay the invoice on Wednesday." },
            { id: "b", text: "To remind about the meeting on Wednesday." },
            { id: "c", text: "To forward the email to accounts." },
            { id: "d", text: "To check the problem and reply by Wednesday." },
        ],
        correctIndex: 3,
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
        correctIndex: 1,
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
        prompt: 'A report says: "Sales figures fell short of our forecast." What happened?',
        options: [
            { id: "a", text: "Sales were above the forecast." },
            { id: "b", text: "Sales were below the forecast." },
            { id: "c", text: "The forecast was cancelled." },
            { id: "d", text: "Sales stayed the same." },
        ],
        correctIndex: 1,
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
        correctIndex: 3,
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
        prompt: '"Her remarks were beside the point." What does the speaker mean?',
        options: [
            { id: "a", text: "The remarks were rather harsh." },
            { id: "b", text: "The remarks were off the topic." },
            { id: "c", text: "The remarks were appropriate." },
            { id: "d", text: "The remarks were written down wrongly." },
        ],
        correctIndex: 1,
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
        correctIndex: 1,
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
        prompt: 'A colleague says: "I don\'t want to steal your thunder, but the numbers tell a different story." What is the colleague doing?',
        options: [
            { id: "a", text: "Asking to share the data." },
            { id: "b", text: "Praising your presentation." },
            { id: "c", text: "Changing the subject." },
            { id: "d", text: "Interrupting gently to disagree with the facts." },
        ],
        correctIndex: 3,
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
        correctIndex: 0,
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
        correctIndex: 1,
    },
];

/** Known item ids: the route demands a complete set of answers against this list before any scoring. */
export const QUESTION_IDS: ReadonlySet<string> = new Set(QUESTIONS.map((question) => question.id));

/** Items for the client: a copy without correctIndex and with copied options - the bank is never mutated. */
export function publicQuestions(): readonly PlacementQuestionDto[] {
    return QUESTIONS.map((question) => ({
        id: question.id,
        skill: question.skill,
        level: question.level,
        prompt: question.prompt,
        options: question.options.map((option) => ({ id: option.id, text: option.text })),
    }));
}

// ARCHITECT: 0-100 bands: below 20 is A1, then 20/40/60/75/90 with C2 on top. The list runs from the top band, so
// the first match is the level.
const LEVEL_THRESHOLDS: readonly { readonly min: number; readonly level: PlacementLevel }[] = [
    { min: 90, level: "C2" },
    { min: 75, level: "C1" },
    { min: 60, level: "B2" },
    { min: 40, level: "B1" },
    { min: 20, level: "A2" },
];

/** Level for a score: a pure mapping, checked separately from the route. */
export function levelForScore(score: number): PlacementLevel {
    return LEVEL_THRESHOLDS.find((entry) => score >= entry.min)?.level ?? "A1";
}

// ARCHITECT: scoring is pure and database-free: the score is the share of correct answers among the submitted ones,
// so the answer set itself sets the denominator. An unknown id silently scores nothing here: the route accepts a
// complete set only.
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
