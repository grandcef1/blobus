    // ARCHITECT: Расширенные типы для чат-сессий и сообщений

    import type { Message, ChatSession } from '../api/types';

    export type MessageRole = 'user' | 'assistant' | 'system';

    export type MessageType = 
    | 'text'
    | 'correction' // inline grammar correction
    | 'quiz' // multiple choice question
    | 'fill-blank' // fill in the blank exercise
    | 'vocabulary-card' // word card with examples
    | 'audio-prompt' // listening exercise
    | 'speaking-feedback'; // pronunciation feedback

    /** Сегмент текста правки: changed помечает слово, которое изменил репетитор. */
    export interface CorrectionSegment {
    text: string;
    changed?: boolean;
    }

    export interface GrammarCorrection {
    originalText: string;
    correctedText: string;
    // ARCHITECT: по сегментам интерфейс зачёркивает только изменённые слова, а не всё предложение.
    // originalText/correctedText остаются plain-строками без разметки — для aria и запасного рендера.
    originalSegments: CorrectionSegment[];
    correctedSegments: CorrectionSegment[];
    explanation: string;
    ruleName: string; // e.g., "Past Simple"
    examples: string[];
    severity: 'minor' | 'moderate' | 'major';
    }

    export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string; // shown after answer
    }

    export interface QuizContent {
    question: string;
    options: QuizOption[];
    multiSelect: boolean;
    timeLimit?: number; // seconds
    }

    export interface FillBlankContent {
    sentence: string; // with ___ placeholders
    correctAnswers: string[];
    hints?: string[];
    explanation: string;
    }

    export interface VocabularyCard {
    word: string;
    translation: string;
    pronunciation: string; // IPA or phonetic
    partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition';
    examples: Array<{
        sentence: string;
        translation?: string;
    }>;
    relatedWords?: string[];
    }

    export interface SpeakingFeedback {
    audioUrl?: string; // user's recording
    transcription: string;
    pronunciationScore: number; // 0-100
    feedback: string[];
    improvedPronunciationUrl?: string; // AI-generated correct version
    }

    export interface EnhancedMessage extends Message {
    type: MessageType;
    metadata?: {
        correction?: GrammarCorrection;
        quiz?: QuizContent;
        fillBlank?: FillBlankContent;
        vocabularyCard?: VocabularyCard;
        speakingFeedback?: SpeakingFeedback;
    };
    parentId?: string; // for threaded responses
    reactions?: Array<{
        type: 'helpful' | 'confusing' | 'more-examples';
        count: number;
    }>;
    }

    // ARCHITECT: Используем Omit чтобы переопределить messages с расширенным типом
    export interface EnhancedChatSession extends Omit<ChatSession, 'messages'> {
    messages: EnhancedMessage[];
    repetitorId: string;
    learningMode: string;
    targetLevel?: string;
    progress: {
        completedLessons: number;
        totalLessons: number;
        wordsLearned: number;
        streakDays: number;
    };
    lastActivityAt: number;
    tags?: string[]; // e.g., ["business", "interview"]
    }