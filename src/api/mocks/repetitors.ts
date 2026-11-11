    // ARCHITECT: Моки репетиторов — теперь используют данные из MOCK_BLOBATARS
    // Этот файл остаётся для обратной совместимости, но данные берутся из блобатаров

    import { MOCK_BLOBATARS } from "./blobatars";
    import type { BlobatarId } from "@/types/blobatar";
    import type { LearningMode } from "@/types/onboarding";

    export interface Repetitor {
    id: BlobatarId;
    name: string;
    personality: string;
    backstory: string;
    voiceAccent: "british" | "american" | "australian";
    specialties: LearningMode[];
    teachingStyle: "encouraging" | "structured" | "casual" | "professional";
    }

    // ARCHITECT: Заглушки для обратной совместимости
    // В реальном приложении эти данные должны приходить с бэкенда
    export const MOCK_REPETITORS: Repetitor[] = MOCK_BLOBATARS.map((blobatar, index) => {
    const personalities = [
        "Поддерживающая и терпеливая",
        "Профессиональный и ориентированный на результат",
        "Непринуждённая и весёлая",
        "Структурированный и внимательный к деталям",
        "Энергичная и мотивирующая",
        "Спокойная и вдумчивая",
        "Творческая и нестандартная",
        "Практичная и прикладная",
        "Дружелюбная и открытая",
        "Аналитическая и точная",
    ];

    const accents: Array<"british" | "american" | "australian"> = [
        "american",
        "british",
        "australian",
        "american",
        "british",
        "american",
        "australian",
        "british",
        "american",
        "australian",
    ];

    const styles: Array<"encouraging" | "structured" | "casual" | "professional"> = [
        "encouraging",
        "professional",
        "casual",
        "structured",
        "encouraging",
        "structured",
        "casual",
        "professional",
        "encouraging",
        "structured",
    ];

    const allModes: LearningMode[] = ["interview", "speaking", "grammar", "general"];
    const specialties = allModes.slice(0, 2 + (index % 2));

    return {
        id: blobatar.id as BlobatarId,
        name: blobatar.name,
        personality: personalities[index],
        backstory: "",
        voiceAccent: accents[index],
        specialties,
        teachingStyle: styles[index],
    };
    });

    export const MOCK_LEARNING_MODES = [
    {
        id: "interview",
        label: "Собеседование",
        description: "Практика типичных вопросов на собеседовании и тренировка профессиональной лексики",
        icon: "Briefcase",
        recommendedRepetitors: ["max", "orion"],
    },
    {
        id: "speaking",
        label: "Разговорная практика",
        description: "Улучшение беглости речи через естественные диалоги",
        icon: "MessageCircle",
        recommendedRepetitors: ["miya", "alex"],
    },
    {
        id: "grammar",
        label: "Грамматика",
        description: "Освой английскую грамматику через структурированные уроки",
        icon: "BookOpen",
        recommendedRepetitors: ["oscar", "lira"],
    },
    {
        id: "general",
        label: "Общий английский",
        description: "Повседневный английский для путешествий и общения",
        icon: "Globe",
        recommendedRepetitors: ["luna", "nova"],
    },
    ];