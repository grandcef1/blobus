// ARCHITECT: словарь встроенных примеров для мок-режима: карточка слова с переводом, произношением и примерами.
// Настоящие слова приходят из GET /api/vocabulary, а этот список остаётся источником только для мок-сборки
// (§5.4: один источник данных на всех потребителей мока).

import type { VocabularyWord } from "../../types/progress";

const now = Date.now();
const day = 86400000;

export const MOCK_VOCABULARY: VocabularyWord[] = [
    {
        id: "word_1",
        word: "collaborate",
        translation: "сотрудничать",
        pronunciation: "/kəˈlæbəreɪt/",
        partOfSpeech: "verb",
        examples: [
            {
                sentence: "We need to collaborate on this project.",
                translation: "Нам нужно сотрудничать в этом проекте.",
            },
            {
                sentence: "The teams collaborated effectively.",
                translation: "Команды эффективно сотрудничали.",
            },
        ],
        learnedAt: now - day * 5,
        lastReviewedAt: now - day * 2,
        reviewCount: 3,
        mastery: 85,
        modeIds: ["interview", "general"],
    },
    {
        id: "word_2",
        word: "deadline",
        translation: "дедлайн, крайний срок",
        pronunciation: "/ˈdedlaɪn/",
        partOfSpeech: "noun",
        examples: [
            {
                sentence: "The deadline is next Friday.",
                translation: "Дедлайн в следующую пятницу.",
            },
            {
                sentence: "I always meet my deadlines.",
                translation: "Я всегда укладываюсь в сроки.",
            },
        ],
        learnedAt: now - day * 7,
        lastReviewedAt: now - day * 1,
        reviewCount: 5,
        mastery: 92,
        modeIds: ["interview"],
    },
    {
        id: "word_3",
        word: "hang out",
        translation: "проводить время (неформально)",
        pronunciation: "/hæŋ aʊt/",
        partOfSpeech: "verb",
        examples: [
            {
                sentence: "Let's hang out this weekend.",
                translation: "Давай потусуемся на этих выходных.",
            },
            {
                sentence: "I usually hang out with my friends.",
                translation: "Я обычно провожу время с друзьями.",
            },
        ],
        learnedAt: now - day * 3,
        lastReviewedAt: now - day * 1,
        reviewCount: 2,
        mastery: 70,
        modeIds: ["speaking", "general"],
    },
    {
        id: "word_4",
        word: "resolve",
        translation: "решить (проблему), уладить",
        pronunciation: "/rɪˈzɒlv/",
        partOfSpeech: "verb",
        examples: [
            {
                sentence: "We resolved the conflict quickly.",
                translation: "Мы быстро уладили конфликт.",
            },
            {
                sentence: "The issue was resolved yesterday.",
                translation: "Проблема была решена вчера.",
            },
        ],
        learnedAt: now - day * 2,
        lastReviewedAt: now - day * 1,
        reviewCount: 2,
        mastery: 75,
        modeIds: ["interview"],
    },
    {
        id: "word_5",
        word: "achieve",
        translation: "достигать, добиваться",
        pronunciation: "/əˈtʃiːv/",
        partOfSpeech: "verb",
        examples: [
            {
                sentence: "I achieved my goal last year.",
                translation: "Я достиг своей цели в прошлом году.",
            },
            {
                sentence: "She achieved great success.",
                translation: "Она добилась большого успеха.",
            },
        ],
        learnedAt: now - day * 4,
        lastReviewedAt: now - day * 2,
        reviewCount: 3,
        mastery: 80,
        modeIds: ["interview", "general"],
    },
];
