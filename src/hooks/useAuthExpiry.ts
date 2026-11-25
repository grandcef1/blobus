// ARCHITECT: единая реакция на терминальный 401: несколько read-хуков на одной странице (профиль, список
// сессий) дают ровно один тост и один редирект. 401 терминальный — apiFetch уже пытался refresh,
// поэтому signOut не вызываем: сетевой вызов на мёртвой сессии не нужен.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

// ARCHITECT: 3 с — время прочитать тост перед уходом на /login.
const REDIRECT_DELAY_MS = 3000;

// ARCHITECT: единый гард для всех read-хуков: сайдбар и страница монтируют несколько потребителей,
// реакция строго одна. Сбрасывается при успешной загрузке и при размонтировании — новый экран
// начинает новый эпизод.
let handled = false;

/**
 * Реагирует на терминальный 401 из query-результата: очищает локальную сессию, показывает тост и
 * уводит на /login через 3 секунды. Возврат значения не нужен — побочные эффекты принадлежат хуку.
 */
export function useAuthExpiry(error: unknown, isSuccess: boolean): void {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const redirectTimer = useRef<number | null>(null);

    const sessionExpired = error instanceof ApiError && error.statusCode === 401;

    useEffect(() => {
        if (isSuccess) handled = false;
    }, [isSuccess]);

    // ARCHITECT: setState до навигации, иначе /login редиректит вошедшего обратно.
    useEffect(() => {
        if (!sessionExpired || handled) return;

        handled = true;
        useAuthStore.setState({ user: null });
        toast.error(t("errors.sessionExpired"));
        redirectTimer.current = window.setTimeout(() => {
            navigate("/login", { replace: true });
        }, REDIRECT_DELAY_MS);
    }, [sessionExpired, navigate, t]);

    // ARCHITECT: таймер и гард снимаются только при размонтировании. Эффект 401 намеренно без cleanup:
    // повторное срабатывание (смена ключа запроса) не должно гасить уже запланированный редирект.
    useEffect(
        () => () => {
            if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
            handled = false;
        },
        []
    );
}
