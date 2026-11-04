// src/components/landing/pricing/PricingToggle.tsx
// ARCHITECT: компактный toggle месяц/год в стиле "pill", размещенный над карточками.
// ARCHITECT: активный элемент подсвечивается белым, что выглядит дороже и профессиональнее.

import { motion } from "framer-motion";
import type { BillingPeriod } from "./data";

interface PricingToggleProps {
    readonly billingPeriod: BillingPeriod;
    readonly onPeriodChange: (period: BillingPeriod) => void;
}

export function PricingToggle({ billingPeriod, onPeriodChange }: PricingToggleProps) {
    return (
        <div className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1 backdrop-blur-sm">
            <button
                type="button"
                onClick={() => onPeriodChange("month")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                    billingPeriod === "month" 
                        ? "bg-[#f0f0f5] text-black" 
                        : "text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                }`}
            >
                Месяц
            </button>

            <button
                type="button"
                onClick={() => onPeriodChange("year")}
                className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-300 ${
                    billingPeriod === "year" 
                        ? "bg-[#f0f0f5] text-black" 
                        : "text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                }`}
            >
                Год
                {billingPeriod === "year" && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold"
                    >
                        −20%
                    </motion.span>
                )}
            </button>
        </div>
    );
}