// ARCHITECT: пузырь проверяется на трёх решениях: красная пометка ошибки, зелёная строка мелкой правки и
// посимвольная печать ответа. Сеть и озвучка здесь не поднимаются.

import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageBubble } from "@/components/chat/messages/MessageBubble";
import { renderWithProviders } from "@/test/utils";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";

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

function message(role: "user" | "assistant", content: string): EnhancedMessage {
    return { id: `${role}-1`, sessionId: "s1", role, content, timestamp: 0, type: "text" };
}

afterEach(() => {
    vi.useRealTimers();
});

describe("MessageBubble", () => {
    it("4.1 помечает красным только фрагмент ошибки", () => {
        const { container } = renderWithProviders(
            <MessageBubble
                message={message("user", "Yesterday I go to the cinema.")}
                session={SESSION}
                highlights={["I go to"]}
            />
        );
        const marked = container.querySelectorAll("span.underline");

        expect(marked).toHaveLength(1);
        expect(marked[0]?.textContent).toBe("I go to");
        expect(marked[0]?.className).toContain("red");
        expect(container.textContent).toContain("Yesterday I go to the cinema.");
    });

    it("4.2 мелкая правка показывается зелёной строкой под репликой", () => {
        const { container } = renderWithProviders(
            <MessageBubble
                message={message("user", "Im going home.")}
                session={SESSION}
                polish={["I'm going"]}
            />
        );

        expect(container.textContent).toContain("точнее");
        expect(container.textContent).toContain("I'm going");
        expect(container.querySelector("li")?.className).toContain("emerald");
        // ARCHITECT: у полировки неверный вариант не показывают: красного в реплике быть не должно.
        expect(container.querySelector("li")?.className).not.toContain("red");
    });

    it("4.3 ответ печатается посимвольно и доходит до конца", () => {
        vi.useFakeTimers();

        const { container } = renderWithProviders(
            <MessageBubble
                message={message("assistant", "Hello there friend")}
                session={SESSION}
                animate
            />
        );

        // ARCHITECT: в первом кадре видна только часть ответа: текст печатается шагами, а не появляется целиком.
        expect(container.textContent).not.toContain("Hello there friend");

        // ARCHITECT: шаг за шагом: каждый такт печати регистрируется эффектом после отрисовки, поэтому
        // таймеры продвигаются по одному такту внутри act — иначе цепочка печати не успевает продолжиться.
        for (let step = 0; step < 20; step += 1) {
            act(() => {
                vi.advanceTimersByTime(24);
            });
        }

        expect(container.textContent).toContain("Hello there friend");
    });

    it("4.4 без анимации ответ показывается целиком", () => {
        renderWithProviders(
            <MessageBubble message={message("assistant", "Hello there friend")} session={SESSION} />
        );

        expect(screen.getByText("Hello there friend")).toBeInTheDocument();
    });
});
