// ARCHITECT: диалоги управления сессией проверяются без Radix-меню: в jsdom меню требует pointer-событий, а
// ценность здесь в другом — подтверждение необратимых действий и валидация названия. Диалоги принимают колбэки,
// поэтому проверяется именно контракт «что уйдёт наверх», без сети и без мок-стора.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmActionDialog } from "@/components/chat/header/ConfirmActionDialog";
import { RenameSessionDialog } from "@/components/chat/header/RenameSessionDialog";
import { TutorPickerDialog } from "@/components/chat/header/TutorPickerDialog";
import { renderWithProviders } from "@/test/utils";

describe("ConfirmActionDialog", () => {
    it("7.1 отмена не выполняет действие, подтверждение — выполняет ровно один раз", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        renderWithProviders(
            <ConfirmActionDialog
                open
                onOpenChange={() => undefined}
                title="Удалить сессию"
                description="Сессия и вся её история исчезнут без возможности восстановления."
                confirmLabel="Удалить"
                destructive
                onConfirm={onConfirm}
            />
        );

        // последствия необратимого действия написаны рядом с кнопкой, а не в window.confirm
        expect(
            screen.getByText("Сессия и вся её история исчезнут без возможности восстановления.")
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Отмена" }));

        expect(onConfirm).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "Удалить" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});

describe("RenameSessionDialog", () => {
    it("7.2 сохранение отправляет обрезанное название, пустое поле сохранить нельзя", async () => {
        const user = userEvent.setup();
        const onRename = vi.fn(async () => undefined);

        renderWithProviders(
            <RenameSessionDialog
                initialTitle=""
                open
                onOpenChange={() => undefined}
                onRename={onRename}
            />
        );

        const submit = screen.getByRole("button", { name: "Сохранить" });
        const field = screen.getByLabelText("Название");

        expect(submit).toBeDisabled();

        await user.type(field, "  План на неделю  ");
        await user.click(submit);

        expect(onRename).toHaveBeenCalledWith("План на неделю");
    });
});

describe("TutorPickerDialog", () => {
    it("7.3 сохранение заблокировано, пока репетитор не сменён; выбранный уходит наверх", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn(async () => undefined);

        renderWithProviders(
            <TutorPickerDialog
                open
                onOpenChange={() => undefined}
                currentTutorId="miya"
                onConfirm={onConfirm}
            />
        );

        const save = screen.getByRole("button", { name: "Сохранить" });

        expect(save).toBeDisabled();

        await user.click(screen.getByRole("radio", { name: "Нова" }));
        await user.click(save);

        expect(onConfirm).toHaveBeenCalledWith("nova");
    });
});
