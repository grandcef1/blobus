import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import type { MotionValue, Variants } from "framer-motion";
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
    // ARCHITECT: clip=true вешает overflow-hidden на ВСЮ карточку (внутренний rounded-слой),
    // чтобы масштабированный контент (scale-215 у ChatBlobatar) обрезался границами
    // карточки, а не границами контентной области. Только для карточки чата.
    clip?: boolean;
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
    clip,
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
          motion.div управляет transform:y — два трансформа на одном элементе конфликтовали бы.
          clip добавляет overflow-hidden именно сюда — по границам карточки. */}
            <motion.div
                className={`h-full rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/5 transition-all duration-500 group-hover:bg-white/[0.04] group-hover:border-white/15 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] group-hover:scale-[1.01] ${clip ? "overflow-hidden" : ""}`}
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
    // ARCHITECT: расширено с 6 до 10 элементов по ТЗ — ширина одного дубликата
    // (10*96px + 9*32px = 1248px) заведомо больше ширины видимой области карточки
    // на любом десктопе ⇒ пустых зон в marquee не бывает ни в одном кадре цикла.
    {
        name: "Нова",
        traits: {
            shape: 0.55,
            hue: 0.45,
            tone: [0.5, 0.8],
            "eye.gap": 0.32,
            "eye.rx": 0.95,
            "eye.lean": 0.35,
            "body.r": 0.45,
            "body.n": 1.0,
        },
    },
    {
        name: "Кай",
        traits: {
            shape: 0.35,
            hue: 0.62,
            tone: [0.35, 0.65],
            "eye.gap": 0.38,
            "eye.rx": 1.05,
            "eye.lean": 0.42,
            "body.r": 0.55,
            "body.n": 1.1,
        },
    },
    {
        name: "Лира",
        traits: {
            shape: 0.75,
            hue: 0.82,
            tone: [0.45, 0.75],
            "eye.gap": 0.45,
            "eye.rx": 0.75,
            "eye.lean": 0.28,
            "body.r": 0.35,
            "body.ratio": 0.15,
        },
    },
    {
        name: "Орион",
        traits: {
            shape: 0.25,
            hue: 0.18,
            tone: [0.4, 0.7],
            "eye.gap": 0.48,
            "eye.rx": 1.15,
            "eye.lean": 0.15,
            "body.r": 0.65,
            "body.n": 1.4,
        },
    },
];

// ARCHITECT: единственная точка настройки скорости marquee (px/сек).
const MARQUEE_SPEED_PX_PER_SEC = 50;

// ARCHITECT: ping-pong через triangle wave вместо процентных keyframes и repeatType:"reverse".
// distance = trackWidth − viewportWidth — ровно тот путь, при котором правый край
// последнего (третьего) дубликата доходит до правого края видимой области.
// useAnimationFrame + triangle wave дают строго линейную ОДИНАКОВУЮ скорость в обе
// стороны, мгновенный разворот только в крайних точках и корректный ресайз без
// перезапуска анимации (rAF-цикл не прерывается).
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

        // ARCHITECT: пересчёт distance при любом изменении геометрии (ресайз окна,
        // смена шрифта, ленивая загрузка) — анимация подстраивается без скачков.
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
            // Трек не длиннее видимой области — не двигаем вовсе.
            xMotion.set(0);
            return;
        }
        // Период полного цикла «туда-обратно»: 2 * distance / speed (в мс).
        const periodMs = ((2 * distance) / speedPxPerSec) * 1000;
        const phase = (t % periodMs) / periodMs;
        const triangle = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        xMotion.set(-distance * triangle);
    });

    return xMotion;
}

// ARCHITECT: ОДИН трек с ТРЕМЯ одинаковыми дубликатами набора в flex-ряде.
// Ширина одного дубликата = 10*96px(w-24) + 9*32px(gap-8) = 1248px > ширины карточки ⇒
// ни в одном кадре цикла нет пустой зоны слева или справа от блобатаров.
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
                            // ARCHITECT: первый дубликат доступен скринридерам, второй и
                            // третий — декоративная проекция цикла (aria-hidden).
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
                            {/* Галочка для пройденных шагов */}
                            {index < 5 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    whileInView={{ scale: 1 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: index * 0.25 + 0.2 }}
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

// ─── Карточка 3: режимы обучения ───────────────────────────────────────────────

const MODES = [
    { id: "interview", label: "Interview Prep", hint: "Собеседование", badge: "Popular" },
    { id: "general", label: "General English", hint: "Общее изучение", badge: null },
] as const;

function ModeShowcase() {
    return (
        // ARCHITECT: grid-cols-2 ⇒ две карточки строго одинаковой высоты;
        // flex-col justify-between прижимает hint к низу карточки.
        <div className="grid h-full grid-cols-2 gap-3">
            {MODES.map((mode) => (
                <div
                    key={mode.id}
                    // ARCHITECT: рамка/фон мини-карточки возвращены к исходной формуле
                    // (border-white/10 + bg-white/[0.03] + backdrop-blur-sm + rounded-2xl),
                    // но высота уменьшена: вертикальный паддинг py-3 вместо p-4 и без
                    // прежних mt-1/mb-2 у label — карточка компактная, без «воздуха» по краям.
                    className="relative flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
                >
                    {/* ARCHITECT: label и бейдж в одном flex-ряду (бейдж в потоке, не absolute) —
                позиция сохранена из одобренной версии: сразу справа от надписи. */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#f0f0f5]">
                            {mode.label}
                        </span>
                        {mode.badge && (
                            <motion.span
                                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur-sm"
                                initial={{ opacity: 0, x: -5 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                            >
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f0f0f5]" />
                                <span className="whitespace-nowrap text-[9px] font-medium text-[#f0f0f5]">
                                    {mode.badge}
                                </span>
                            </motion.span>
                        )}
                    </div>
                    {/* ARCHITECT: подсказка снизу восстановлена по ТЗ — формулировки
                «Собеседование» и «Общее изучение» взяты из данных MODES. */}
                    <div className="text-xs text-[#f0f0f5]/50">{mode.hint}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Карточка 4: превью живого чата ────────────────────────────────────────────

// ARCHITECT: widthClass — персональный ограничитель ширины/кегль каждого пузыря.
// Вынесен в данные, чтобы НЕ держать два конфликтующих max-w на одном элементе:
// базовые классы пузыря без max-w, ширина приходит только из widthClass.
// Первое сообщение: text-lg (увеличенный кегль по ТЗ) + max-w-[220px] — при 18px
// max-content фразы ≈ 232px > 220px ⇒ естественный перенос на две строки.
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
        // ARCHITECT: обратные кавычки (backticks) — внутри строки есть двойные кавычки
        // и апостроф, обычные двойные кавычки сломают парсинг.
        text: `Nice! Correct form: "I went to the cinema." Let's practice the Past Simple.`,
        widthClass: "max-w-[90%]",
    },
];

function ChatPreview() {
    return (
        // ARCHITECT: overflow-hidden ЗДЕСЬ НЕ нужен — он обрезал бы scale-215 блобатар
        // по границе контентной области. Клиппинг живёт на уровне всей карточки
        // (проп clip у FeatureCard), поэтому контейнер чата остаётся «прозрачным».
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
                                    // ARCHITECT: базовый кегль пузырей возвращён к text-sm (14px) —
                                    // прежний «идеальный» вид без утяжеления текста.
                                    ? `rounded-2xl rounded-br-md bg-[#f0f0f5] px-4 py-2.5 text-sm text-black ${message.widthClass}`
                                    : `rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-sm text-[#f0f0f5] break-normal ${message.widthClass}`
                            }
                        >
                            {message.text}
                        </div>

                        {/* ARCHITECT: кнопки действий бота (озвучка + перевод) — внутри того же
                motion.div, что и пузырь: появляются строго синхронно с сообщением.
                flex-col + items-end прижимает иконки к правому краю пузыря. */}
                        {message.author === "bot" && (
                            <div className="flex flex-col items-end gap-1">
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
                // ARCHITECT: pl-4 смещает блобатар правее; scale-215 сохранён из твоей правки;
                // вылезание за пределы карточки гасит overflow-hidden на уровне карточки.
                className="flex shrink-0 items-center justify-center pl-4"
            >
                <div className="scale-220 translate-x-18 translate-y-3">
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
            ряд 2: две средние рядом (тест + режимы), ряд 3: широкая (чат). */}
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
                            // ARCHITECT: клиппинг по границам карточки только для чата —
                            // scale-215 блобатар обрезается краями карточки, а не контента.
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