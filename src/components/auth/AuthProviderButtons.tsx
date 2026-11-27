// ARCHITECT: кнопки провайдеров стоят НАД формой email/пароль, ниже — разделитель «или»: вход через
// провайдера — путь в один клик, поэтому он виден до полей; в мастер настройки та же форма приходит с
// тем же порядком, иначе два входа выглядели бы по-разному.
// ARCHITECT: показываем только то, что подтвердил сервер (§16.2); пока ответа нет или сервер недоступен,
// работает прежнее клиентское правило готовности — кнопка не мигает при загрузке формы.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GoogleAuthButton } from "@/components/onboarding/GoogleAuthButton";
import { fetchAuthProviders } from "@/api/authProviders";
import { GOOGLE_READY, USE_REAL_AUTH } from "@/api/auth";
import type { AuthProviderId } from "@/api/authProviders";

interface AuthProviderButtonsProps {
    onGoogle: () => void;
}

/** true — сервер подтвердил Google, либо ответа нет, а вход настроен на клиенте (мок или публичные ключи). */
function isGoogleEnabled(providers: readonly AuthProviderId[] | null): boolean {
    if (providers === null) return !USE_REAL_AUTH || GOOGLE_READY;

    return providers.includes("google");
}

export function AuthProviderButtons({ onGoogle }: AuthProviderButtonsProps) {
    const { t } = useTranslation("auth");
    // ARCHITECT: null — ответа ещё нет или сервер недоступен; это осознанное значение: по нему форма
    // остаётся на клиентской проверке готовности, а не прячет кнопку входа.
    const [providers, setProviders] = useState<readonly AuthProviderId[] | null>(null);

    useEffect(() => {
        let active = true;

        void fetchAuthProviders().then((list) => {
            if (active) setProviders(list);
        });

        return () => {
            active = false;
        };
    }, []);

    if (!isGoogleEnabled(providers)) return null;

    return (
        <div className="mb-6 flex flex-col gap-6">
            <GoogleAuthButton onAuthenticated={onGoogle} />

            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-[#f0f0f5]/40">{t("actions.or")}</span>
                <div className="h-px flex-1 bg-white/10" />
            </div>
        </div>
    );
}

