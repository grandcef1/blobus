// ARCHITECT: гейт согласия для сторонних сервисов. Тест фиксирует главное обещание: без согласия код
// Sentry и Vercel не загружается вовсе, согласие включает сервисы, отзыв — гасит.

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Observability } from "@/components/shared/Observability";
import { useConsentStore } from "@/store/consent";
import { resetStores } from "@/test/utils";

const env = vi.hoisted(() => ({ SENTRY_DSN: "https://key@o0.ingest.sentry.io/0" }));
const sentry = vi.hoisted(() => ({
    init: vi.fn(),
    captureException: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/env", () => ({ SENTRY_DSN: env.SENTRY_DSN }));

// ARCHITECT: мокаются модули, а не сеть: проверяется решение загрузить сервис, а не его запросы.
vi.mock("@/lib/observability/sentry-client", () => ({
    init: sentry.init,
    captureException: sentry.captureException,
    close: sentry.close,
}));

vi.mock("@vercel/analytics/react", () => ({
    Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock("@vercel/speed-insights/react", () => ({
    SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

function giveConsent(): void {
    useConsentStore.getState().acceptAll();
}

beforeEach(() => {
    resetStores();
    sentry.init.mockClear();
    sentry.captureException.mockClear();
    sentry.close.mockClear();
    vi.stubEnv("PROD", true);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("Observability", () => {
    it("без согласия не грузит ни Sentry, ни Vercel", () => {
        const { container } = render(<Observability />);

        expect(container).toBeEmptyDOMElement();
        expect(sentry.init).not.toHaveBeenCalled();
    });

    it("в дев-сборке согласие не включает сторонние сервисы", () => {
        vi.stubEnv("PROD", false);
        giveConsent();

        const { container } = render(<Observability />);

        expect(container).toBeEmptyDOMElement();
        expect(sentry.init).not.toHaveBeenCalled();
    });

    it("в проде с согласием включает Sentry и Vercel", async () => {
        giveConsent();

        render(<Observability />);

        expect(await screen.findByTestId("vercel-analytics")).toBeInTheDocument();
        expect(screen.getByTestId("vercel-speed-insights")).toBeInTheDocument();
        await waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));
        expect(sentry.init).toHaveBeenCalledWith(
            expect.objectContaining({ dsn: env.SENTRY_DSN, environment: "production" })
        );
    });

    it("отзыв согласия закрывает SDK и снимает Vercel-компоненты", async () => {
        giveConsent();
        render(<Observability />);
        await waitFor(() => expect(sentry.init).toHaveBeenCalledTimes(1));

        act(() => useConsentStore.getState().resetDecision());

        await waitFor(() => expect(sentry.close).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
        expect(screen.queryByTestId("vercel-speed-insights")).not.toBeInTheDocument();
    });
});
