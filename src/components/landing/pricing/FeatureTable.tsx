// src/components/landing/pricing/FeatureTable.tsx
// ARCHITECT: таблица функций с разделителями между пунктами.
// ARCHITECT: использует единый список FEATURES, показывает статус для конкретного плана.
// ARCHITECT: недоступные функции в Free показаны с крестиком и пониженной прозрачностью.

import { motion } from "framer-motion";
import type { Feature } from "./data";

interface FeatureTableProps {
    readonly features: readonly Feature[];
    readonly planId: "free" | "pro";
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="#f0f0f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
                d="M 5 12 L 10 17 L 19 7"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
        </svg>
    );
}

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 6 6 L 18 18 M 18 6 L 6 18" className="opacity-30" />
        </svg>
    );
}

export function FeatureTable({ features, planId }: FeatureTableProps) {
    return (
        <ul className="flex flex-col">
            {features.map((feature, index) => {
                const isIncluded = planId === "free" ? feature.freeIncluded : feature.proIncluded;
                const limit = planId === "free" ? feature.freeLimit : undefined;
                const isLast = index === features.length - 1;

                return (
                    <li key={feature.text}>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: index * 0.08 }}
                            className="flex items-center gap-3 py-3"
                        >
                            <span className="shrink-0">
                                {isIncluded ? <CheckIcon /> : <XIcon />}
                            </span>
                            <span className={`flex-1 text-sm ${isIncluded ? "text-[#f0f0f5]/80" : "text-[#f0f0f5]/30"}`}>
                                {feature.text}
                                {limit && (
                                    <span className="ml-1.5 text-xs text-[#f0f0f5]/40">
                                        · {limit}
                                    </span>
                                )}
                            </span>
                        </motion.div>
                        
                        {/* ARCHITECT: тонкий разделитель между пунктами, кроме последнего */}
                        {!isLast && (
                            <div className="h-px bg-white/5" aria-hidden="true" />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}