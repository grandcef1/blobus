// ARCHITECT: константы вынесены из QuizCard, чтобы карточка оставалась в пределах 150 строк.

export const LETTERS_KEYS = [
    "quiz.letters.a",
    "quiz.letters.b",
    "quiz.letters.c",
    "quiz.letters.d",
] as const;

export const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";

/** Сколько промахов подряд открывают верный вариант. */
export const REVEAL_AFTER_WRONG = 2;
