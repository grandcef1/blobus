// ARCHITECT: экран фазы resolving: пока сессия не проверена, форма входа не рендерится — иначе
// пользователь с валидной кукой видел бы форму и только потом приложение. Вид минимальный: спиннер
// на чёрном фоне без каркаса полей — каркас снова обещал бы форму.
// ARCHITECT: aria-busy — тот же контракт ожидания, что у скелетонов проекта: тесты и скринридеры
// читают состояние по нему, а не по классам.

import { Loader2 } from "lucide-react";

export function AuthResolvingScreen() {
    return (
        <div className="flex min-h-dvh w-full items-center justify-center bg-black" aria-busy="true">
            <Loader2 className="size-5 animate-spin text-[#f0f0f5]/40" aria-hidden="true" />
        </div>
    );
}
