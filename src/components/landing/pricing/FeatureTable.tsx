// src/components/landing/pricing/FeatureTable.tsx
// ARCHITECT: таблица функций с анимированными галочками (pathLength) и крестиками.
// ARCHITECT: каждая функция появляется с каскадной задержкой для премиального эффекта.

import { motion } from "framer-motion";
import type { Feature } from "./data";

interface FeatureTableProps {
    readonly features: readonly Feature[];
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="#f0f0f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
                d="M 5 12 L 10 17 L 19 7"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            />
        </svg>
    );
}

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M 6 6 L 18 18 M 18 6 L 6 18" className="opacity-30" />
        </svg>
    );
}

export function FeatureTable({ features }: FeatureTableProps) {
    return (
        <ul className="flex flex-col gap-3">
            {features.map((feature, index) => (
                <motion.li
                    key={feature.text}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex items-start gap-3"
                >
                    <span className="mt-0.5 shrink-0">
                        {feature.included ? <CheckIcon /> : <XIcon />}
                    </span>
                    <span className={`text-sm ${feature.included ? "text-[#f0f0f5]/80" : "text-[#f0f0f5]/30"}`}>
                        {feature.text}
                        {feature.limit && (
                            <span className="ml-1 text-xs text-[#f0f0f5]/40">({feature.limit})</span>
                        )}
                    </span>
                </motion.li>
            ))}
        </ul>
    );
}