// ARCHITECT: защита сегмента /app/*. Реальный auth-store отдаёт user вместо готового флага
// isAuthenticated, поэтому статус вычисляется здесь — единственном месте, где политика
// «пустой user = гость» превращается в маршрутное решение.
// ARCHITECT: фаза resolving отделена от гостя: пока сессия проверяется, пользователя нельзя
// отправлять на форму входа — иначе форма мигнёт у того, кто уже авторизован.

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import i18n from "@/lib/i18n";
import { selectAuthStatus, useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import { AuthResolvingScreen } from "./AuthResolvingScreen";

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    // ARCHITECT: селектор возвращает строку-фазу, поэтому компонент не перерисовывается
    // на каждое изменение объекта пользователя — только при смене фазы.
    const status = useAuthStore(selectAuthStatus);
    const location = useLocation();

    // ARCHITECT: тост рождается во время монтирования-размонтирования, а не во время рендера:
    // push() меняет глобальный zustand-store, и из тела рендера это было бы побочным эффектом.
    // ARCHITECT: guard не рендерит переводимый текст, тост — побочный эффект редиректа, поэтому ключ
    // резолвит синглтон в момент вызова: хук тут не нужен, а t в deps повторял бы тост при смене языка.
    useEffect(() => {
        if (status === "anonymous") {
            toast.error(
                i18n.t("guards.authTitle", { ns: "common" }),
                i18n.t("guards.authDescription", { ns: "common" })
            );
        }
    }, [status]);

    // ARCHITECT: пока сессия проверяется, показывается лоадер: ни формы входа, ни приложения.
    if (status === "resolving") return <AuthResolvingScreen />;

    if (status === "anonymous") {
        // ARCHITECT: state.from сохраняет точку входа: после логина форму можно вернуть
        // туда, куда пользователь изначально шёл, а не на пустой «Обзор».
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
}