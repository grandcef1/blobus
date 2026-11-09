    // ARCHITECT: Мок-данные для ИИ-репетиторов

    import type { Repetitor, LearningModeConfig } from '../../types/onboarding';

    export const MOCK_REPETITORS: Repetitor[] = [
    {
        id: 'aria',
        name: 'Aria',
        personality: 'Encouraging and patient, perfect for beginners',
        backstory: 'Aria spent 5 years teaching English in Tokyo before joining Blobus. She believes every mistake is a stepping stone to fluency.',
        voiceAccent: 'american',
        avatarColor: '#8B5CF6', // purple
        specialties: ['speaking', 'grammar'],
        teachingStyle: 'encouraging',
    },
    {
        id: 'max',
        name: 'Max',
        personality: 'Professional and results-driven',
        backstory: 'Former tech recruiter at Google, Max knows exactly what interviewers look for. He\'ll prepare you for any English interview.',
        voiceAccent: 'british',
        avatarColor: '#3B82F6', // blue
        specialties: ['interview', 'general'],
        teachingStyle: 'professional',
    },
    {
        id: 'sophia',
        name: 'Sophia',
        personality: 'Casual and fun-loving',
        backstory: 'Sophia is a travel blogger who\'s visited 47 countries. She makes learning feel like chatting with a friend at a coffee shop.',
        voiceAccent: 'australian',
        avatarColor: '#10B981', // green
        specialties: ['speaking', 'general'],
        teachingStyle: 'casual',
    },
    {
        id: 'oliver',
        name: 'Oliver',
        personality: 'Structured and detail-oriented',
        backstory: 'Cambridge graduate with a linguistics degree. Oliver breaks down complex grammar into simple, memorable patterns.',
        voiceAccent: 'british',
        avatarColor: '#F59E0B', // amber
        specialties: ['grammar', 'interview'],
        teachingStyle: 'structured',
    },
    ];

    export const MOCK_LEARNING_MODES: LearningModeConfig[] = [
    {
        id: 'interview',
        label: 'Interview Preparation',
        description: 'Practice common interview questions and professional vocabulary',
        icon: 'Briefcase',
        recommendedRepetitors: ['max', 'oliver'],
    },
    {
        id: 'speaking',
        label: 'Speaking Practice',
        description: 'Improve fluency through natural conversations',
        icon: 'MessageCircle',
        recommendedRepetitors: ['aria', 'sophia'],
    },
    {
        id: 'grammar',
        label: 'Grammar Focus',
        description: 'Master English grammar with structured lessons',
        icon: 'BookOpen',
        recommendedRepetitors: ['oliver', 'aria'],
    },
    {
        id: 'general',
        label: 'General English',
        description: 'Everyday English for travel and casual conversations',
        icon: 'Globe',
        recommendedRepetitors: ['sophia', 'max'],
    },
    ];