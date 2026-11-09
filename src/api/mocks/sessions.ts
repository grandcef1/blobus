    // ARCHITECT: Мок-данные для чат-сессий

    import type { EnhancedChatSession, EnhancedMessage } from '../../types/session';

    const now = Date.now();

    export const MOCK_SESSIONS: EnhancedChatSession[] = [
    {
        id: 'session_interview_1',
        userId: 'user_1',
        title: 'Behavioral Questions Practice',
        createdAt: now - 86400000 * 2, // 2 days ago
        repetitorId: 'max',
        learningMode: 'interview',
        targetLevel: 'B2',
        progress: {
        completedLessons: 3,
        totalLessons: 10,
        wordsLearned: 28,
        streakDays: 7,
        },
        lastActivityAt: now - 3600000, // 1 hour ago
        tags: ['behavioral', 'STAR-method'],
        messages: [
        {
            id: 'msg_1',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Let\'s practice behavioral questions. I\'ll ask you a common interview question, and you can respond. Ready?',
            timestamp: now - 7200000,
            type: 'text',
        },
        {
            id: 'msg_2',
            sessionId: 'session_interview_1',
            role: 'user',
            content: 'Yes, I\'m ready!',
            timestamp: now - 7100000,
            type: 'text',
        },
        {
            id: 'msg_3',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Great! Here\'s your first question:\n\n**Tell me about a time when you had to deal with a difficult team member.**\n\nRemember to use the STAR method: Situation, Task, Action, Result.',
            timestamp: now - 7000000,
            type: 'text',
        },
        {
            id: 'msg_4',
            sessionId: 'session_interview_1',
            role: 'user',
            content: 'Last year I work with a developer who always missed deadlines. I talked to him and we made a plan together.',
            timestamp: now - 6900000,
            type: 'text',
        },
        {
            id: 'msg_5',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Good start! Let me help you improve the grammar and structure.',
            timestamp: now - 6800000,
            type: 'correction',
            metadata: {
            correction: {
                originalText: 'Last year I work with a developer who always missed deadlines. I talked to him and we made a plan together.',
                correctedText: 'Last year, I **worked** with a developer who always missed deadlines. I **spoke** to him, and we **created** a plan together.',
                explanation: 'Use Past Simple for completed actions in the past. "Worked" instead of "work", "spoke" is more professional than "talked".',
                ruleName: 'Past Simple Tense',
                examples: [
                'I **worked** on that project last month.',
                'She **presented** her findings yesterday.',
                'We **collaborated** with the marketing team.',
                ],
                severity: 'moderate',
            },
            },
        },
        {
            id: 'msg_6',
            sessionId: 'session_interview_1',
            role: 'assistant',
            content: 'Now let\'s practice vocabulary for this topic. Which word best describes resolving a conflict?',
            timestamp: now - 6700000,
            type: 'quiz',
            metadata: {
            quiz: {
                question: 'Choose the most professional word:',
                options: [
                { id: 'a', text: 'Fixed', isCorrect: false, explanation: 'Too casual for professional context' },
                { id: 'b', text: 'Resolved', isCorrect: true, explanation: 'Professional and precise ✓' },
                { id: 'c', text: 'Sorted out', isCorrect: false, explanation: 'Too informal for interviews' },
                { id: 'd', text: 'Handled', isCorrect: false, explanation: 'Acceptable but less specific than "resolved"' },
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
        title: 'Weekend Plans Conversation',
        createdAt: now - 86400000, // 1 day ago
        repetitorId: 'sophia',
        learningMode: 'speaking',
        targetLevel: 'B1',
        progress: {
        completedLessons: 5,
        totalLessons: 15,
        wordsLearned: 42,
        streakDays: 7,
        },
        lastActivityAt: now - 7200000, // 2 hours ago
        tags: ['casual', 'future-plans'],
        messages: [
        {
            id: 'msg_1',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Hey! 👋 What are your plans for the weekend?',
            timestamp: now - 86400000,
            type: 'text',
        },
        {
            id: 'msg_2',
            sessionId: 'session_speaking_1',
            role: 'user',
            content: 'I will go to cinema with my friends on Saturday.',
            timestamp: now - 86300000,
            type: 'text',
        },
        {
            id: 'msg_3',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Nice! Let me help you sound more natural.',
            timestamp: now - 86200000,
            type: 'correction',
            metadata: {
            correction: {
                originalText: 'I will go to cinema with my friends on Saturday.',
                correctedText: 'I\'m **going to the cinema** with my friends on Saturday.',
                explanation: 'Use "going to" for planned future events. Don\'t forget the article "the" before "cinema".',
                ruleName: 'Future Plans',
                examples: [
                'I\'m **going to** visit my family next week.',
                'We\'re **going to** have dinner at 7 PM.',
                'She\'s **going to** study for her exam.',
                ],
                severity: 'minor',
            },
            },
        },
        {
            id: 'msg_4',
            sessionId: 'session_speaking_1',
            role: 'assistant',
            content: 'Here\'s a useful word for weekend plans:',
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