import { MOCK_LESSON_HISTORY } from "@/api/mocks/progress";

export function RecentLessonsSection() {
    const lessons = MOCK_LESSON_HISTORY.slice(0, 3);

    if (lessons.length === 0) {
        return (
            <div className="rounded-2xl bg-[#111113] p-5">
                <h2 className="text-base font-medium text-[#f0f0f5]/80">Последние уроки</h2>
                <p className="mt-2 text-sm text-[#f0f0f5]/40">Пока нет завершённых уроков</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-[#111113] p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-medium text-[#f0f0f5]/80">Последние уроки</h2>
                <button className="text-sm text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70">
                    Все
                </button>
            </div>

            <div className="space-y-2">
                {lessons.map((lesson) => (
                    <div
                        key={lesson.id}
                        className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3.5 transition-colors hover:bg-[#1a1a1c]"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#f0f0f5]">{lesson.topic}</p>
                            <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                {lesson.duration} мин ·{" "}
                                {new Date(lesson.completedAt).toLocaleDateString("ru", {
                                    day: "numeric",
                                    month: "short",
                                })}
                            </p>
                        </div>
                        <span className="text-base font-semibold tabular-nums text-[#f0f0f5]/70">
                            {lesson.score}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}