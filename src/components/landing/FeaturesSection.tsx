import type { ReactNode } from "react";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Languages, Volume2 } from "lucide-react";

import { ChatBlobatar } from "@/components/landing/ChatBlobatar";
import { MiniBlobatar } from "@/components/landing/MiniBlobatar";

// ARCHITECT: палитра секции — та же монохромная тема, что и в Hero (#f0f0f5 на чёрном).

const FEATURES = [
    {
        id: "personalization",
        title: "Персонализация под вас",
        description: "Выберите репетитора с подходящим характером и голосом",
        span: "md:col-span-2", // Ряд 1: широкий блок с бегущей строкой
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
        span: "md:col-span-1", // Ряд 2, правая часть (идеально заполняет ряд)
        delay: 0.3,
    },
    {
        id: "chat",
        title: "Живое общение с ИИ",
        description: "Мгновенная коррекция ошибок и объяснение правил",
        span: "md:col-span-2", // Ряд 3: широкий блок с чатом
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
}

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1 },
    },
};

// ARCHITECT: карточка появляется по входу во viewport (whileInView) + once:true —
// один раз при скролле, без повторных перезапусков.
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
}: FeatureCardProps) {
    return (
        // ARCHITECT: span-классы (md:col-span-2 / md:col-span-1) остаются на grid-item'е — внешнем
        // motion.div, который анимирует opacity+translate-y через Framer Motion.
        <motion.div
            variants={cardVariants}
            transition={{ delay }}
            className={`group h-full rounded-3xl ${className ?? ""}`}
        >
            {/* ARCHITECT: гибрид минимализма и blur: backdrop-blur-xl, мягкие границы
          border-white/5 → border-white/15 на hover, лёгкое свечение, минимальный
          scale-[1.01] для премиальности. Hover-scale живёт на внутреннем слое: внешний
          motion.div управляет transform:y — два трансформа на одном элементе конфликтовали бы. */}
            <motion.div
                className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/5 transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/15 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] group-hover:scale-[1.01]"
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex h-full flex-col p-6 md:p-8">
                    <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4 md:text-xl">
                        {title}
                    </h3>
                    {/* ARCHITECT: flex-1 прижимает описание к низу карточки — блоки выравниваются */}
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

// ─── Карточка 1: бегущая строка мини-блобатаров ────────────────────────────────

interface MiniBlobatarConfig {
    name: string;
    traits: Record<string, number | number[]>;
}

// ARCHITECT: типы трейтов — явный Record<string, number | number[]>, без `as const`:
// readonly-кортежи (tone) и union из разных наборов ключей ("body.ratio"?: undefined)
// несовместимы с пропсом traits MiniBlobatar (исправлен TS2322).
// Разные формы (shape/body), разные цвета (hue/tone), разные глаза (gap/rx/lean).
const MINI_BLOBATARS: MiniBlobatarConfig[] = [
    {
        name: "Мия",
        traits: {
            shape: 0.8,
            hue: 0.92, // розовый
            tone: [0.6, 0.9],
            "eye.gap": 0.4,
            "eye.rx": 0.7,
            "eye.lean": 0.2,
            "body.r": 0.3,
            "body.n": 0.6,
        },
    },
    {
        name: "Оскар",
        traits: {
            shape: 0.2,
            hue: 0.55, // бирюзовый
            tone: [0.3, 0.6],
            "eye.gap": 0.25,
            "eye.rx": 1.2,
            "eye.lean": 0.6,
            "body.r": 0.7,
            "body.n": 1.3,
        },
    },
    {
        name: "Луна",
        traits: {
            shape: 0.65,
            hue: 0.72, // фиолетовый
            tone: [0.4, 0.7],
            "eye.gap": 0.35,
            "eye.rx": 0.9,
            "eye.lean": 0.3,
            "body.r": 0.4,
            "body.ratio": 0.2,
        },
    },
    {
        name: "Макс",
        traits: {
            shape: 0.15,
            hue: 0.08, // красный
            tone: [0.5, 0.85],
            "eye.gap": 0.5,
            "eye.rx": 1.1,
            "eye.lean": 0.1,
            "body.r": 0.8,
            "body.n": 1.5,
        },
    },
    {
        name: "Алекс",
        traits: {
            shape: 0.45,
            hue: 0.33, // зелёный
            tone: [0.25, 0.55],
            "eye.gap": 0.28,
            "eye.rx": 0.85,
            "eye.lean": 0.45,
            "body.r": 0.5,
            "body.n": 0.9,
        },
    },
    {
        name: "Зои",
        traits: {
            shape: 0.9,
            hue: 0.15, // оранжевый
            tone: [0.55, 0.9],
            "eye.gap": 0.42,
            "eye.rx": 0.65,
            "eye.lean": 0.25,
            "body.r": 0.25,
            "body.ratio": -0.1,
        },
    },
];

// ARCHITECT: ИСТИННО бесконечный marquee: ДВА синхронных набора стоят вплотную в flex-ряде,
// каждый едет x: 0 → "-100%" (на СОБСТВЕННУЮ ширину). Когда первый набор полностью уходит
// влево, второй занимает его место, а цикл мгновенно возвращает всё в начало — стык первого
// и второго набора идентичен стартовой позиции ⇒ ни разрыва, ни скачка.
// NB: вариант «absolute left-full + x:-50%» из ТЗ даёт разрыв (-50% = половина ширины
// независимого контейнера); -100% для двух стыкующихся наборов — единственная корректная
// формула. Циклическая длительность одинаковая ⇒ скорость постоянна.
function MarqueeSet({ ariaHidden }: { ariaHidden?: boolean }) {
    return (
        <motion.div
            className="flex shrink-0 gap-8"
            aria-hidden={ariaHidden}
            initial={{ x: 0 }}
            animate={{ x: "-100%" }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
            {MINI_BLOBATARS.map((blob, index) => (
                <div
                    key={`${blob.name}-${ariaHidden ? "copy" : "orig"}-${index}`}
                    className="flex w-20 shrink-0 flex-col items-center gap-3"
                >
                    <MiniBlobatar name={blob.name} traits={blob.traits} />
                    <span className="whitespace-nowrap text-xs font-medium text-[#f0f0f5]/60">
                        {blob.name}
                    </span>
                </div>
            ))}
        </motion.div>
    );
}

function BlobatarMarquee() {
    return (
        <div className="relative w-full overflow-hidden py-2">
            <div className="flex">
                <MarqueeSet />
                {/* Второй набор — копия, прикрывает screen-reader дублирование */}
                <MarqueeSet ariaHidden />
            </div>
        </div>
    );
}

// ─── Карточка 2: прогресс-бар адаптивного теста ────────────────────────────────

const STEPS = ["Знакомство", "Тест", "Цели", "Расписание", "Урок"] as const;

function ProgressSteps() {
    return (
        <div className="py-6">
            <ol className="relative flex items-center justify-between px-4">
                {/* Фоновая линия: h-1.5, rounded-full, отступы left-4/right-4 */}
                <div
                    className="absolute top-1/2 right-4 left-4 h-1.5 -translate-y-1/2 rounded-full bg-white/10"
                    aria-hidden="true"
                />
                {/* Активная линия: заполнение scaleX 0→1 слева направо */}
                <motion.div
                    className="absolute top-1/2 right-4 left-4 h-1.5 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-[#f0f0f5]/50 to-[#f0f0f5]"
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />
                {STEPS.map((step, index) => (
                    <li key={step} className="relative z-10 flex flex-col items-center gap-2">
                        {/* ARCHITECT: кружок — анимируется ТОЛЬКО цвет (background/borderColor), без
                transform: Framer Motion перезаписал бы inline-transform'ом Tailwind
                -translate-y-1/2 у линии. amount: 0.3 — галочки гарантированно загораются. */}
                        <motion.div
                            className="flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white/10"
                            style={{ borderColor: "rgba(255,255,255,0.2)" }}
                            initial={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }}
                            whileInView={{ backgroundColor: "#f0f0f5", borderColor: "#f0f0f5" }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.3, delay: index * 0.15, ease: "easeOut" }}
                        >
                            {/* Галочка для первых трёх пройденных шагов (0, 1, 2) */}
                            {index < 3 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    whileInView={{ scale: 1 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: index * 0.15 + 0.2 }}
                                    className="text-[8px] font-bold text-black"
                                >
                                    ✓
                                </motion.span>
                            )}
                        </motion.div>
                        <span className="whitespace-nowrap text-[10px] text-[#f0f0f5]/60">
                            {step}
                        </span>
                    </li>
                ))}
            </ol>
            <p className="mt-6 text-center text-sm text-[#f0f0f5]/60">
                Адаптивный тест определит ваш уровень A1-C1
            </p>
        </div>
    );
}

// ─── Карточка 3: режимы обучения ───────────────────────────────────────────────

const MODES = [
    { id: "interview", label: "Interview Prep", hint: "Собеседования", badge: "Popular" },
    { id: "general", label: "General English", hint: "Повседневное общение", badge: null },
] as const;

function ModeShowcase() {
    return (
        // ARCHITECT: grid-cols-2 ⇒ две карточки строго одинаковой высоты;
        // flex-col justify-between выравнивает label/hint по горизонтали.
        <div className="grid h-full grid-cols-2 gap-3">
            {MODES.map((mode) => (
                <div
                    key={mode.id}
                    className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm"
                >
                    {mode.badge && (
                        // ARCHITECT: бейдж центрирован над карточкой (-top-3 left-1/2 -translate-x-1/2),
                        // фон bg-white/10, рамка border-white/20, пульсирующая точка-индикатор.
                        <motion.div
                            className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur-sm"
                            initial={{ opacity: 0, y: -5 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                        >
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f0f0f5]" />
                            <span className="whitespace-nowrap text-[9px] font-medium text-[#f0f0f5]">
                                {mode.badge}
                            </span>
                        </motion.div>
                    )}
                    <div className="mt-1 mb-2 text-sm font-semibold text-[#f0f0f5]">
                        {mode.label}
                    </div>
                    <div className="text-xs text-[#f0f0f5]/50">{mode.hint}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Карточка 4: превью живого чата ────────────────────────────────────────────

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-12">
            {/* Левая часть: сообщения */}
            <div className="flex flex-1 flex-col gap-4">
                {CHAT_MESSAGES.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: message.author === "user" ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + index * 0.5 }}
                        className={`flex items-end gap-2 ${message.author === "user" ? "self-end flex-row-reverse" : "self-start"
                            }`}
                    >
                        <div
                            className={
                                message.author === "user"
                                    ? "max-w-[90%] rounded-2xl rounded-br-md bg-[#f0f0f5] px-4 py-2.5 text-sm text-black"
                                    : "max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-sm text-[#f0f0f5]"
                            }
                        >
                            {message.text}
                        </div>

                        {/* ARCHITECT: кнопки действий бота (озвучка + перевод) — внутри того же
                motion.div, что и пузырь: появляются строго синхронно с сообщением */}
                        {message.author === "bot" && (
                            <div className="flex flex-col gap-1">
                                <motion.button
                                    type="button"
                                    className="rounded-full bg-white/5 p-2 text-[#f0f0f5]/40 transition-colors hover:bg-white/10 hover:text-[#f0f0f5]"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    aria-label="Прослушать"
                                >
                                    <Volume2 className="size-4" aria-hidden="true" />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    className="rounded-full bg-white/5 p-2 text-[#f0f0f5]/40 transition-colors hover:bg-white/10 hover:text-[#f0f0f5]"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    aria-label="Перевести"
                                >
                                    <Languages className="size-4" aria-hidden="true" />
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                ))}

                {/* Индикатор печати */}
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

            {/* Правая часть: ChatBlobatar — без gaze tracking, статично смотрит влево на чат */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex shrink-0 items-center justify-center"
            >
                {/* ARCHITECT: scale-150 — блобатар крупнее, но контейнер сохраняет layout-размер */}
                <div className="scale-150">
                    <ChatBlobatar />
                </div>
            </motion.div>
        </div>
    );
}

// ─── Диспетчер контента карточек ───────────────────────────────────────────────

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

// ─── Секция ────────────────────────────────────────────────────────────────────

export function FeaturesSection() {
    return (
        <section id="features" className="relative w-full overflow-hidden bg-black py-24">
            {/* Радиальный градиент для глубины */}
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

                {/* ARCHITECT: сетка 2 колонки — ряд 1: широкая карточка (marquee),
            ряд 2: две средние рядом (тест + режимы), ряд 3: широкая (чат).
            Без lg:grid-cols-3 ⇒ никаких «дыр» и блоков-сирот. */}
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
                            // ARCHITECT: у «теста» описание рендерится внутри ProgressSteps (по макету) —
                            // здесь пропускаем, чтобы не было дублирования текста
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