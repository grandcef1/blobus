    // ARCHITECT: Мок-данные для ИИ-репетиторов
    // Переведены на русский для русскоязычной аудитории

    import type { Repetitor, LearningModeConfig } from '../../types/onboarding';

    export const MOCK_REPETITORS: Repetitor[] = [
    {
        id: 'aria',
        name: 'Ария',
        personality: 'Поддерживающая и терпеливая, идеальна для начинающих',
        backstory: 'Ария 5 лет преподавала английский в Токио, прежде чем присоединиться к Blobus. Она верит, что каждая ошибка — это шаг к свободному владению языком.',
        voiceAccent: 'american',
        avatarColor: '#8B5CF6', // фиолетовый
        specialties: ['speaking', 'grammar'],
        teachingStyle: 'encouraging',
    },
    {
        id: 'max',
        name: 'Макс',
        personality: 'Профессиональный и ориентированный на результат',
        backstory: 'Бывший рекрутер в Google, Макс знает, что именно ищут интервьюеры. Он подготовит тебя к любому собеседованию на английском.',
        voiceAccent: 'british',
        avatarColor: '#3B82F6', // синий
        specialties: ['interview', 'general'],
        teachingStyle: 'professional',
    },
    {
        id: 'sophia',
        name: 'София',
        personality: 'Непринуждённая и весёлая',
        backstory: 'София — тревел-блогер, посетившая 47 стран. С ней обучение похоже на разговор с другом в кофейне.',
        voiceAccent: 'australian',
        avatarColor: '#10B981', // зелёный
        specialties: ['speaking', 'general'],
        teachingStyle: 'casual',
    },
    {
        id: 'oliver',
        name: 'Оливер',
        personality: 'Структурированный и внимательный к деталям',
        backstory: 'Выпускник Кембриджа со степенью по лингвистике. Оливер разбирает сложную грамматику на простые запоминающиеся паттерны.',
        voiceAccent: 'british',
        avatarColor: '#F59E0B', // янтарный
        specialties: ['grammar', 'interview'],
        teachingStyle: 'structured',
    },
    ];

    export const MOCK_LEARNING_MODES: LearningModeConfig[] = [
    {
        id: 'interview',
        label: 'Подготовка к собеседованиям',
        description: 'Практика типичных вопросов на собеседовании и профессиональная лексика',
        icon: 'Briefcase',
        recommendedRepetitors: ['max', 'oliver'],
    },
    {
        id: 'speaking',
        label: 'Разговорная практика',
        description: 'Улучшение беглости речи через естественные диалоги',
        icon: 'MessageCircle',
        recommendedRepetitors: ['aria', 'sophia'],
    },
    {
        id: 'grammar',
        label: 'Грамматика',
        description: 'Освой английскую грамматику через структурированные уроки',
        icon: 'BookOpen',
        recommendedRepetitors: ['oliver', 'aria'],
    },
    {
        id: 'general',
        label: 'Общий английский',
        description: 'Повседневный английский для путешествий и общения',
        icon: 'Globe',
        recommendedRepetitors: ['sophia', 'max'],
    },
    ];