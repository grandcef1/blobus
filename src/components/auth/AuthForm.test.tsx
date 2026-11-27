// ARCHITECT: порядок блоков формы входа — часть требования, а не оформление: вход через провайдера стоит
// над полями email/пароль, ниже идёт разделитель «или». Проверяется по DOM-порядку, а не по классам.

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthForm } from "@/components/auth/AuthForm";

/** true — узел left идёт раньше узла right в разметке. */
function precedes(left: HTMLElement, right: HTMLElement): boolean {
    return (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("AuthForm: порядок блоков", () => {
    it("провайдер и «или» стоят выше полей формы", async () => {
        render(
            <MemoryRouter>
                <AuthForm mode="login" showTabs={false} onAuthenticated={() => undefined} />
            </MemoryRouter>
        );

        const google = await screen.findByRole("button", { name: "Продолжить с Google" });
        const email = screen.getByLabelText("Почта");

        expect(precedes(google, email)).toBe(true);
        expect(precedes(screen.getByText("или"), email)).toBe(true);
    });
});
