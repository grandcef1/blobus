// ARCHITECT: лента реального чата: тест держит состояния ленты, которые нельзя проверить юнитом группировки —
// скелетон истории, короткое «возвращение» в незавершённый урок и индикатор набора в паузе перед второй частью.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { RealChatFeed } from "@/components/chat/RealChatFeed";
import type { ChatFeedMessage } from "@/hooks/useChat";
import type { ChatLessonPlan } from "@/api/chat";
import { renderWithProviders } from "@/test/utils";
import type { EnhancedChatSession } from "@/types/session";

// ARCHITECT: jsdom не умеет прокрутку: без подмены эффект автоскролла ленты падает на первом рендере.
beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

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

const PLAN: ChatLessonPlan = {
    goal: "говорить свободнее в повседневном диалоге связными фразами на два-три предложения.",
    rule: "Present Simple для привычек и рутины",
    step: 3,
    total: 6,
    wordsDone: 2,
    wordsTotal: 5,
    completed: false,
};

const AT = Date.parse("2026-11-27T10:00:00.000Z");

function message(role: "user" | "assistant", content: string, live: boolean): ChatFeedMessage {
    return {
        id: `${role}-${content}`,
        role,
        content,
        cards: null,
        voiceId: null,
        createdAt: AT,
        words: [],
        live,
    };
}

type FeedProps = Parameters<typeof RealChatFeed>[0];

const BASE: FeedProps = {
    messages: [],
    session: SESSION,
    plan: PLAN,
    isLoading: false,
    isStreaming: false,
    isAwaitingFollowUp: false,
    error: null,
    messagesRemaining: null,
    voiceEnabled: false,
    proPlan: false,
    level: null,
    onRetry: () => undefined,
    onStop: () => undefined,
    onQuizAnswered: () => undefined,
};

describe("RealChatFeed", () => {
    it("6.1 в незавершённом уроке из истории показывает «возвращение»", () => {
        renderWithProviders(
            <RealChatFeed
                {...BASE}
                messages={[
                    message("assistant", "Приветствие репетитора", false),
                    message("user", "Yesterday I go home.", false),
                ]}
            />
        );

        expect(screen.getByText("Продолжаем урок")).toBeInTheDocument();
        expect(screen.getByText("Этап 4 из 6 · Слова урока: 2 из 5")).toBeInTheDocument();
    });

    it("6.2 живая реплика и завершённый урок убирают подсказку", () => {
        const { unmount } = renderWithProviders(
            <RealChatFeed
                {...BASE}
                messages={[message("assistant", "Продолжаем", true), message("user", "Yes", true)]}
            />
        );

        expect(screen.queryByText("Продолжаем урок")).not.toBeInTheDocument();
        unmount();

        renderWithProviders(
            <RealChatFeed
                {...BASE}
                plan={{ ...PLAN, completed: true, step: 6 }}
                messages={[message("assistant", "Итог урока", false)]}
            />
        );

        expect(screen.queryByText("Продолжаем урок")).not.toBeInTheDocument();
        // Завершённый урок подписан словом, а числа остаются теми же.
        expect(screen.getByText("Урок завершён")).toBeInTheDocument();
    });

    it("6.3 пока история в пути, лента показывает скелетон", () => {
        const { container } = renderWithProviders(<RealChatFeed {...BASE} isLoading />);

        expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    });

    it("6.4 индикатор набора идёт в группе репетитора без аватара", () => {
        const { container } = renderWithProviders(
            <RealChatFeed
                {...BASE}
                isStreaming
                isAwaitingFollowUp
                messages={[
                    message("user", "Yesterday I went home.", false),
                    message("assistant", "Good, now try a question.", false),
                ]}
            />
        );

        // ARCHITECT: индикатор стоит в колонке текста (pl-11) и без аватара: он принадлежит группе репетитора.
        expect(screen.getByLabelText("Репетитор печатает")).toBeInTheDocument();
        expect(screen.getByText("Остановить")).toBeInTheDocument();
        expect(container.querySelectorAll("div[aria-hidden='true']")).toHaveLength(0);
    });
});
