// ARCHITECT: демо-урок лендинга — те же сущности, что у обычного чата: сессия и сообщения. Окно
// примера рендерит те же компоненты (MessageRenderer), поэтому формат правки и карточек в демо
// не может разойтись с приложением. Лежит в моках: после подключения бэкенда сюда встанет
// пример из обучающей выборки.

import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";

const DEMO_SESSION_ID = "demo";
const now = Date.now();

export const DEMO_SESSION: EnhancedChatSession = {
    id: DEMO_SESSION_ID,
    userId: "demo",
    title: "Пример урока",
    createdAt: now - 300000,
    repetitorId: "max",
    learningMode: "general",
    targetLevel: "B1",
    // ARCHITECT: прогресс в примере — заглушка: шапка демо не показывает бейдж (readOnly),
    // но поле обязательное по типу сессии.
    progress: { completedLessons: 0, totalLessons: 8, wordsLearned: 0, streakDays: 0 },
    lastActivityAt: now,
    messages: [],
};

export const DEMO_MESSAGES: EnhancedMessage[] = [
    {
        id: "demo_msg_1",
        sessionId: DEMO_SESSION_ID,
        role: "assistant",
        content:
            "Tell me about your weekend. Отвечай на английском — я поправлю ошибки и подскажу лексику.",
        timestamp: now - 300000,
        type: "text",
    },
    {
        id: "demo_msg_2",
        sessionId: DEMO_SESSION_ID,
        role: "user",
        content: "I go to the park with friends and we was playing football.",
        timestamp: now - 280000,
        type: "text",
    },
    {
        id: "demo_msg_3",
        sessionId: DEMO_SESSION_ID,
        role: "assistant",
        content: "Две правки, чтобы звучать естественно.",
        timestamp: now - 260000,
        type: "correction",
        metadata: {
            correction: {
                originalText: "I go to the park with friends and we was playing football.",
                correctedText: "I went to the park with friends and we were playing football.",
                originalSegments: [
                    { text: "I " },
                    { text: "go", changed: true },
                    { text: " to the park with friends and we " },
                    { text: "was", changed: true },
                    { text: " playing football." },
                ],
                correctedSegments: [
                    { text: "I " },
                    { text: "went", changed: true },
                    { text: " to the park with friends and we " },
                    { text: "were", changed: true },
                    { text: " playing football." },
                ],
                explanation:
                    "Для завершённого действия в прошлом — went. С we используем were, а не was.",
                ruleName: "Past Simple · to be",
                examples: [
                    "Yesterday we were at the park until the evening.",
                    "I went home after the match.",
                ],
                severity: "moderate",
            },
        },
    },
    {
        id: "demo_msg_4",
        sessionId: DEMO_SESSION_ID,
        role: "assistant",
        content: "Полезная фраза из твоего ответа.",
        timestamp: now - 240000,
        type: "vocabulary-card",
        metadata: {
            vocabularyCard: {
                word: "hang out",
                translation: "проводить время (неформально)",
                pronunciation: "/hæŋ aʊt/",
                partOfSpeech: "verb",
                examples: [
                    {
                        sentence: "I hung out with friends on Saturday.",
                        translation: "В субботу я проводил время с друзьями.",
                    },
                    {
                        sentence: "We usually hang out at the park.",
                        translation: "Обычно мы гуляем в парке.",
                    },
                ],
                relatedWords: ["chill", "spend time"],
            },
        },
    },
    {
        id: "demo_msg_5",
        sessionId: DEMO_SESSION_ID,
        role: "assistant",
        content:
            "В полноценном уроке диалог продолжается: репетитор задаёт следующий вопрос и подстраивает сложность под твой уровень.",
        timestamp: now - 220000,
        type: "text",
    },
];
