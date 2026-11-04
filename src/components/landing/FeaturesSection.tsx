// src/components/landing/FeaturesSection.tsx
import type { ReactNode } from "react";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Volume2 } from "lucide-react";

import { MiniBlobatar } from "@/components/landing/MiniBlobatar";

// ARCHITECT: палитра секции — та же монохромная тема, что и в Hero (#f0f0f5 на чёрном).

const FEATURES = [
    {
        id: "personalization",
        title: "Персонализация под вас",
        description: "Выберите репетитора с подходящим характером и голосом",
        span: "md:col-span-2", // Ряд 1: Широкий блок с бегущей строкой
        delay: 0.1,
    },
    {
        id: "assessment",
        title: "5 минут до старта",
        description: "Адаптивный тест определит ваш уровень A1-C1",
        span: "md:col-span-1", // Ряд 2, левая часть
        delay: 0.2,
    },
    {
        id: "modes",
        title: "Режимы обучения",
        description: "Подготовка к собеседованию или общее изучение",
        span: "md:col-span-1", // Ряд 2, правая часть (идеально заполнит ряд)
        delay: 0.3,
    },
    {
        id: "chat",
        title: "Живое общение с ИИ",
        description: "Мгновенная коррекция ошибок и объяснение правил",
        span: "md:col-span-2", // Ряд 3: Широкий блок с чатом
        delay: 0.4,
    },
] as const;

type FeatureId = (typeof FEATURES)[number]["id"];

interface FeatureCardProps {
    title: string;
    description: string;
    children: ReactNode;
    className?: string;
    delay: number;
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
    description,
    children,
    className,
    delay,
}: FeatureCardProps) {
    return (
        <motion.div
            variants={cardVariants}
            transition={{ delay }}
            className={`group h-full rounded-3xl ${className ?? ""}`}
        >
            <motion.div
                className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/5 transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/15 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] group-hover:scale-[1.01]"
                whileTap={{ scale: 0.99 }}
            >
                <div className="p-6 md:p-8 flex flex-col h-full">
                    <h3 className="text-lg md:text-xl font-semibold text-[#f0f0f5] mb-4">
                        {title}
                    </h3>
                    <div className="flex-1">{children}</div>
                    {/* ARCHITECT: описание вынесено вниз карточки для выравнивания; flex-1 у контента
              не даёт тексту «уехать» вверх, если содержимого мало */}
                    <p className="text-[#f0f0f5]/60 text-sm leading-relaxed mt-4">
                        {description}
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ARCHITECT: фикс TS2322 — `as const` делал tone readonly-кортежем ([0.1, 0.28]),
// который не присваивается типу number[] в Record<string, number | number[]>.
// Явная аннотация типа + приведение литерала кортежа к mutable number[] решают проблему,
// сохраняя строгую типизацию (никаких any).
interface MiniBlobatarSpec {
    name: string;
    traits: Record<string, number | number[]>;
}

const MINI_BLOBATARS: readonly MiniBlobatarSpec[] = [
    {
        name: "Алекс",
        traits: {
            shape: 0.35,
            "body.r": 0.45,
            "body.ratio": 0,
            "body.n": 0.99,
            "eye.rx": 0.96,
            "eye.ratio": 0.16,
            "eye.n": 0.23,
            "eye.gap": 0.3,
            "eye.lean": 0.43,
            tone: [0.1, 0.28],
            hue: 0.8,
        },
    },
    {
        name: "Мия",
        traits: {
            shape: 0.65,
            "body.r": 0.3,
            "body.ratio": 0.2,
            "body.n": 0.8,
            "eye.rx": 0.8,
            "eye.ratio": 0.2,
            "eye.n": 0.3,
            "eye.gap": 0.4,
            "eye.lean": 0.3,
            tone: [0.15, 0.35],
            hue: 0.92,
        },
    },
    {
        name: "Оскар",
        traits: {
            shape: 0.2,
            "body.r": 0.6,
            "body.ratio": -0.1,
            "body.n": 1.2,
            "eye.rx": 1.1,
            "eye.ratio": 0.1,
            "eye.n": 0.2,
            "eye.gap": 0.25,
            "eye.lean": 0.5,
            tone: [0.05, 0.2],
            hue: 0.65,
        },
    },
    {
        name: "Луна",
        traits: {
            shape: 0.5,
            "body.r": 0.5,
            "body.ratio": 0.1,
            "body.n": 1.0,
            "eye.rx": 0.9,
            "eye.ratio": 0.15,
            "eye.n": 0.25,
            "eye.gap": 0.35,
            "eye.lean": 0.4,
            tone: [0.12, 0.3],
            hue: 0.75,
        },
    },
    {
        name: "Макс",
        traits: {
            shape: 0.4,
            "body.r": 0.4,
            "body.ratio": -0.05,
            "body.n": 1.1,
            "eye.rx": 1.0,
            "eye.ratio": 0.18,
            "eye.n": 0.22,
            "eye.gap": 0.28,
            "eye.lean": 0.45,
            tone: [0.08, 0.25],
            hue: 0.7,
        },
    },
];

// ARCHITECT: бесшовная бегущая строка — массив продублирован, translateX 0% → -50%.
function BlobatarMarquee() {
    return (
        <div className="relative w-full overflow-hidden py-4">
            <motion.div
                className="flex gap-8"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
                {[...MINI_BLOBATARS, ...MINI_BLOBATARS].map((blob, index) => (
                    <div
                        key={`${blob.name}-${index}`}
                        className="flex flex-col items-center gap-3 flex-shrink-0"
                    >
                        <MiniBlobatar name={blob.name} traits={blob.traits} />
                        <span className="text-xs font-medium text-[#f0f0f5]/60">
                            {blob.name}
                        </span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}

const STEPS = ["Знакомство", "Тест", "Цели", "Расписание", "Урок"] as const;

function ProgressSteps() {
    return (
        <div className="py-6">
            <ol className="relative flex justify-between items-center">
                {/* Фоновая линия (толще) */}
                <div
                    className="absolute top-1/2 left-0 right-0 h-1.5 bg-white/5 rounded-full -translate-y-1/2"
                    aria-hidden="true"
                />
                {/* Активная линия с градиентом */}
                <motion.div
                    className="absolute top-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-[#f0f0f5]/30 to-[#f0f0f5] rounded-full -translate-y-1/2 origin-left"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    aria-hidden="true"
                />
                {STEPS.map((step, index) => (
                    <li key={step} className="relative z-10 flex flex-col items-center gap-3">
                        <motion.div
                            className="w-5 h-5 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center"
                            initial={{
                                backgroundColor: "rgba(255,255,255,0.1)",
                                borderColor: "rgba(255,255,255,0.2)",
                            }}
                            whileInView={{
                                backgroundColor: "#f0f0f5",
                                borderColor: "#f0f0f5",
                                scale: [1, 1.15, 1],
                            }}
                            viewport={{ once: true, amount: 0.6 }}
                            transition={{ duration: 0.4, delay: index * 0.15, ease: "easeOut" }}
                        >
                            {index < 3 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    whileInView={{ scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.15 + 0.2 }}
                                    className="text-black text-[9px] font-bold"
                                >
                                    ✓
                                </motion.span>
                            )}
                        </motion.div>
                        <span className="text-[11px] font-medium text-[#f0f0f5]/70 whitespace-nowrap">
                            {step}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

const MODES = [
    {
        id: "interview",
        label: "Interview Prep",
        hint: "Собеседования",
        badge: "Popular",
    },
    {
        id: "general",
        label: "General English",
        hint: "Повседневное общение",
        badge: null,
    },
] as const;

// ARCHITECT: grid grid-cols-2 + flex-col justify-between ⇒ строго одинаковая высота карточек.
function ModeShowcase() {
    return (
        <div className="grid grid-cols-2 gap-3 h-full">
            {MODES.map((mode) => (
                <div
                    key={mode.id}
                    className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm flex flex-col justify-between"
                >
                    {mode.badge && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold bg-[#f0f0f5] text-black rounded-full shadow-sm">
                            {mode.badge}
                        </span>
                    )}
                    <div className="text-sm font-semibold text-[#f0f0f5] mb-2 mt-1">
                        {mode.label}
                    </div>
                    <div className="text-xs text-[#f0f0f5]/50">{mode.hint}</div>
                </div>
            ))}
        </div>
    );
}

const CHAT_MESSAGES = [
    { author: "bot", text: "Tell me about your weekend." },
    { author: "user", text: "I go to cinema with my friends." },
    {
        author: "bot",
        text: "Nice! Correct form: “I went to the cinema.” Let’s practice the Past Simple.",
    },
] as const;

function ChatPreview() {
    return (
        <div className="flex flex-col gap-4 max-w-xl mx-auto">
            {CHAT_MESSAGES.map((message, index) => (
                // ARCHITECT: пузырь и кнопка озвучки обёрнуты в ОДИН motion.div ⇒ появляются синхронно
                // (исправлен баг рассинхрона иконки). Ускорено: duration 0.6, шаг задержки 0.5.
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + index * 0.5 }}
                    className={`flex items-end gap-2 ${message.author === "user" ? "self-end flex-row-reverse" : "self-start"
                        }`}
                >
                    <div
                        className={
                            message.author === "user"
                                ? "bg-[#f0f0f5] text-black rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[80%]"
                                : "bg-white/10 text-[#f0f0f5] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[80%]"
                        }
                    >
                        {message.text}
                    </div>

                    {message.author === "bot" && (
                        <motion.button
                            type="button"
                            className="mb-1 p-2 rounded-full bg-white/5 text-[#f0f0f5]/40 hover:text-[#f0f0f5] hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Прослушать"
                        >
                            <Volume2 className="size-4" />
                        </motion.button>
                    )}
                </motion.div>
            ))}

            {/* Индикатор печати */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.3, delay: 0.2 + CHAT_MESSAGES.length * 0.5 }}
                className="self-start bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5"
                aria-hidden="true"
            >
                {[0, 1, 2].map((dot) => (
                    <motion.span
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full bg-[#f0f0f5]/60"
                        animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2, ease: "easeInOut" }}
                    />
                ))}
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
        <section
            id="features"
            className="relative w-full bg-black py-24 overflow-hidden"
        >
            {/* Радиальный градиент для глубины */}
            <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-black to-black pointer-events-none"
                aria-hidden="true"
            />

            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-[#f0f0f5] mb-4">
                        Всё, что нужно для свободного английского
                    </h2>
                    <p className="text-[#f0f0f5]/60 text-base md:text-lg leading-relaxed max-w-2xl">
                        Персональный ИИ-репетитор, который адаптируется под ваши цели
                    </p>
                </motion.header>

                {/* ARCHITECT: сетка 1/2 колонки — ряд 1 (широкий), ряд 2 (два средних рядом),
            ряд 3 (широкий). Никаких «дыр» и блоков-сирот. */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {FEATURES.map((feature) => (
                        <FeatureCard
                            key={feature.id}
                            title={feature.title}
                            description={feature.description}
                            delay={feature.delay}
                            className={feature.span}
                        >
                            <FeatureContent id={feature.id} />
                        </FeatureCard>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}