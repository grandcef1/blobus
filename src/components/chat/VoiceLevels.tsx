// ARCHITECT: индикатор записи: пульсирующая точка, таймер и полосы уровня. Вынесен отдельным компонентом, чтобы
// тело панели записи оставалось в пределах 150 строк (§5.2), а движение здесь — украшение: при
// prefers-reduced-motion и после отказа записи оно выключается (§7.1).

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface VoiceLevelsProps {
    readonly seconds: number;
    /** Движение выключено: reduced motion или запись уже не продолжается. */
    readonly motionOff: boolean;
}

// ARCHITECT: полосы одинаковой толщины и разной высоты: это индикатор, а не график — палитра монохромная.
const LEVEL_BARS = [0.45, 0.85, 1, 0.6, 0.75];

/** Длительность записи: минуты и секунды, как в мессенджерах. */
function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function VoiceLevels({ seconds, motionOff }: VoiceLevelsProps) {
    const { t } = useTranslation("chat");

    return (
        <>
            <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
                <motion.span
                    className="size-2.5 rounded-full bg-[#f0f0f5]"
                    animate={motionOff ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                    transition={
                        motionOff
                            ? { duration: 0 }
                            : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                    }
                />
            </span>

            <span
                className="shrink-0 text-xs tabular-nums text-[#f0f0f5]/60"
                aria-label={t("input.record.duration")}
            >
                {formatDuration(seconds)}
            </span>

            <div className="flex h-8 shrink-0 items-end gap-0.5" aria-hidden="true">
                {LEVEL_BARS.map((level, index) => (
                    <motion.span
                        key={index}
                        className="w-0.5 rounded-full bg-[#f0f0f5]/50"
                        initial={{ height: 8 }}
                        animate={
                            motionOff ? { height: 24 * level } : { height: [6, 26 * level, 10] }
                        }
                        transition={
                            motionOff
                                ? { duration: 0 }
                                : {
                                      duration: 0.9,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                      delay: index * 0.12,
                                  }
                        }
                    />
                ))}
            </div>
        </>
    );
}
