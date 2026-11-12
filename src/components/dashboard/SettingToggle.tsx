// ARCHITECT: строка настроек с тумблером: подпись, пояснение и монохромный переключатель. Вынесена
// из страницы, чтобы настройки оставались в пределах лимита строк и читались по частям.

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SettingToggleProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
                <p className="mt-0.5 text-xs text-[#f0f0f5]/40">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={cn(
                    "relative ml-4 h-5 w-9 shrink-0 rounded-full transition-colors",
                    checked ? "bg-[#f0f0f5]" : "bg-[#1a1a1c]"
                )}
            >
                <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={cn(
                        "absolute top-0.5 size-4 rounded-full",
                        checked ? "left-[18px] bg-black" : "left-0.5 bg-[#f0f0f5]/60"
                    )}
                />
            </button>
        </div>
    );
}