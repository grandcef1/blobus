// ARCHITECT: точная подсветка проверяется как чистая функция: сервер гарантирует, что fragment — подстрока
// реплики ученика, но клиент не доверяет этому и просто не находит лишнее — подсветка не должна падать.

import { describe, expect, it } from "vitest";

import { highlightFragments } from "@/lib/highlightFragments";

describe("highlightFragments", () => {
    it("1.1 подчёркивает только фрагмент, остальной текст остаётся обычным", () => {
        const segments = highlightFragments("Yesterday I go to the cinema.", ["I go to"]);

        expect(segments).toEqual([
            { text: "Yesterday ", marked: false },
            { text: "I go to", marked: true },
            { text: " the cinema.", marked: false },
        ]);
    });

    it("1.2 без фрагментов реплика остаётся одним отрезком", () => {
        expect(highlightFragments("Hello there", [])).toEqual([
            { text: "Hello there", marked: false },
        ]);
    });

    it("1.3 отсутствующий в реплике фрагмент ничего не подчёркивает", () => {
        expect(highlightFragments("Hello there", ["I am agree"])).toEqual([
            { text: "Hello there", marked: false },
        ]);
    });

    it("1.4 вложенные фрагменты склеиваются в один отрезок", () => {
        expect(highlightFragments("I go to the cinema", ["go to the", "to the cinema"])).toEqual([
            { text: "I ", marked: false },
            { text: "go to the cinema", marked: true },
        ]);
    });

    it("1.5 пустой фрагмент не подчёркивает всю реплику", () => {
        expect(highlightFragments("Hello", [""])).toEqual([{ text: "Hello", marked: false }]);
    });
});
