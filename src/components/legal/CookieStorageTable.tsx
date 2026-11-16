// ARCHITECT: необходимое хранилище — фиксированный список из src/lib/legal.ts; имена ключей там же
// совпадают с реальными persist-ключами приложения.
// ARCHITECT: на десктопе колонки подписаны строкой-заголовком, на телефоне те же подписи стоят над
// каждым значением (Field): складывать таблицу в стек без подписей — значит оставить «Постоянно» без
// объяснения, что это срок.

import { useTranslation } from "react-i18next";
import { NECESSARY_STORAGE_ITEMS } from "@/lib/legal";
import { cn } from "@/lib/utils";

const GRID = "sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,8rem)_minmax(0,10rem)] sm:gap-x-6";

interface FieldProps {
    readonly label: string;
    readonly value: string;
    readonly mono?: boolean;
}

function Field({ label, value, mono = false }: FieldProps) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#f0f0f5]/40 sm:hidden">{label}</span>
            <span className={cn("text-sm text-[#f0f0f5]/60", mono && "font-mono text-[#f0f0f5]")}>
                {value}
            </span>
        </div>
    );
}

export function CookieStorageTable() {
    const { t } = useTranslation("legal");

    return (
        <ul className="flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
            <li
                aria-hidden="true"
                className={cn(
                    "hidden bg-white/[0.03] px-5 py-3 text-xs uppercase tracking-wide text-[#f0f0f5]/40 sm:grid sm:gap-y-2",
                    GRID
                )}
            >
                <span>{t("legal.cookies.storage.columns.name")}</span>
                <span>{t("legal.cookies.storage.columns.purpose")}</span>
                <span>{t("legal.cookies.storage.columns.ttl")}</span>
                <span>{t("legal.cookies.storage.columns.type")}</span>
            </li>

            {NECESSARY_STORAGE_ITEMS.map((item) => (
                <li
                    key={item.id}
                    className={cn("grid gap-2 border-b border-white/5 p-5 last:border-b-0 sm:gap-y-2", GRID)}
                >
                    <Field label={t("legal.cookies.storage.columns.name")} value={item.name} mono />
                    <Field
                        label={t("legal.cookies.storage.columns.purpose")}
                        value={t(`legal.cookies.storage.items.${item.id}.purpose`)}
                    />
                    <Field
                        label={t("legal.cookies.storage.columns.ttl")}
                        value={t(`legal.cookies.storage.items.${item.id}.ttl`)}
                    />
                    <Field
                        label={t("legal.cookies.storage.columns.type")}
                        value={t("legal.cookies.storage.necessaryType")}
                    />
                </li>
            ))}
        </ul>
    );
}
