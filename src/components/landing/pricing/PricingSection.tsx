// src/components/landing/pricing/PricingSection.tsx
// ARCHITECT: главный контейнер секции тарифов.
// ARCHITECT: управляет состоянием billingPeriod (month/year) и передает его в карточки.
// ARCHITECT: использует staggered анимацию для появления элементов.

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { PricingToggle } from "./PricingToggle";
import { PricingCard } from "./PricingCard";
import { PRICING_PLANS } from "./data";
import type { BillingPeriod } from "./data";

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.15 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

export function PricingSection() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");

    return (
        <section id="pricing" className="relative w-full bg-black py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                {/* ARCHITECT: заголовок секции */}
                <motion.header
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="mb-16 text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight text-[#f0f0f5] md:text-5xl">
                        Простые и честные тарифы
                    </h2>
                    <p className="mt-4 text-base text-[#f0f0f5]/60 md:text-lg">
                        Начни бесплатно, переходи на Pro когда будешь готов
                    </p>
                </motion.header>

                {/* ARCHITECT: Toggle месяц/год */}
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="mb-12 flex justify-center"
                >
                    <PricingToggle
                        billingPeriod={billingPeriod}
                        onPeriodChange={setBillingPeriod}
                    />
                </motion.div>

                {/* ARCHITECT: Карточки тарифов */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12"
                >
                    {PRICING_PLANS.map((plan) => (
                        <PricingCard
                            key={plan.id}
                            plan={plan}
                            billingPeriod={billingPeriod}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}