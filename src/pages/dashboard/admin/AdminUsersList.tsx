// ARCHITECT: пользователи. Список, а не таблица: колонок мало, а на телефоне таблица
// превращается в горизонтальный скролл. Шапка с кнопкой экспорта и поиск складываются в
// колонку: на узком экране кнопка растягивается на всю ширину.
// ARCHITECT: поля ввода text-base на мобильном — 16px отключает автозум iOS при фокусе.

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { StatusMarker } from "@/components/shared/StatusMarker";
import { ADMIN_USERS, USER_STATUS_LABELS } from "./adminData";
import type { AdminUser } from "./adminData";

type Emphasis = "solid" | "muted" | "faint";

const USER_STATUS_EMPHASIS: Record<AdminUser["status"], Emphasis> = {
    active: "solid",
    pending: "muted",
    suspended: "faint",
};

const ALL_PLANS = "all";

export function AdminUsersList() {
    const [searchQuery, setSearchQuery] = useState("");
    const [planFilter, setPlanFilter] = useState<string>(ALL_PLANS);

    const filteredUsers = ADMIN_USERS.filter((user) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
        const matchesPlan = planFilter === ALL_PLANS || user.plan === planFilter;

        return matchesSearch && matchesPlan;
    });

    return (
        <section aria-labelledby="admin-users-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="admin-users-title" className="text-base font-medium text-[#f0f0f5]/80">
                    Пользователи
                </h2>
                <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#f0f0f5] px-3 text-xs font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:w-auto"
                >
                    <Download className="size-3.5" aria-hidden="true" />
                    Экспорт
                </button>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/30"
                        aria-hidden="true"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Поиск"
                        aria-label="Поиск пользователей"
                        className="w-full rounded-lg bg-[#141416] py-2.5 pl-9 pr-3 text-base text-[#f0f0f5] placeholder:text-[#f0f0f5]/30 focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20 md:text-sm"
                    />
                </div>
                <select
                    value={planFilter}
                    onChange={(event) => setPlanFilter(event.target.value)}
                    aria-label="Фильтр по тарифу"
                    className="rounded-lg bg-[#141416] px-3 py-2.5 text-base text-[#f0f0f5] focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20 md:text-sm"
                >
                    <option value={ALL_PLANS}>Все тарифы</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                </select>
            </div>

            <div className="space-y-1">
                {filteredUsers.length === 0 && (
                    <p className="px-3 py-2 text-sm text-[#f0f0f5]/40">Ничего не найдено</p>
                )}

                {filteredUsers.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#141416]"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#f0f0f5]">{user.name}</p>
                            <p className="truncate text-xs text-[#f0f0f5]/40">
                                {user.email}
                                {user.issues > 0 ? ` · ${user.issues} в поддержку` : ""}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[11px] font-medium uppercase text-[#f0f0f5]/40">
                                {user.plan}
                            </span>
                            <StatusMarker
                                label={USER_STATUS_LABELS[user.status]}
                                emphasis={USER_STATUS_EMPHASIS[user.status]}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
