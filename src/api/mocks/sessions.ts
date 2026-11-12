    // ARCHITECT: Мок-данные для чат-сессий
    // Переведены на русский: заголовки, сообщения, объяснения грамматики

    import type { EnhancedChatSession, EnhancedMessage } from '../../types/session';

    const now = Date.now();

    export const MOCK_SESSIONS: EnhancedChatSession[] = [
    {
        id: 'session_interview_1',
        userId: 'user_1',
        title: 'Практика поведенческих вопросов',
        createdAt: now - 86400000 * 2, // 2 дня назад
        repetitorId: 'max',
        learningMode: 'interview',
        targetLevel: 'B2',
        progress: {
        completedLessons: 3,
        totalLessons: 10,
        wordsLearned: 28,
        streakDays: 7,
        },
        lastActivityAt: now - 3600000, // 1 час назад
        tags: ['поведенческие', 'STAR-метод'],
        messages: [
        {
            id: 'msg_1',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Давай потренируем поведенческие вопросы. Я задам тебе типичный вопрос на собеседовании, а ты ответишь. Готова?',
            timestamp: now - 7200000,
            type: 'text',
        },
        {
            id: 'msg_2',
            sessionId: 'session_interview_1',
            role: 'user',
            content: 'Да, готова.',
            timestamp: now - 7100000,
            type: 'text',
        },
        {
            id: 'msg_3',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Вот твой первый вопрос:\n\nРасскажи о случае, когда тебе пришлось работать со сложным членом команды.\n\nПомни про STAR-метод: Ситуация, Задача, Действие, Результат.',
            timestamp: now - 7000000,
            type: 'text',
        },
        {
            id: 'msg_4',
            sessionId: 'session_interview_1',
            role: 'user',
            content: 'В прошлом году я работаю с разработчиком, который всегда пропускал дедлайны. Я поговорила с ним, и мы составили план вместе.',
            timestamp: now - 6900000,
            type: 'text',
        },
        {
            id: 'msg_5',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Хорошее начало. Давай улучшим грамматику и структуру.',
            timestamp: now - 6800000,
            type: 'correction',
            metadata: {
            correction: {
                originalText: 'В прошлом году я работаю с разработчиком, который всегда пропускал дедлайны. Я поговорила с ним, и мы составили план вместе.',
                correctedText: 'В прошлом году я работала с разработчиком, который всегда пропускал дедлайны. Я поговорила с ним, и мы составили план вместе.',
                originalSegments: [
                { text: 'В прошлом году я ' },
                { text: 'работаю', changed: true },
                { text: ' с разработчиком, который всегда пропускал дедлайны. Я поговорила с ним, и мы составили план вместе.' },
                ],
                correctedSegments: [
                { text: 'В прошлом году я ' },
                { text: 'работала', changed: true },
                { text: ' с разработчиком, который всегда пропускал дедлайны. Я поговорила с ним, и мы составили план вместе.' },
                ],
                explanation: 'Для завершённого действия в прошлом нужен Past Simple: «работала», а не «работаю».',
                ruleName: 'Прошедшее простое время',
                examples: [
                'Я работала над этим проектом в прошлом месяце.',
                'Она представила свои выводы вчера.',
                'Мы сотрудничали с отделом маркетинга.',
                ],
                severity: 'moderate',
            },
            },
        },
        {
            id: 'msg_6',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Теперь давай потренируем лексику по этой теме. Какое слово лучше всего описывает разрешение конфликта?',
            timestamp: now - 6700000,
            type: 'quiz',
            metadata: {
            quiz: {
                question: 'Выбери наиболее профессиональное слово:',
                options: [
                { id: 'a', text: 'Исправил', isCorrect: false, explanation: 'Слишком неформально для профессионального контекста' },
                { id: 'b', text: 'Разрешил', isCorrect: true, explanation: 'Профессионально и точно' },
                { id: 'c', text: 'Разобрался', isCorrect: false, explanation: 'Слишком разговорно для собеседований' },
                { id: 'd', text: 'Справился', isCorrect: false, explanation: 'Приемлемо, но менее конкретно, чем "разрешил"' },
                ],
                multiSelect: false,
            },
            },
        },
        ] as EnhancedMessage[],
    },
    {
        id: 'session_speaking_1',
        userId: 'user_1',
        title: 'Разговор о планах на выходные',
        createdAt: now - 86400000, // 1 день назад
        repetitorId: 'sophia',
        learningMode: 'speaking',
        targetLevel: 'B1',
        progress: {
        completedLessons: 5,
        totalLessons: 15,
        wordsLearned: 42,
        streakDays: 7,
        },
        lastActivityAt: now - 7200000, // 2 часа назад
        tags: ['непринуждённый', 'планы-на-будущее'],
        messages: [
        {
            id: 'msg_1',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Привет. Какие планы на выходные?',
            timestamp: now - 86400000,
            type: 'text',
        },
        {
            id: 'msg_2',
            sessionId: 'session_speaking_1',
            role: 'user',
            content: 'Я пойду в кино с друзьями в субботу.',
            timestamp: now - 86300000,
            type: 'text',
        },
        {
            id: 'msg_3',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Классно. Давай сделаем твою фразу более естественной.',
            timestamp: now - 86200000,
            type: 'correction',
            metadata: {
            correction: {
                originalText: 'Я пойду в кино с друзьями в субботу.',
                correctedText: 'Я иду в кино с друзьями в субботу.',
                originalSegments: [
                { text: 'Я ' },
                { text: 'пойду', changed: true },
                { text: ' в кино с друзьями в субботу.' },
                ],
                correctedSegments: [
                { text: 'Я ' },
                { text: 'иду', changed: true },
                { text: ' в кино с друзьями в субботу.' },
                ],
                explanation: 'О запланированном будущем событии говорят в настоящем продолженном: «иду», а не «пойду».',
                ruleName: 'Планы на будущее',
                examples: [
                'Я иду навестить семью на следующей неделе.',
                'Мы ужинаем в 19:00.',
                'Она учится для экзамена.',
                ],
                severity: 'minor',
            },
            },
        },
        {
            id: 'msg_4',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Вот полезное слово для планов на выходные:',
            timestamp: now - 86100000,
            type: 'vocabulary-card',
            metadata: {
            vocabularyCard: {
                word: 'hang out',
                translation: 'проводить время (неформально)',
                pronunciation: '/hæŋ aʊt/',
                partOfSpeech: 'verb',
                examples: [
                { sentence: 'I\'m going to hang out with my friends this weekend.' },
                { sentence: 'Do you want to hang out at the café?' },
                { sentence: 'We usually hang out at the park on Sundays.' },
                ],
                relatedWords: ['chill', 'relax', 'spend time'],
            },
            },
        },
        ] as EnhancedMessage[],
    },
    ];