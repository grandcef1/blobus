// ARCHITECT: приветствие репетитора — canned-сообщение, которое сервер вставляет в новую сессию: первый экран
// чата не пустой, а история начинается с реплики ассистента. Текст собирается по локали профиля, поэтому
// персона и режим видны сразу, а модель за приветствие не платит (§16.9).
// ARCHITECT: сбой вставки не отменяет созданную сессию — чат работает и без приветствия, поэтому вызывающий
// гасит ошибку строкой лога без текста сообщения и PII (§16.11).
import { z } from "zod";

import { buildLessonPlan, modeOf, LESSON_LEVELS } from "./lessonPlan.ts";
import type { LessonPlan, PlanLocale } from "./lessonPlan.ts";
import type { createServiceClient } from "../supabase.ts";
import type { Tutor } from "../tutorCatalog.ts";
import type { ExplanationLocale } from "./prompt.ts";

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Короткие названия режимов: подписи интерфейса живут на клиенте, приветствию нужен собственный текст. */
const MODE_LABELS: Record<ExplanationLocale, Record<string, string>> = {
    ru: {
        interview: "собеседование",
        speaking: "разговор",
        grammar: "грамматика",
        general: "общий английский",
    },
    en: {
        interview: "interview prep",
        speaking: "speaking",
        grammar: "grammar",
        general: "general English",
    },
    es: {
        interview: "entrevista",
        speaking: "conversación",
        grammar: "gramática",
        general: "inglés general",
    },
};

export interface GreetingDraft {
    readonly tutor: Tutor;
    readonly mode: string;
    readonly locale: ExplanationLocale;
    /** План урока: цель и правило объявляет первое сообщение; null — плана нет, приветствие короче. */
    readonly plan: LessonPlan | null;
}

// ARCHITECT: цель и правило урока называет первое сообщение репетитора — их пишет сервер, а не модель:
// объявление есть с первого экрана, и оно не стоит ни одного токена (§16.9). Целевые слова сюда не попадают
// никогда: подсказка списком в начале урока убила бы упражнения.
const PLAN_LINES: Record<PlanLocale, (plan: LessonPlan) => string> = {
    ru: (plan) => `Цель урока: ${plan.goal} Правило урока: ${plan.rule}.`,
    en: (plan) => `Lesson goal: ${plan.goal} Focus rule: ${plan.rule}.`,
    es: (plan) => `Objetivo de la lección: ${plan.goal} Regla: ${plan.rule}.`,
};

// ARCHITECT: черты характера есть только в русском каталоге, поэтому их цитирует только русское приветствие:
// выдумывать переводы персонажей десяти репетиторов в задаче не за чем (§5.4 — один источник правды).
/** Приветствие: имя репетитора, режим занятия, цель и правило урока и приглашение к первой фразе. */
export function buildGreeting(input: GreetingDraft): string {
    const mode = MODE_LABELS[input.locale][input.mode] ?? input.mode;
    const traits = input.tutor.persona.traits.join(", ");
    const planLine = input.plan === null ? "" : ` ${PLAN_LINES[input.locale](input.plan)}`;

    if (input.locale === "ru")
        return `Я ${input.tutor.name}, твой репетитор: ${traits}. Режим занятия: ${mode}.${planLine} Напиши первую фразу по-английски — и начнём.`;

    if (input.locale === "es")
        return `Soy ${input.tutor.name}, tu tutor. Modo de la lección: ${mode}.${planLine} Escribe tu primera frase en inglés y empezamos.`;

    return `I am ${input.tutor.name}, your tutor. Lesson mode: ${mode}.${planLine} Write your first line in English and we will start.`;
}

const LessonRowSchema = z.strictObject({ id: z.uuid() });

/** Уровень теста: тот же набор, что в placement_results; строка обязательна для плана урока. */
const PlacementRowSchema = z.strictObject({ level: z.enum(LESSON_LEVELS) });

const ProfileRowSchema = z.strictObject({
    locale: z.enum(["ru", "en", "es"]),
    daily_minutes: z.number().int().min(5).max(120),
});

export interface GreetingInput {
    readonly userId: string;
    readonly sessionId: string;
    readonly tutor: Tutor;
    readonly mode: string;
}

/** Вставляет приветствие в новый урок сессии: сообщение сразу видно в истории этой же сессии. */
export async function writeSessionGreeting(
    client: ServiceClient,
    input: GreetingInput
): Promise<void> {
    const profile = await client
        .from("profiles")
        .select("locale, daily_minutes")
        .eq("id", input.userId)
        .maybeSingle();

    if (profile.error !== null) throw profile.error;

    const row = ProfileRowSchema.safeParse(profile.data);

    // ARCHITECT: строку профиля заводит триггер handle_new_user: её отсутствие — аномалия, а не отказ запроса,
    // поэтому ошибка уходит вызывающему и гасится там (сессия уже создана).
    if (!row.success) throw row.error;

    // ARCHITECT: план урока формируется здесь, вместе с уроком: без уровня теста его не собрать, а сам
    // результат теста для чата обязателен (роутер чата отвечает 403). Отсутствие строки — не отказ
    // приветствия: урок остаётся без плана, а чат до теста уровня всё равно не открывается.
    const placement = await client
        .from("placement_results")
        .select("level")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (placement.error !== null) throw placement.error;

    const level = PlacementRowSchema.safeParse(placement.data);
    const plan = level.success
        ? buildLessonPlan({
              level: level.data.level,
              mode: modeOf(input.mode),
              locale: row.data.locale,
          })
        : null;

    const created = await client
        .from("lessons")
        .insert({ session_id: input.sessionId, daily_minutes: row.data.daily_minutes, plan })
        .select("id")
        .single();

    if (created.error !== null) throw created.error;

    const lesson = LessonRowSchema.safeParse(created.data);

    if (!lesson.success) throw lesson.error;

    // ARCHITECT: payload несёт профиль голоса: приветствие можно озвучить, карточек у него нет.
    const inserted = await client.from("messages").insert({
        lesson_id: lesson.data.id,
        role: "assistant",
        content: buildGreeting({
            tutor: input.tutor,
            mode: input.mode,
            locale: row.data.locale,
            plan,
        }),
        payload: { voiceId: input.tutor.voiceId },
    });

    if (inserted.error !== null) throw inserted.error;
}
