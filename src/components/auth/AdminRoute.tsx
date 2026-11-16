// ARCHITECT: гейт админ-раздела. Стоит внутри /app, поэтому факт входа уже проверил ProtectedRoute,
// и здесь остаётся только роль. ARCHITECT: фронт-гейт — это UX (экран не открывается, пункт меню
// скрыт); реальная проверка роли будет на бэкенде (RLS), потому что список email в бандле публичен.

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
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
    useEffect(() => {
        if (!isAdmin) {
            toast.error("Нет доступа", "Раздел доступен только администратору.");
        }
    }, [isAdmin]);

    if (!isAdmin) return <Navigate to={APP_HOME_PATH} replace />;

    return <>{children}</>;
}
