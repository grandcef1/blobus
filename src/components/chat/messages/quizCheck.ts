// ARCHITECT: сравнение введённого ответа с верным: регистр и лишние пробелы не считаются ошибкой — задание
// проверяет форму или порядок слов, а не пунктуацию. Одна функция на все типы викторины (§5.4).

import type { ChatQuiz } from "@/api/chat";

export function normalizeAnswer(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Верный вариант задания: у выбора это текст опции, у пропуска и сборки — сам ответ. */
export function correctAnswerText(quiz: ChatQuiz): string {
    if (quiz.type !== "choice") return quiz.answer;

    return quiz.options.find((option) => option.id === quiz.answerId)?.text ?? "";
}

/** Текст выбранного варианта: у выбора приходит id опции, у пропуска и сборки — сам ответ. */
export function answerTextFor(quiz: ChatQuiz, answer: string): string {
    if (quiz.type !== "choice") return answer;

    return quiz.options.find((option) => option.id === answer)?.text ?? answer;
}
