// ARCHITECT: группировка ленты — чистые функции и разметка группы: тест держит границы групп (смена отправителя,
// пауза больше двух минут, новый день), позиции реплик, углы пузыря и правило «аватар и имя только у первой
// реплики, время — под последней» (§спец. 1).

import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { MessageGroup } from "@/components/chat/messages/MessageGroup";
import { GROUP_GAP_MS, groupMessages } from "@/components/chat/messages/grouping";
import { bubbleShape } from "@/components/chat/messages/messageShape";
import type { ChatFeedMessage } from "@/hooks/useChat";
import { renderWithProviders } from "@/test/utils";
import type { EnhancedChatSession } from "@/types/session";

const SESSION: EnhancedChatSession = {
    id: "s1",
    userId: "u1",
    title: "Мия",
    createdAt: 0,
    repetitorId: "miya",
    learningMode: "speaking",
    progress: { completedLessons: 0, totalLessons: 0, wordsLearned: 0, streakDays: 0 },
    lastActivityAt: 0,
    messages: [],
};

const MINUTE = 60_000;
const AT = Date.parse("2026-11-27T10:00:00.000Z");

function message(role: "user" | "assistant", content: string, at: number): ChatFeedMessage {
    return {
        id: `${role}-${at}-${content}`,
        role,
        content,
        cards: null,
        voiceId: null,
        createdAt: at,
        words: [],
        live: false,
    };
}

describe("groupMessages", () => {
    it("две реплики одного отправителя с паузой до двух минут — одна группа", () => {
        const groups = groupMessages([
            message("user", "Hello", AT),
            message("user", "И ещё вопрос", AT + GROUP_GAP_MS),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.entries.map((entry) => entry.position)).toEqual(["first", "last"]);
    });

    it("пауза больше двух минут и смена отправителя ломают группу", () => {
        const groups = groupMessages([
            message("user", "Hello", AT),
            message("user", "Поздно", AT + GROUP_GAP_MS + 1),
            message("assistant", "Hi", AT + GROUP_GAP_MS + 2),
        ]);

        expect(groups).toHaveLength(3);
        expect(groups.map((group) => group.role)).toEqual(["user", "user", "assistant"]);
    });

    it("новый день ломает группу, пустая реплика в группу не попадает", () => {
        const groups = groupMessages([
            message("assistant", "Вечерний ответ", AT),
            message("assistant", "", AT + 1000),
            message("assistant", "Утренний ответ", AT + 26 * 60 * MINUTE),
        ]);

        // ARCHITECT: пустая реплика — это вторая часть хода ещё в пути: группу она не открывает и не ломает.
        expect(groups).toHaveLength(2);
        expect(groups[1]?.entries[0]?.message.content).toBe("Утренний ответ");
        expect(groups[0]?.dayKey).not.toBe(groups[1]?.dayKey);
    });

    it("одиночная реплика получает позицию single, средние — middle", () => {
        expect(groupMessages([message("user", "One", AT)])[0]?.entries[0]?.position).toBe("single");

        const three = groupMessages([
            message("assistant", "One", AT),
            message("assistant", "Two", AT + 1000),
            message("assistant", "Three", AT + 2000),
        ]);

        expect(three[0]?.entries.map((entry) => entry.position)).toEqual([
            "first",
            "middle",
            "last",
        ]);
    });

    it("углы пузыря зависят от места в группе и зеркальны у реплики ученика", () => {
        expect(bubbleShape("single", "assistant")).toBe("rounded-2xl");
        expect(bubbleShape("first", "assistant")).toContain("rounded-bl-md");
        expect(bubbleShape("middle", "assistant")).toContain("rounded-tl-md");
        expect(bubbleShape("first", "user")).toContain("rounded-br-md");
        expect(bubbleShape("last", "user")).toContain("rounded-tr-md");
    });
});

describe("MessageGroup", () => {
    it("аватар и имя только у первой реплики, время — под последней", () => {
        const group = groupMessages([
            message("assistant", "Первый ответ", AT),
            message("assistant", "Второй ответ", AT + 1000),
        ])[0];

        if (group === undefined) throw new Error("группа не собралась");

        const { container } = renderWithProviders(
            <MessageGroup
                group={group}
                session={SESSION}
                level="B1"
                voiceEnabled={false}
                proPlan={false}
                animateLast={false}
                streamingLast={false}
                onQuizAnswered={() => undefined}
            />
        );

        // Имя видно один раз — у первой реплики; скринридеру оно объявлено на каждой реплике (sr-only).
        expect(screen.getByText("Мия")).toBeInTheDocument();
        expect(container.querySelectorAll("p[aria-hidden='true']")).toHaveLength(1);

        // ARCHITECT: место под аватар у второй реплики сохраняется: иначе текст группы сдвинулся бы влево и
        // лента «прыгала» бы на каждом сообщении.
        expect(container.querySelectorAll("div[aria-hidden='true']")).toHaveLength(1);

        // Время группы одно и стоит под последней репликой.
        expect(container.querySelectorAll("time")).toHaveLength(1);
        expect(container.querySelector("time")?.dateTime).toBe(new Date(AT + 1000).toISOString());
    });
});
