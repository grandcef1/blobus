// ARCHITECT: гейт админ-раздела. Стоит внутри /app, поэтому факт входа уже проверил ProtectedRoute,
// и здесь остаётся только роль. ARCHITECT: фронт-гейт — это UX (экран не открывается, пункт меню
// скрыт); реальная проверка роли будет на бэкенде (RLS), потому что список email в бандле публичен.

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import i18n from "@/lib/i18n";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

interface AdminRouteProps {
    children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
    // ARCHITECT: селектор отдаёт примитив (строку роли), поэтому компонент не перерисовывается на
    // каждое изменение объекта пользователя — только при смене роли.
    const isAdmin = useAuthStore((state) => state.user?.role === "admin");

    // ARCHITECT: тост рождается в эффекте, а не в рендере: push() меняет глобальный zustand-store,
    // и из тела рендера это было бы побочным эффектом.
    // ARCHITECT: guard не рендерит переводимый текст, тост — побочный эффект редиректа, поэтому ключ
    // резолвит синглтон в момент вызова: хук тут не нужен, а t в deps повторял бы тост при смене языка.
    useEffect(() => {
        if (!isAdmin) {
            toast.error(
                i18n.t("guards.adminTitle", { ns: "common" }),
                i18n.t("guards.adminDescription", { ns: "common" })
            );
        }
    }, [isAdmin]);

    if (!isAdmin) return <Navigate to={APP_HOME_PATH} replace />;

    return <>{children}</>;
}
