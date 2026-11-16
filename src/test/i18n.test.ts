// ARCHITECT: этот тест навсегда закрывает класс багов «забыли перевод»: наборы ключей во всех языках
// обязаны совпадать. Словари читаются файлами, а не из ресурсов i18next, — так тест видит и забытый
// ключ, и забытый файл неймспейса.

import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

// ARCHITECT: glob, а не список импортов: новый неймспейс попадает под тест сам, без правки теста.
const LOCALE_FILES: Record<string, unknown> = import.meta.glob("../../locales/*/*.json", {
    eager: true,
    import: "default",
});

const FILE_PATTERN = /^\.\.\/\.\.\/locales\/(?<language>[^/]+)\/(?<namespace>[^/]+)\.json$/;

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/** Плоский список ключей словаря: вложенность разделена точкой, как в вызовах t(). */
function collectKeys(dictionary: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(dictionary).flatMap(([key, value]) => {
        const path = prefix === "" ? key : `${prefix}.${key}`;
        const nested = asRecord(value);
        return nested === null ? [path] : collectKeys(nested, path);
    });
}

/** Ключи вида "<неймспейс>.<ключ>" по языкам: язык → набор ключей. */
function keysByLanguage(): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>(
        SUPPORTED_LANGUAGES.map((language) => [language, new Set<string>()])
    );

    for (const [file, raw] of Object.entries(LOCALE_FILES)) {
        const match = FILE_PATTERN.exec(file);
        if (match?.groups === undefined) throw new Error(`не разобран путь словаря: ${file}`);

        const { language, namespace } = match.groups;
        const dictionary = asRecord(raw);
        if (dictionary === null) throw new Error(`словарь ${file} не объект`);

        const keys = result.get(language);
        if (keys === undefined) continue;

        for (const key of collectKeys(dictionary)) keys.add(`${namespace}.${key}`);
    }

    return result;
}

describe("словари переводов", () => {
    it("каждый неймспейс переведён на все поддерживаемые языки", () => {
        const namespaces = new Set(
            Object.keys(LOCALE_FILES).map((file) => FILE_PATTERN.exec(file)?.groups?.namespace)
        );

        const missing: string[] = [];
        for (const namespace of namespaces) {
            for (const language of SUPPORTED_LANGUAGES) {
                const file = `../../locales/${language}/${namespace}.json`;
                if (!(file in LOCALE_FILES)) missing.push(`${language}/${namespace}`);
            }
        }

        expect(missing).toEqual([]);
    });

    it("наборы ключей совпадают во всех языках", () => {
        const byLanguage = keysByLanguage();
        const sorted = SUPPORTED_LANGUAGES.map((language) =>
            [...(byLanguage.get(language) ?? [])].sort()
        );
        const [reference, ...others] = sorted;

        expect(reference, "словарь ru должен существовать").toBeDefined();
        for (const [index, keys] of others.entries()) {
            // ARCHITECT: сравнение отсортированных списков даёт читаемый диф: каких ключей не хватает.
            expect(keys, `язык ${SUPPORTED_LANGUAGES[index + 1]}`).toEqual(reference);
        }
    });
});
