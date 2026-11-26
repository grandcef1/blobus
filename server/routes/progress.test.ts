// ARCHITECT: сводка прогресса проверяется на реальном HTTP локального стека: форма конверта, 401, лимит чтения и
// агрегаты на подготовленных данных. Личные строки сеются админ-клиентом (service-role), а читает их роутер под
// RLS — как в бою; сеть не поднимается, запросы идут только на локальный стек (§16.14).
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { configureCookies, COOKIE_NAMES } from "../cookies.ts";
import { createAdminClient, readLocalStack } from "../test-stack.ts";
import { createConfirmedUser, errorBody, getJson, loginSession, withApp } from "../test-http.ts";
import type { Jar, RunningApp } from "../test-http.ts";
import type { SupabaseEnv } from "../supabase.ts";

const EMAIL_PREFIX = `progress-${randomUUID()}`;
const PASSWORD = `Progress-${randomUUID()}-1`;
const DAY_MS = 24 * 60 * 60 * 1000;
const PLACEMENT_LEVEL = "B2";
const PLACEMENT_SCORE = 63;
const WEEK_DAYS = 7;

/** Конверт ответа: проверяются и форма, и значения — новых полей в DTO быть не должно. */
interface ProgressBody {
    readonly progress: {
        readonly level: string | null;
        readonly score: number | null;
        readonly sessionsTotal: number;
        readonly messagesTotal: number;
        readonly wordsTotal: number;
        readonly wordsDueToday: number;
        readonly streakDays: number;
        readonly weeklyActivity: readonly { readonly date: string; readonly messages: number }[];
        readonly recentSessions: readonly {
            readonly id: string;
            readonly tutorId: string;
            readonly mode: string;
            readonly createdAt: string;
            readonly updatedAt: string;
        }[];
    };
}

let env: SupabaseEnv | undefined;

/** Отдаёт окружение стека и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctxEnv(): SupabaseEnv {
    if (env === undefined)
        throw new Error("local Supabase stack is not running: run npx supabase start");

    return env;
}

/** Календарная дата со сдвигом назад: тот же формат, что у usage_counters.date. */
function dayBefore(days: number): string {
    return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

async function readProgress(app: RunningApp, jar: Jar): Promise<ProgressBody> {
    const response = await getJson(app.baseUrl, "/api/progress", jar);

    expect(response.status).toBe(200);

    return (await response.json()) as ProgressBody;
}

/** Аккаунт с сессией входа: строки сеются админ-клиентом, поэтому тест не зависит от чат-роутера. */
async function seedUser(
    app: RunningApp,
    options: { readonly placement?: boolean } = {}
): Promise<{ readonly id: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email, PASSWORD);
    const jar = await loginSession(app.baseUrl, email, PASSWORD);

    if (options.placement !== false) {
        const inserted = await createAdminClient()
            .from("placement_results")
            .insert({ user_id: id, level: PLACEMENT_LEVEL, score: PLACEMENT_SCORE });

        if (inserted.error !== null) throw inserted.error;
    }

    return { id, jar };
}

/** Сессия с заданным временем создания: порядок «свежие сверху» проверяется по нему. */
async function addSession(userId: string, tutorId: string, createdAt: Date): Promise<string> {
    const inserted = await createAdminClient()
        .from("sessions")
        .insert({
            user_id: userId,
            tutor_id: tutorId,
            mode: "speaking",
            created_at: createdAt.toISOString(),
        })
        .select("id")
        .single();

    if (inserted.error !== null) throw inserted.error;

    return inserted.data.id;
}

/** Урок сессии: сообщения хранятся в уроке, поэтому вместе с сессией заводится и он. */
/** Урок сессии: сообщения хранятся в уроке, поэтому вместе с сессией заводится и он. */
async function addLesson(sessionId: string): Promise<string> {
    const inserted = await createAdminClient()
        .from("lessons")
        .insert({ session_id: sessionId, daily_minutes: 20 })
        .select("id")
        .single();

    if (inserted.error !== null) throw inserted.error;

    return inserted.data.id;
}

async function addMessages(
    lessonId: string,
    roles: readonly ("user" | "assistant")[]
): Promise<void> {
    const inserted = await createAdminClient()
        .from("messages")
        .insert(
            roles.map((role, index) => ({
                lesson_id: lessonId,
                role,
                content: `Реплика ${index + 1} для проверки агрегатов`,
            }))
        );

    if (inserted.error !== null) throw inserted.error;
}

/** Слова с разным сроком показа: граница «к повтору сегодня» проверяется на прошлом и будущем. */
async function addWords(
    userId: string,
    words: readonly { readonly term: string; readonly dueInDays: number }[]
): Promise<void> {
    const inserted = await createAdminClient()
        .from("vocabulary")
        .insert(
            words.map((word) => ({
                user_id: userId,
                term: word.term,
                next_due_at: new Date(Date.now() + word.dueInDays * DAY_MS).toISOString(),
            }))
        );

    if (inserted.error !== null) throw inserted.error;
}

/** Счётчики дней: серия и недельная активность считаются только по ним. */
async function setCounters(
    userId: string,
    days: readonly {
        readonly date: string;
        readonly messages: number;
        readonly lessons: number;
    }[]
): Promise<void> {
    const inserted = await createAdminClient()
        .from("usage_counters")
        .insert(
            days.map((day) => ({
                user_id: userId,
                date: day.date,
                messages_used: day.messages,
                lessons_used: day.lessons,
            }))
        );

    if (inserted.error !== null) throw inserted.error;
}

beforeAll(() => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };
}, 30_000);

// ARCHITECT: уборка не должна прятать результат тестов: удаляются все аккаунты прогона по префиксу, а ошибка
// удаления гасится — иначе падение afterAll выглядело бы как падение проверок.
afterAll(async () => {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const stale = (data?.users ?? []).filter((user) => (user.email ?? "").startsWith(EMAIL_PREFIX));

    for (const user of stale) {
        await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }
}, 30_000);

// ARCHITECT: локальный стек работает по http, поэтому Secure выключен на время теста; после каждого теста
// возвращаем fail-closed дефолт, как это делает csrf.test.ts.
beforeEach(() => {
    configureCookies({ secure: false });
});

afterEach(() => {
    configureCookies({ secure: true });
});

describe("GET /api/progress", () => {
    it("20: отвечает 401 без куки сессии и на поддельную куку", async () => {
        await withApp(ctxEnv(), async (app) => {
            const anonymous = await fetch(`${app.baseUrl}/api/progress`);
            const forged = await fetch(`${app.baseUrl}/api/progress`, {
                headers: { cookie: `${COOKIE_NAMES.accessToken}=forged-progress-token` },
            });

            expect(anonymous.status).toBe(401);
            expect(errorBody(await anonymous.json()).error.code).toBe("UNAUTHORIZED");
            expect(forged.status).toBe(401);
        });
    }, 30_000);

    it("21: пустой аккаунт — нули, пустой список сессий и семь дней без активности", async () => {
        await withApp(ctxEnv(), async (app) => {
            const me = await seedUser(app, { placement: false });
            const { progress } = await readProgress(app, me.jar);

            expect(progress).toMatchObject({
                level: null,
                score: null,
                sessionsTotal: 0,
                messagesTotal: 0,
                wordsTotal: 0,
                wordsDueToday: 0,
                streakDays: 0,
                recentSessions: [],
            });
            expect(progress.weeklyActivity).toHaveLength(WEEK_DAYS);
            // ARCHITECT: дни идут от сегодня назад ровно на семь: последний элемент — сегодняшняя дата.
            expect(progress.weeklyActivity.at(-1)?.date).toBe(dayBefore(0));
            expect(progress.weeklyActivity.every((day) => day.messages === 0)).toBe(true);
            expect(Object.keys(progress).sort()).toEqual([
                "level",
                "messagesTotal",
                "recentSessions",
                "score",
                "sessionsTotal",
                "streakDays",
                "weeklyActivity",
                "wordsDueToday",
                "wordsTotal",
            ]);
        });
    }, 30_000);

    it("22: считает свои сессии, свои сообщения, слова и срок повторения", async () => {
        await withApp(ctxEnv(), async (app) => {
            const me = await seedUser(app);
            const older = await addSession(me.id, "miya", new Date(Date.now() - 2 * DAY_MS));
            const fresh = await addSession(me.id, "nova", new Date(Date.now() - DAY_MS));
            const olderLesson = await addLesson(older);
            const freshLesson = await addLesson(fresh);

            // ARCHITECT: в счётчик входят только реплики ученика: ответы репетитора сообщениями пользователя не
            // считаются, иначе метрика «своих сообщений» завышалась бы вдвое.
            await addMessages(olderLesson, ["user", "assistant", "user"]);
            await addMessages(freshLesson, ["user", "assistant"]);
            await addWords(me.id, [
                { term: "deadline", dueInDays: -1 },
                { term: "invoice", dueInDays: -2 },
                { term: "quarter", dueInDays: 2 },
            ]);

            const { progress } = await readProgress(app, me.jar);

            expect(progress.level).toBe(PLACEMENT_LEVEL);
            expect(progress.score).toBe(PLACEMENT_SCORE);
            expect(progress.sessionsTotal).toBe(2);
            expect(progress.messagesTotal).toBe(3);
            expect(progress.wordsTotal).toBe(3);
            expect(progress.wordsDueToday).toBe(2);
            expect(progress.recentSessions.map((session) => session.id)).toEqual([fresh, older]);
            expect(progress.recentSessions[0]).toMatchObject({
                tutorId: "nova",
                mode: "speaking",
            });
        });
    }, 30_000);

    it("23: серия дней считается по счётчикам и прерывается пропуском", async () => {
        await withApp(ctxEnv(), async (app) => {
            const me = await seedUser(app, { placement: false });

            await setCounters(me.id, [
                { date: dayBefore(0), messages: 3, lessons: 0 },
                { date: dayBefore(1), messages: 0, lessons: 1 },
                { date: dayBefore(2), messages: 2, lessons: 0 },
                { date: dayBefore(4), messages: 5, lessons: 0 },
            ]);

            const { progress } = await readProgress(app, me.jar);
            const week = new Map(progress.weeklyActivity.map((day) => [day.date, day.messages]));

            expect(progress.streakDays).toBe(3);
            // ARCHITECT: день с одним уроком остаётся активным, но сообщений в нём ноль — неделя считает только
            // сообщения, а день без строки счётчика попадает в семь дней нулём.
            expect(week.get(dayBefore(1))).toBe(0);
            expect(week.get(dayBefore(2))).toBe(2);
            expect(week.get(dayBefore(5))).toBe(0);
        });
    }, 30_000);

    it("24: без активности сегодня серия продолжается со вчерашнего дня", async () => {
        await withApp(ctxEnv(), async (app) => {
            const me = await seedUser(app, { placement: false });

            await setCounters(me.id, [{ date: dayBefore(1), messages: 1, lessons: 0 }]);

            const { progress } = await readProgress(app, me.jar);

            expect(progress.streakDays).toBe(1);
        });
    }, 30_000);

    it("25: держит лимит чтения — 61-й запрос за окно отвечает 429", async () => {
        await withApp(ctxEnv(), async (app) => {
            const me = await seedUser(app, { placement: false });
            let status = 0;

            for (let index = 0; index < 61; index += 1) {
                const response = await getJson(app.baseUrl, "/api/progress", me.jar);

                status = response.status;
                await response.text();
            }

            expect(status).toBe(429);
        });
    }, 60_000);
});
