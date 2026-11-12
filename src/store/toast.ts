// ARCHITECT: очередь тостов. Хранилище держит только данные: время жизни задаёт Radix Toast
// (duration передаётся из Toaster), поэтому здесь нет таймеров, которые можно продублировать
// при повторном монтировании. ToastVariant живёт здесь, потому что это форма данных, а вид
// лишь её отображает.

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
    id: string;
    variant: ToastVariant;
    title: string;
    description?: string;
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
function pushToast(variant: ToastVariant, title: string, description?: string): void {
    useToastStore.getState().push({ variant, title, description });
}

export const toast = {
    success: (title: string, description?: string) => pushToast("success", title, description),
    error: (title: string, description?: string) => pushToast("error", title, description),
    info: (title: string, description?: string) => pushToast("info", title, description),
};
