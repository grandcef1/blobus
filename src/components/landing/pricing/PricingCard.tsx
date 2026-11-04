// src/components/landing/pricing/PricingCard.tsx
// ARCHITECT: карточка тарифа с бесконечным плавным border и вынесенным фоновым свечением.
// ARCHITECT: кнопки на одном уровне через flex flex-col h-full + mt-auto.

import { motion } from "framer-motion";
import type { PricingPlan, BillingPeriod } from "./data";
import { FEATURES } from "./data";
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
            className="relative flex flex-col h-full"
        >
            {/* ARCHITECT: единая обертка с классом 'group' для синхронного hover-эффекта */}
            <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative flex flex-col h-full group"
            >
                {/* ARCHITECT: фоновое свечение для Pro-карточки.
                    Вынесено ЗА пределы карточки (-inset-6), с огромным blur (80px).
                    Это создает мягкую, премиальную ауру, которая усиливается при hover. */}
                {plan.highlighted && (
                    <div
                        className="absolute -inset-6 rounded-3xl opacity-40 transition-opacity duration-700 group-hover:opacity-70"
                        style={{
                            background: "radial-gradient(circle at 50% 50%, rgba(240,240,245,0.2) 0%, transparent 65%)",
                        }}
                        aria-hidden="true"
                    />
                )}

                {/* ARCHITECT: бейдж с текстом "Непревзойденная цена" */}
                {plan.highlighted && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="absolute -top-4 left-1/2 z-30 -translate-x-1/2"
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-4 py-1.5 text-xs font-medium text-[#f0f0f5] backdrop-blur-sm shadow-lg">
                            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M 12 3 L 14 9 L 20 9 L 15 13 L 17 19 L 12 15 L 7 19 L 9 13 L 4 9 L 10 9 Z" />
                            </svg>
                            Непревзойденная цена
                        </span>
                    </motion.div>
                )}

                {/* ARCHITECT: контейнер карточки с overflow-hidden для обрезки вращающегося градиента */}
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black p-8">
                    
                    {/* ARCHITECT: бесконечный плавный анимированный border (только для Pro).
                        Градиент математически симметричен (0% и 100% идентичны, пик на 50%).
                        При вращении на 360deg с linear easing стык абсолютно невидим. */}
                    {plan.highlighted && (
                        <motion.div
                            className="absolute inset-0 rounded-2xl"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            style={{
                                background: "conic-gradient(from 0deg, transparent 0%, rgba(240,240,245,0.2) 25%, rgba(240,240,245,0.9) 50%, rgba(240,240,245,0.2) 75%, transparent 100%)",
                                originX: "50%",
                                originY: "50%",
                                zIndex: 0,
                            }}
                            aria-hidden="true"
                        />
                    )}
                    
                    {/* ARCHITECT: внутренний черный слой, перекрывающий центр градиента. 
                        Оставляет видимым только тонкий край (1.5px), создавая эффект идеальной светящейся рамки. */}
                    <div className="absolute inset-[1.5px] rounded-2xl bg-black z-10" />

                    {/* ARCHITECT: контент карточки (z-20, чтобы быть поверх рамки) */}
                    <div className="relative z-20 flex h-full flex-col">
                        <div className="mb-6 flex justify-center">
                            <Visual />
                        </div>

                        <h3 className="mb-2 text-center text-2xl font-bold text-[#f0f0f5]">
                            {plan.name}
                        </h3>
                        <p className="mb-6 text-center text-sm text-[#f0f0f5]/60">
                            {plan.description}
                        </p>

                        <div className="mb-6 text-center">
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

                        <div className="mb-8 flex-1">
                            <FeatureTable features={FEATURES} planId={plan.id} />
                        </div>

                        <div className="mt-auto flex flex-col items-center gap-2">
                            <button
                                type="button"
                                className={`w-full rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 ${
                                    plan.highlighted
                                        ? "bg-[#f0f0f5] text-black hover:bg-white hover:shadow-[0_0_30px_rgba(240,240,245,0.4)]"
                                        : "border border-white/20 bg-transparent text-[#f0f0f5] hover:border-white/40 hover:bg-white/5"
                                }`}
                            >
                                {plan.cta}
                            </button>
                            <span className="text-xs text-[#f0f0f5]/40">
                                {plan.ctaSecondary}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}