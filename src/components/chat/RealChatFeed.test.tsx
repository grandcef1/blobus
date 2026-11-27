// ARCHITECT: лента реального чата: тест держит состояния ленты, которые нельзя проверить юнитом группировки —
// скелетон истории, короткое «возвращение» в незавершённый урок и индикатор набора в паузе перед второй частью.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { RealChatFeed } from "@/components/chat/RealChatFeed";
import type { ChatFeedMessage } from "@/hooks/useChat";
import type { ChatLessonPlan } from "@/api/chat";
import { renderWithProviders } from "@/test/utils";
import type { EnhancedChatSession } from "@/types/session";

// ARCHITECT: jsdom не умеет прокрутку: подменяются оба способа. Тест держит главное — лента прокручивается
// сама, а scrollIntoView не вызывается вовсе: он тянет за собой внешние блоки, и шапка с полем ввода уходят
// за край окна (§спец. 1).
let scrollToSpy: ReturnType<typeof vi.fn>;
let scrollIntoViewSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
    scrollToSpy = vi.fn();
    scrollIntoViewSpy = vi.fn();
    Element.prototype.scrollTo = scrollToSpy as unknown as Element["scrollTo"];
    Element.prototype.scrollIntoView = scrollIntoViewSpy as unknown as Element["scrollIntoView"];
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
        serverId: `${role}-${content}`,
        quizState: null,
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

    it("6.5 прокрутка живёт только в ленте: у страницы своей прокрутки нет", () => {
        const { container } = renderWithProviders(
            <RealChatFeed {...BASE} messages={[message("assistant", "Привет", true)]} />
        );
        const scrollers = container.querySelectorAll(".overflow-y-auto");

        // ARCHITECT: единственная прокручиваемая область — сама лента (§спец. 1).
        expect(scrollers).toHaveLength(1);
        // ARCHITECT: min-h-0 не даёт флекс-строке вырасти по контенту: без него расти начала бы страница, а
        // шапка и поле ввода уезжали бы вверх.
        expect(scrollers[0]?.className).toContain("min-h-0");
        expect(scrollers[0]?.className).toContain("flex-1");
    });

    it("6.6 лента прокручивается своим контейнером, а не внешними блоками", () => {
        const { container } = renderWithProviders(
            <RealChatFeed {...BASE} messages={[message("assistant", "Привет", true)]} />
        );
        const scroller = container.querySelector(".overflow-y-auto");

        expect(scrollToSpy).toHaveBeenCalledTimes(1);
        expect(scrollToSpy.mock.instances[0]).toBe(scroller);
        expect(scrollToSpy.mock.calls[0]?.[0]).toMatchObject({ behavior: "smooth" });
        // ARCHITECT: scrollIntoView увёл бы за край окна шапку и поле ввода — в ленте его нет.
        expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    });
});
