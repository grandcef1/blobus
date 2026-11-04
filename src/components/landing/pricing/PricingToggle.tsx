// src/components/landing/pricing/PricingToggle.tsx
// ARCHITECT: переключатель месяц/год с анимированным бейджем "Save 20%".
// ARCHITECT: бейдж появляется только при выборе "year" с плавной анимацией scale + fade.

import { motion, AnimatePresence } from "framer-motion";
import type { BillingPeriod } from "./data";

interface PricingToggleProps {
    readonly billingPeriod: BillingPeriod;
    readonly onPeriodChange: (period: BillingPeriod) => void;
}

export function PricingToggle({ billingPeriod, onPeriodChange }: PricingToggleProps) {
    return (
        <div className="flex items-center gap-4">
            <span className={`text-sm transition-colors duration-300 ${billingPeriod === "month" ? "text-[#f0f0f5]" : "text-[#f0f0f5]/40"}`}>
                Месяц
            </span>

            {/* ARCHITECT: кастомный toggle с анимированным ползунком (spring physics) */}
            <button
                type="button"
                onClick={() => onPeriodChange(billingPeriod === "month" ? "year" : "month")}
                className="relative h-6 w-11 rounded-full bg-white/10 transition-colors hover:bg-white/15"
                aria-label="Переключить период оплаты"
                aria-pressed={billingPeriod === "year"}
            >
                <motion.div
                    className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[#f0f0f5]"
                    animate={{ x: billingPeriod === "month" ? 0 : 20 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </button>

            <span className={`text-sm transition-colors duration-300 ${billingPeriod === "year" ? "text-[#f0f0f5]" : "text-[#f0f0f5]/40"}`}>
                Год
            </span>

            {/* ARCHITECT: бейдж "Save 20%" появляется только при выборе года */}
            <AnimatePresence>
                {billingPeriod === "year" && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-[#f0f0f5]/80"
                    >
                        Save 20%
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
}