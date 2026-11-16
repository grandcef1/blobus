// ARCHITECT: состав обработчиков берётся из src/lib/legal.ts (единственный источник правды), тексты —
// из словаря по id. Ничего не дублируется: добавили обработчик в массив, появилась строка в таблице.
// ARCHITECT: строки списком, а не <table>: на телефоне таблица либо даёт горизонтальный скролл, либо
// теряет семантику при display:block. Статус подписан словами, а не цветом — смысл читается и без
// различения оттенков.

import { useTranslation } from "react-i18next";
import { DATA_PROCESSORS } from "@/lib/legal";

const ROW =
    "grid gap-2 border-b border-white/5 p-5 last:border-b-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-start sm:gap-x-6";

export function ProcessorsTable() {
    const { t } = useTranslation("legal");

    return (
        <ul className="flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
            {DATA_PROCESSORS.map((processor) => (
                <li key={processor.id} className={ROW}>
                    <span className="text-base text-[#f0f0f5]">
                        {processor.brand ?? t("legal.processors.items.payments.brand")}
                    </span>

                    <div className="flex flex-col gap-1">
                        <p className="text-sm leading-relaxed text-[#f0f0f5]/60">
                            {t(`legal.processors.items.${processor.id}.purpose`)}
                        </p>
                        {/* ARCHITECT: примечание есть только у платежей: провайдер ещё не выбран, и
                            обещать конкретный сервис (например Stripe) нельзя. */}
                        {processor.id === "payments" && (
                            <p className="text-xs leading-relaxed text-[#f0f0f5]/40">
                                {t("legal.processors.items.payments.note")}
                            </p>
                        )}
                    </div>

                    <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-[#f0f0f5]/70">
                        {t(`legal.processors.status.${processor.status}`)}
                    </span>
                </li>
            ))}
        </ul>
    );
}
