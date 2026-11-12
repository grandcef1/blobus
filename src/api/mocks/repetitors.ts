// ARCHITECT: режимы обучения. Это источник только режимов: характеры персонажей живут в
// api/mocks/blobatars, поэтому производного списка репетиторов с выдуманными описаниями
// здесь больше нет — имя, черты и историю читают из персоны. Зависимость односторонняя
// (blobatars -> repetitors), цикла между моками нет.

import type { BlobatarId } from "@/types/blobatar";
import type { LearningMode } from "@/types/onboarding";

export interface LearningModeOption {
    id: LearningMode;
    label: string;
    description: string;
    icon: string;
    recommendedRepetitors: BlobatarId[];
}

export const MOCK_LEARNING_MODES: LearningModeOption[] = [
    {
        id: "interview",
        label: "Подготовка к собеседованиям",
        description: "Практика типичных вопросов на собеседовании и профессиональная лексика",
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
