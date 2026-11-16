// ARCHITECT: «пусто» и «ошибка» — два состояния одного контракта списка, поэтому проверяются в одном
// файле: заголовок, объяснение и действие обязаны доходить до DOM, а «Повторить» — реально звать повтор.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertTriangle } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { renderWithProviders } from "@/test/utils";

describe("EmptyState", () => {
    it("показывает заголовок, объяснение и действие", () => {
        renderWithProviders(
            <EmptyState
                icon={AlertTriangle}
                title="Список пуст"
                description="Добавьте первую запись"
                action={<button type="button">Создать</button>}
            />
        );

        expect(screen.getByRole("heading", { name: "Список пуст" })).toBeInTheDocument();
        expect(screen.getByText("Добавьте первую запись")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Создать" })).toBeInTheDocument();
    });

    it("без объяснения и действия рендерит только заголовок", () => {
        renderWithProviders(<EmptyState icon={AlertTriangle} title="Пусто" />);

        expect(screen.getByRole("heading", { name: "Пусто" })).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});

describe("ErrorState", () => {
    it("зовёт повтор по кнопке", async () => {
        const onRetry = vi.fn();
        const user = userEvent.setup();

        renderWithProviders(
            <ErrorState
                title="Сбой загрузки"
                description="Проверьте соединение"
                onRetry={onRetry}
                retryLabel="Повторить"
            />
        );

        await user.click(screen.getByRole("button", { name: "Повторить" }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("объявлен как alert и принимает второе действие", () => {
        renderWithProviders(
            <ErrorState title="Сбой загрузки" description="Текст ошибки">
                <a href="/app/overview">В обзор</a>
            </ErrorState>
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "В обзор" })).toBeInTheDocument();
    });
});
