// ARCHITECT: очередь тостов. Хранилище держит только данные: время жизни задаёт Radix Toast
// (duration передаётся из Toaster), поэтому здесь нет таймеров, которые можно продублировать
// при повторном монтировании. ToastVariant живёт здесь, потому что это форма данных, а вид
// лишь её отображает.

import { create } from "zustand";
import { playSound } from "@/lib/sounds";

export type ToastVariant = "success" | "error" | "info";

// ARCHITECT: действие необязательно и живёт в самом тосте: сообщение о недоступном обновлении
// должно лечить проблему, а не только о ней сообщать.
export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastItem {
    id: string;
    variant: ToastVariant;
    title: string;
    description?: string;
    action?: ToastAction;
}

interface ToastState {
    toasts: ToastItem[];
    push: (toast: Omit<ToastItem, "id">) => string;
    dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    push: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        return id;
    },
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

// ARCHITECT: helper вызывается вне React: api-слой и обработчики меню не должны знать о хуках.
function pushToast(
    variant: ToastVariant,
    title: string,
    description?: string,
    action?: ToastAction
): void {
    useToastStore.getState().push({ variant, title, description, action });
    // ARCHITECT: сигнал живёт здесь, а не в Toaster: сообщение поднимают и вне React (api-слой), и такие
    // вызовы остались бы беззвучными, если бы звук зависел от разметки.
    playSound("alert");
}

export const toast = {
    success: (title: string, description?: string) => pushToast("success", title, description),
    error: (title: string, description?: string, action?: ToastAction) =>
        pushToast("error", title, description, action),
    info: (title: string, description?: string) => pushToast("info", title, description),
};
