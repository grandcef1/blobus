// src/components/landing/pricing/PricingCard.tsx
// ARCHITECT: карточка тарифа без анимации рамки: вращающийся conic-gradient убран — он
// дёргался на слабых машинах и выглядел дёшево. Pro выделяется статично: приподнятая
// поверхность bg-white/[0.04], граница border-white/15, бейдж «Популярный» и один очень
// слабый радиальный слой внутри карточки. Остальные тарифы спокойнее по контрасту, не по
// движению.
// ARCHITECT: кнопки на одном уровне через flex flex-col h-full + mt-auto.

import { motion } from "framer-motion";
import type { PricingPlan, BillingPeriod } from "./data";
import { FEATURES } from "./data";
import { FeatureTable } from "./FeatureTable";
import { FreeCardSvg } from "./visuals/FreeCardSvg";
import { ProCardSvg } from "./visuals/ProCardSvg";
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

interface PricingCardProps {
    readonly plan: PricingPlan;
    readonly billingPeriod: BillingPeriod;
}

// ARCHITECT: две поверхности тарифов вместо ветвления классов внутри разметки.
const PRO_SURFACE =
    "border-white/15 bg-white/[0.04] bg-[radial-gradient(ellipse_at_50%_0%,rgba(240,240,245,0.06),transparent_65%)]";
const QUIET_SURFACE = "border-white/10 bg-black";

export function PricingCard({ plan, billingPeriod }: PricingCardProps) {
    const navigate = useNavigate();

    const handleCTA = () => {
        // ARCHITECT: Обе CTA ведут на онбординг
        navigate('/onboarding');
    };
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
            {/* ARCHITECT: обёртка карточки: hover-подъём общий для обоих тарифов, поэтому Pro
                выделяется контрастом поверхности, а не движением. */}
            <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative flex flex-col h-full"
            >
                {/* ARCHITECT: бейдж «Популярный» — статичная метка тарифа: без иконки и блюра. */}
                {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-[#141416] px-3 py-1 text-xs font-medium text-[#f0f0f5]">
                            Популярный
                        </span>
                    </div>
                )}

                {/* ARCHITECT: поверхность карточки. У Pro — приподнятая и слоистая: заливка
                    white/[0.04] плюс один очень слабый радиальный слой в палитре проекта.
                    Остальные тарифы спокойнее, чтобы Pro выделялся контрастом. */}
                <div
                    className={cn(
                        "relative flex h-full flex-col overflow-hidden rounded-2xl border p-8",
                        plan.highlighted ? PRO_SURFACE : QUIET_SURFACE
                    )}
                >
                    <div className="relative flex h-full flex-col">
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
                                onClick={handleCTA}
                                className={`w-full rounded-full px-6 py-3 text-sm font-medium transition-colors duration-200 ${plan.highlighted
                                        ? "bg-[#f0f0f5] text-black hover:bg-white"
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