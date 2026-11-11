// ARCHITECT: табы вход/регистрация — вынесены из AuthStep,
// чтобы компонент не превысил лимит 150 строк после добавления Google-входа.

import { cn } from "@/lib/utils";

export type AuthMode = "login" | "register";

interface AuthModeTabsProps {
    mode: AuthMode;
    onChange: (mode: AuthMode) => void;
}

const TABS: { id: AuthMode; label: string }[] = [
    { id: "register", label: "Регистрация" },
    { id: "login", label: "Вход" },
];

export function AuthModeTabs({ mode, onChange }: AuthModeTabsProps) {
    return (
        <div className="mb-6 flex rounded-xl bg-[#141416] p-1" role="tablist" aria-label="Способ входа">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        "min-h-11 flex-1 rounded-lg text-sm font-medium transition-colors",
                        mode === tab.id
                            ? "bg-[#1a1a1c] text-[#f0f0f5]"
                            : "text-[#f0f0f5]/50 hover:text-[#f0f0f5]/80"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}