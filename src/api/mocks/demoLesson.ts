// ARCHITECT: сценарий демо-урока. Это не чат и не данные сессии: статичный сценарий, который
// показывает формат работы репетитора — мягкую правку и новую лексику по ходу диалога. Лежит в
// моках, потому что после подключения бэкенда сюда встанет пример из обучающей выборки.

export type DemoStepRole = "assistant" | "user";

export interface DemoCorrection {
    original: string;
    corrected: string;
    rule: string;
    explanation: string;
}

export interface DemoVocabulary {
    word: string;
    translation: string;
    example: string;
}

export interface DemoStep {
    id: string;
    role: DemoStepRole;
    text: string;
    kind: "text" | "correction" | "vocabulary";
    correction?: DemoCorrection;
    vocabulary?: DemoVocabulary;
}

export const DEMO_LESSON: readonly DemoStep[] = [
    {
        id: "demo_step_1",
        role: "assistant",
        text: "Tell me about your weekend. Отвечай на английском — я поправлю ошибки и подскажу лексику.",
        kind: "text",
    },
    {
        id: "demo_step_2",
        role: "user",
        text: "I go to the park with friends and we was playing football.",
        kind: "text",
    },
    {
        id: "demo_step_3",
        role: "assistant",
        text: "Две правки, чтобы звучать естественно.",
        kind: "correction",
        correction: {
            original: "I go … we was playing",
            corrected: "I went … we were playing",
            rule: "Past Simple · to be",
            explanation:
                "Для завершённого действия в прошлом — went. С we используем were, а не was.",
        },
    },
    {
        id: "demo_step_4",
        role: "assistant",
        text: "Полезная фраза из твоего ответа.",
        kind: "vocabulary",
        vocabulary: {
            word: "hang out",
            translation: "проводить время (неформально)",
            example: "I hung out with friends on Saturday.",
        },
    },
    {
        id: "demo_step_5",
        role: "assistant",
        text: "В полноценном уроке диалог продолжается: репетитор задаёт следующий вопрос и подстраивает сложность под твой уровень.",
        kind: "text",
    },
];
