// src/components/landing/pricing/PricingCard.tsx
// ARCHITECT: атомарный компонент карточки тарифа.
// ARCHITECT: для Pro-карточки используется анимированный border через conic-gradient + rotate.
// ARCHITECT: техника: внешний div с overflow-hidden + вращающийся градиентный слой + внутренний div с черным фоном.

import { motion } from "framer-motion";
import type { PricingPlan, BillingPeriod } from "./data";
import { FeatureTable } from "./FeatureTable";
import { FreeCardSvg } from "./visuals/FreeCardSvg";
import { ProCardSvg } from "./visuals/ProCardSvg";

interface PricingCardProps {
    readonly plan: PricingPlan;
    readonly billingPeriod: BillingPeriod;
}

export function PricingCard({ plan, billingPeriod }: PricingCardProps) {
    const price = billingPeriod === "month" ? plan.monthlyPrice : plan.yearlyPrice;
    const period = billingPeriod === "month" ? "/мес" : "/год";
    const Visual = plan.id === "pro" ? ProCardSvg : FreeCardSvg;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
        >
            {/* ARCHITECT: бейдж "Unbeatable Price" для Pro-карточки */}
            {plan.highlighted && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
                >
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-[#f0f0f5] backdrop-blur-sm">
                        ✨ Unbeatable Price
                    </span>
                </motion.div>
            )}

            {/* ARCHITECT: контейнер карточки с анимированным border для Pro */}
            <div className={`relative overflow-hidden rounded-2xl ${plan.highlighted ? "p-[1px]" : ""}`}>
                {/* ARCHITECT: анимированный градиентный border (только для Pro) */}
                {plan.highlighted && (
                    <motion.div
                        className="absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        style={{
                            background: "conic-gradient(from 0deg, transparent 0%, rgba(240,240,245,0.3) 25%, transparent 50%, rgba(240,240,245,0.3) 75%, transparent 100%)",
                            originX: "50%",
                            originY: "50%",
                        }}
                        aria-hidden="true"
                    />
                )}

                {/* ARCHITECT: внутренняя часть карточки */}
                <div className={`relative h-full rounded-2xl bg-black p-8 ${plan.highlighted ? "" : "border border-white/10"}`}>
                    {/* SVG-декорация */}
                    <div className="mb-6 flex justify-center">
                        <Visual />
                    </div>

                    {/* Заголовок и описание */}
                    <h3 className="mb-2 text-center text-2xl font-bold text-[#f0f0f5]">
                        {plan.name}
                    </h3>
                    <p className="mb-6 text-center text-sm text-[#f0f0f5]/60">
                        {plan.description}
                    </p>

                    {/* Цена */}
                    <div className="mb-8 text-center">
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-bold text-[#f0f0f5]">
                                ${price}
                            </span>
                            <span className="text-sm text-[#f0f0f5]/60">
                                {period}
                            </span>
                        </div>
                        {billingPeriod === "year" && plan.yearlyPrice > 0 && (
                            <p className="mt-1 text-xs text-[#f0f0f5]/40">
                                ${Math.round(plan.yearlyPrice / 12)}/мес при оплате за год
                            </p>
                        )}
                    </div>

                    {/* Таблица функций */}
                    <div className="mb-8">
                        <FeatureTable features={plan.features} />
                    </div>

                    {/* CTA кнопка */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            type="button"
                            className={`w-full rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ${
                                plan.highlighted
                                    ? "bg-[#f0f0f5] text-black hover:bg-white hover:shadow-[0_0_30px_rgba(240,240,245,0.3)]"
                                    : "border border-white/20 bg-transparent text-[#f0f0f5] hover:border-white/40 hover:bg-white/5"
                            }`}
                        >
                            {plan.cta}
                        </button>
                        {plan.ctaSecondary && (
                            <span className="text-xs text-[#f0f0f5]/40">
                                {plan.ctaSecondary}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}