// ARCHITECT: два уровня motion-элементов разделяют трансформации: внешний двигает по y,
// внутренний отвечает за scale. Совмещение их на одном узле конфликтует (см. project-rules 7.3).

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShouldShowScrollToTop } from "@/hooks/useShouldShowScrollToTop";

interface ScrollToTopButtonProps {
    threshold?: number;
    label?: string;
    className?: string;
}

const DEFAULT_LABEL = "Scroll to top";

export function ScrollToTopButton({
    threshold,
    label = DEFAULT_LABEL,
    className,
}: ScrollToTopButtonProps) {
    const shouldShow = useShouldShowScrollToTop(threshold);
    const prefersReducedMotion = useReducedMotion();

    const handleClick = (): void => {
        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? "auto" : "smooth",
        });
    };

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: "easeOut" }}
                    className={cn("fixed right-5 bottom-5 z-40 md:right-8 md:bottom-8", className)}
                >
                    <motion.button
                        type="button"
                        onClick={handleClick}
                        aria-label={label}
                        initial={{ scale: 0.96 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: "easeOut" }}
                        className={cn(
                            "group flex h-11 w-11 items-center justify-center rounded-full",
                            "border border-white/5 bg-black/70 text-[#f0f0f5] shadow-lg shadow-black/40 backdrop-blur-xl",
                            "transition-colors hover:border-white/15",
                            "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
                        )}
                    >
                        <span
                            className={cn(
                                "block transition-transform duration-200",
                                !prefersReducedMotion && "group-hover:-translate-y-0.5"
                            )}
                        >
                            <ArrowUp size={18} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
