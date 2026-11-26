// ARCHITECT: сравнение введённого ответа с верным: регистр и лишние пробелы не считаются ошибкой — задание
// проверяет форму или порядок слов, а не пунктуацию. Одна функция на все типы викторины (§5.4).

export function normalizeAnswer(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}
