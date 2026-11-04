// src/components/landing/pricing/PricingSection.tsx
// ARCHITECT: Toggle перенесен над карточками для идеальной симметрии и параллельности контента внутри карточек.

import { useState } from "react";
import { motion } from "framer-motion";

import { PricingToggle } from "./PricingToggle";
import { PricingCard } from "./PricingCard";
import { PRICING_PLANS } from "./data";
import type { BillingPeriod } from "./data";

export function PricingSection() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");

    return (
        <section id="pricing" className="relative w-full bg-black py-24 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-16 text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight text-[#f0f0f5] md:text-5xl">
                        Простые и честные тарифы
                    </h2>
                    <p className="mt-4 text-base text-[#f0f0f5]/60 md:text-lg">
                        Начни бесплатно, переходи на Pro когда будешь готов
                    </p>
                </motion.header>

                {/* ARCHITECT: Toggle размещен по центру над карточками. 
                    Это решает проблему асимметрии и делает карточки идеально параллельными. */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mb-12 flex justify-center"
                >
                    <PricingToggle
                        billingPeriod={billingPeriod}
                        onPeriodChange={setBillingPeriod}
                    />
                </motion.div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {PRICING_PLANS.map((plan) => (
                        <PricingCard
                            key={plan.id}
                            plan={plan}
                            billingPeriod={billingPeriod}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}