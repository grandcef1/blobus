import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import type { MotionValue, Variants } from "framer-motion";
import { Languages, Volume2 } from "lucide-react";

import { ChatBlobatar } from "@/components/landing/ChatBlobatar";
import { MiniBlobatar } from "@/components/landing/MiniBlobatar";

const FEATURES = [
    {
        id: "personalization",
        title: "Персонализация под вас",
        description: "Выберите репетитора с подходящим характером и голосом",
        span: "md:col-span-2",
        delay: 0.1,
    },
    {
        id: "assessment",
        title: "5 минут до старта",
        description: "Адаптивный тест определит ваш уровень A1-C1",
        span: "md:col-span-1",
        delay: 0.2,
    },
    {
        id: "modes",
        title: "Режимы обучения",
        description: "От грамматики до собеседования — переключайтесь в любой момент",
        span: "md:col-span-1",
        delay: 0.3,
    },
    {
        id: "chat",
        title: "Живое общение с ИИ",
        description: "Мгновенная коррекция ошибок и объяснение правил",
        span: "md:col-span-2",
        delay: 0.4,
    },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

interface FeatureCardProps {
    title: string;
    children: ReactNode;
    description?: string;
    className?: string;
    delay: number;
    clip?: boolean;
}

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1 },
    },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

function FeatureCard({
    title,
    children,
    description,
    className,
    delay,
    clip,
}: FeatureCardProps) {
    return (
        <motion.div
            variants={cardVariants}
            transition={{ delay }}
            className={`group h-full rounded-3xl ${className ?? ""}`}
        >
            <motion.div
                className={`h-full rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/5 transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/15 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] group-hover:scale-[1.01] ${clip ? "overflow-hidden" : ""}`}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex h-full flex-col p-6 md:p-8">
                    <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4 md:text-xl">
                        {title}
                    </h3>
                    <div className="flex-1">{children}</div>
                    {description && (
                        <p className="mt-6 text-sm leading-relaxed text-[#f0f0f5]/60">
                            {description}
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

interface MiniBlobatarConfig {
    name: string;
    traits: Record<string, number | number[]>;
}

const MINI_BLOBATARS: MiniBlobatarConfig[] = [
    { name: "Мия", traits: { shape: 0.8, hue: 0.92, tone: [0.6, 0.9], "eye.gap": 0.4, "eye.rx": 0.7, "eye.lean": 0.2, "body.r": 0.3, "body.n": 0.6 } },
    { name: "Оскар", traits: { shape: 0.2, hue: 0.55, tone: [0.3, 0.6], "eye.gap": 0.25, "eye.rx": 1.2, "eye.lean": 0.6, "body.r": 0.7, "body.n": 1.3 } },
    { name: "Луна", traits: { shape: 0.65, hue: 0.72, tone: [0.4, 0.7], "eye.gap": 0.35, "eye.rx": 0.9, "eye.lean": 0.3, "body.r": 0.4, "body.ratio": 0.2 } },
    { name: "Макс", traits: { shape: 0.15, hue: 0.08, tone: [0.5, 0.85], "eye.gap": 0.5, "eye.rx": 1.1, "eye.lean": 0.1, "body.r": 0.8, "body.n": 1.5 } },
    { name: "Алекс", traits: { shape: 0.45, hue: 0.33, tone: [0.25, 0.55], "eye.gap": 0.28, "eye.rx": 0.85, "eye.lean": 0.45, "body.r": 0.5, "body.n": 0.9 } },
    { name: "Зои", traits: { shape: 0.9, hue: 0.15, tone: [0.55, 0.9], "eye.gap": 0.42, "eye.rx": 0.65, "eye.lean": 0.25, "body.r": 0.25, "body.ratio": -0.1 } },
    { name: "Нова", traits: { shape: 0.55, hue: 0.45, tone: [0.5, 0.8], "eye.gap": 0.32, "eye.rx": 0.95, "eye.lean": 0.35, "body.r": 0.45, "body.n": 1.0 } },
    { name: "Кай", traits: { shape: 0.35, hue: 0.62, tone: [0.35, 0.65], "eye.gap": 0.38, "eye.rx": 1.05, "eye.lean": 0.42, "body.r": 0.55, "body.n": 1.1 } },
    { name: "Лира", traits: { shape: 0.75, hue: 0.82, tone: [0.45, 0.75], "eye.gap": 0.45, "eye.rx": 0.75, "eye.lean": 0.28, "body.r": 0.35, "body.ratio": 0.15 } },
    { name: "Орион", traits: { shape: 0.25, hue: 0.18, tone: [0.4, 0.7], "eye.gap": 0.48, "eye.rx": 1.15, "eye.lean": 0.15, "body.r": 0.65, "body.n": 1.4 } },
];

const MARQUEE_SPEED_PX_PER_SEC = 50;

function usePingPongX(
    viewportRef: RefObject<HTMLDivElement | null>,
    trackRef: RefObject<HTMLDivElement | null>,
    speedPxPerSec: number,
): MotionValue<number> {
    const xMotion = useMotionValue(0);
    const [distance, setDistance] = useState(0);

    useEffect(() => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;

        const measure = (): void => {
            const next = Math.max(0, track.scrollWidth - viewport.clientWidth);
            setDistance(next);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        observer.observe(track);
        return () => observer.disconnect();
    }, [viewportRef, trackRef]);

    useAnimationFrame((t) => {
        if (distance <= 0) {
            xMotion.set(0);
            return;
        }
        const periodMs = ((2 * distance) / speedPxPerSec) * 1000;
        const phase = (t % periodMs) / periodMs;
        const triangle = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        xMotion.set(-distance * triangle);
    });

    return xMotion;
}

function BlobatarMarquee() {
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const xMotion = usePingPongX(viewportRef, trackRef, MARQUEE_SPEED_PX_PER_SEC);

    return (
        <div ref={viewportRef} className="relative w-full overflow-hidden py-2">
            <motion.div
                ref={trackRef}
                className="flex w-max shrink-0 gap-8"
                style={{ x: xMotion }}
            >
                {[0, 1, 2].map((copy) =>
                    MINI_BLOBATARS.map((blob, index) => (
                        <div
                            key={`${blob.name}-${copy}-${index}`}
                            className="flex w-24 shrink-0 flex-col items-center gap-3"
                            aria-hidden={copy > 0 ? true : undefined}
                        >
                            <MiniBlobatar name={blob.name} traits={blob.traits} />
                            <span className="whitespace-nowrap text-xs font-medium text-[#f0f0f5]/60">
                                {blob.name}
                            </span>
                        </div>
                    )),
                )}
            </motion.div>
        </div>
    );
}

const STEPS = [
    { label: "Знакомство", duration: "1 мин" },
    { label: "Тест", duration: "7 мин" },
    { label: "Цели", duration: "1 мин" },
    { label: "Расписание", duration: "1 мин" },
    { label: "Урок", duration: "сразу" },
] as const;

const NODE_DELAY_BASE = 0.2;
const STEP_INTERVAL = 0.5;

interface StepNodeProps {
    index: number;
}

function StepNode({ index }: StepNodeProps) {
    const delay = NODE_DELAY_BASE + index * STEP_INTERVAL;

    return (
        <motion.div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
            initial={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)" }}
            whileInView={{ backgroundColor: "#f0f0f5", borderColor: "#f0f0f5" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.3, delay }}
        >
            <motion.span
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: delay + 0.2, duration: 0.25, ease: "easeOut" }}
                className="text-[9px] font-bold text-black"
                aria-hidden="true"
            >
                ✓
            </motion.span>
        </motion.div>
    );
}

interface StepSegmentProps {
    index: number;
}

function StepSegment({ index }: StepSegmentProps) {
    return (
        <div
            className="relative my-1.5 min-h-4 w-0.5 flex-1 overflow-hidden rounded-full bg-white/10"
            aria-hidden="true"
        >
            <motion.div
                className="absolute inset-0 origin-top bg-gradient-to-b from-[#f0f0f5]/40 to-[#f0f0f5]"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                    duration: 0.35,
                    delay: NODE_DELAY_BASE + index * STEP_INTERVAL + 0.25,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}

interface StepRowProps {
    label: string;
    duration: string;
}

function StepRow({ label, duration }: StepRowProps) {
    return (
        <div className="flex h-5 flex-1 items-center self-start">
            <span className="text-sm leading-5 text-[#f0f0f5]/70">{label}</span>
            <span
                className="mx-3 flex-1 border-b border-dotted border-white/10"
                aria-hidden="true"
            />
            <span className="text-xs tabular-nums whitespace-nowrap text-[#f0f0f5]/40">
                {duration}
            </span>
        </div>
    );
}

function ProgressSteps() {
    return (
        <div className="flex h-full flex-col">
            <ol aria-label="Шаги онбординга" className="flex flex-1 flex-col">
                {STEPS.map((step, index) => {
                    const isLast = index === STEPS.length - 1;
                    return (
                        <li key={step.label} className={`flex gap-3.5 ${isLast ? "" : "flex-1"}`}>
                            <div className="flex flex-col items-center">
                                <StepNode index={index} />
                                {!isLast && <StepSegment index={index} />}
                            </div>
                            <StepRow label={step.label} duration={step.duration} />
                        </li>
                    );
                })}
            </ol>
            <p className="mt-6 text-sm text-[#f0f0f5]/60">
                Адаптивный тест определит ваш уровень A1-C1
            </p>
        </div>
    );
}

const MODES = [
    { id: "interview", label: "Interview Prep", hint: "Собеседование", badge: "Popular" },
    { id: "speaking", label: "Speaking Practice", hint: "Разговорная практика", badge: null },
    { id: "grammar", label: "Grammar Focus", hint: "Грамматика", badge: null },
    { id: "general", label: "General English", hint: "Общее изучение", badge: null },
] as const;

type Mode = (typeof MODES)[number];

interface ModeTileProps {
    mode: Mode;
    index: number;
}

function ModeTile({ mode, index }: ModeTileProps) {
    const isPopular = mode.badge !== null;

    return (
        <motion.li
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 + index * 0.08 }}
            className={`flex flex-col justify-between gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-sm transition-colors duration-300 ${
                isPopular
                    ? "border-white/20 bg-white/[0.06] hover:border-white/30"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-snug text-[#f0f0f5]">
                    {mode.label}
                </span>
                {mode.badge && (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1">
                        <span
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f0f0f5]"
                            aria-hidden="true"
                        />
                        <span className="whitespace-nowrap text-[9px] font-medium text-[#f0f0f5]">
                            {mode.badge}
                        </span>
                    </span>
                )}
            </div>
            <div className="flex items-end justify-between gap-2">
                <span className="text-xs text-[#f0f0f5]/50">{mode.hint}</span>
                <span className="text-[10px] tabular-nums text-[#f0f0f5]/25" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                </span>
            </div>
        </motion.li>
    );
}

function ModeShowcase() {
    return (
        <ul aria-label="Режимы обучения" className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2">
            {MODES.map((mode, index) => (
                <ModeTile key={mode.id} mode={mode} index={index} />
            ))}
        </ul>
    );
}

interface ChatMessage {
    author: "bot" | "user";
    text: string;
    widthClass: string;
}

const CHAT_MESSAGES: ChatMessage[] = [
    {
        author: "bot",
        text: "Tell me about your weekend.",
        widthClass: "max-w-[220px] text-lg",
    },
    {
        author: "user",
        text: "I go to cinema with my friends.",
        widthClass: "max-w-[90%]",
    },
    {
        author: "bot",
        text: `Nice! Correct form: "I went to the cinema." Let's practice the Past Simple.`,
        widthClass: "max-w-[90%]",
    },
];

function ChatPreview() {
    return (
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center justify-center gap-6 md:flex-row md:gap-12">
            <div className="flex min-w-0 w-full flex-1 flex-col gap-4">
                {CHAT_MESSAGES.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: message.author === "user" ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + index * 0.5 }}
                        className={`flex min-w-0 max-w-full items-end gap-2 ${message.author === "user" ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                        {/* ARCHITECT: relative + pb-8 для бота создают пространство внутри пузыря
                           для кнопок действий справа снизу. */}
                        <div
                            className={`relative min-w-0 break-words rounded-2xl px-4 py-3 text-sm [overflow-wrap:anywhere] ${
                                message.author === "user"
                                    ? "rounded-br-md bg-[#f0f0f5] text-black"
                                    : "rounded-bl-md bg-white/10 text-[#f0f0f5]"
                            } ${message.widthClass}`}
                        >
                            <div className={message.author === "bot" ? "pb-8 pr-2" : ""}>
                                {message.text}
                            </div>

                            {/* ARCHITECT: Кнопки действий перенесены внутрь пузыря, справа снизу.
                               Размер уменьшен до size-7 (кнопка) и size-3.5 (иконка) для элегантности. */}
                            {message.author === "bot" && (
                                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1.5">
                                    <motion.button
                                        type="button"
                                        className="flex size-7 items-center justify-center rounded-full bg-black/10 text-[#f0f0f5]/60 transition-colors hover:bg-black/20 hover:text-[#f0f0f5]"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label="Прослушать"
                                    >
                                        <Volume2 className="size-3.5" aria-hidden="true" />
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        className="flex size-7 items-center justify-center rounded-full bg-black/10 text-[#f0f0f5]/60 transition-colors hover:bg-black/20 hover:text-[#f0f0f5]"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label="Перевести"
                                    >
                                        <Languages className="size-3.5" aria-hidden="true" />
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.3, delay: 0.2 + CHAT_MESSAGES.length * 0.5 }}
                    className="flex w-fit self-start items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/10 px-4 py-3"
                    aria-hidden="true"
                >
                    {[0, 1, 2].map((dot) => (
                        <motion.span
                            key={dot}
                            className="h-1.5 w-1.5 rounded-full bg-[#f0f0f5]/60"
                            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2, ease: "easeInOut" }}
                        />
                    ))}
                </motion.div>

                <p className="mt-4 text-xs text-[#f0f0f5]/40">
                    Воспроизведение голосом и перевод
                </p>
            </div>

            {/* ARCHITECT (RESPONSIVE FIX): на mobile блобатар превью был 160px (h-40 w-40) —
                визуально терялся внутри широкой карточки. Теперь h-60 w-60 (240px) на mobile
                и h-72 w-72 (288px) на sm — заметный якорь карточки; в контент карточки
                (≈310px на 390px-вьюпорте) помещается без клипа.
                Десктопные md:h-80 md:w-80 md:scale-240 md:translate-* НЕ тронуты. */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex w-full shrink-0 items-center justify-center md:w-auto md:pl-4"
            >
                <div className="h-60 w-60 sm:h-72 sm:w-72 md:h-80 md:w-80 md:scale-240 md:translate-x-18 md:translate-y-3">
                    <ChatBlobatar />
                </div>
            </motion.div>
        </div>
    );
}

function FeatureContent({ id }: { id: FeatureId }) {
    switch (id) {
        case "personalization":
            return <BlobatarMarquee />;
        case "assessment":
            return <ProgressSteps />;
        case "modes":
            return <ModeShowcase />;
        case "chat":
            return <ChatPreview />;
    }
}

export function FeaturesSection() {
    return (
        <section id="features" className="relative w-full overflow-hidden bg-black py-24">
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-black to-black"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-16"
                >
                    <h2 className="mb-4 text-4xl font-bold text-[#f0f0f5] md:text-5xl">
                        Всё, что нужно для свободного английского
                    </h2>
                    <p className="max-w-2xl text-base leading-relaxed text-[#f0f0f5]/60 md:text-lg">
                        Персональный ИИ-репетитор, который адаптируется под ваши цели
                    </p>
                </motion.header>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="grid grid-cols-1 gap-6 md:grid-cols-2"
                >
                    {FEATURES.map((feature) => (
                        <FeatureCard
                            key={feature.id}
                            title={feature.title}
                            delay={feature.delay}
                            className={feature.span}
                            clip={feature.id === "chat"}
                            description={feature.id === "assessment" ? undefined : feature.description}
                        >
                            <FeatureContent id={feature.id} />
                        </FeatureCard>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}