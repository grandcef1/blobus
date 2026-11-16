// ARCHITECT: список платежей: на мобильном строки складываются в столбик — таблица с горизонтальным
// скроллом здесь не нужна. Квитанция скачивается текстом: настоящий счёт формирует платёжный
// провайдер, поэтому клиентская копия — только подтверждение оплаты.

import { useTranslation } from "react-i18next";
import { Download, Receipt } from "lucide-react";
import { downloadTextFile } from "@/lib/download";
import { formatDate, formatUsd } from "@/lib/format";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "@/store/toast";
import type { Invoice } from "@/types/billing";

interface InvoicesListProps {
    invoices: Invoice[];
}

const STATUS_KEYS: Readonly<
    Record<Invoice["status"], "invoices.status.paid" | "invoices.status.failed" | "invoices.status.refunded">
> = {
    paid: "invoices.status.paid",
    failed: "invoices.status.failed",
    refunded: "invoices.status.refunded",
};

export function InvoicesList({ invoices }: InvoicesListProps) {
    const { t, i18n } = useTranslation("billing");
    const locale = i18n.language;

    const download = (invoice: Invoice) => {
        const status = t(STATUS_KEYS[invoice.status]);
        const receipt = [
            t("invoices.receipt.title"),
            t("invoices.receipt.number", { id: invoice.id }),
            t("invoices.receipt.date", { date: formatDate(invoice.date, locale) }),
            t("invoices.receipt.amount", { amount: formatUsd(invoice.amountUsd, locale) }),
            t("invoices.receipt.status", { status }),
        ];
        downloadTextFile(`${invoice.id}.txt`, receipt.join("\n"));
        toast.info(t("toasts.receipt"));
    };

    return (
        <section className="rounded-2xl bg-[#111113] p-5">
            <h2 className="text-base font-medium text-[#f0f0f5]/80">{t("invoices.title")}</h2>

            {invoices.length === 0 ? (
                /* ARCHITECT: пустое состояние — общий компонент, текст — доменный ключ биллинга:
                    формулировка не должна разойтись с остальной страницей. */
                <EmptyState
                    className="mt-3 bg-transparent p-0"
                    icon={Receipt}
                    title={t("invoices.empty")}
                />
            ) : (
                <ul className="mt-3 space-y-2">
                    {invoices.map((invoice) => (
                        <li
                            key={invoice.id}
                            className="flex flex-col gap-3 rounded-xl bg-[#141416] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-sm tabular-nums text-[#f0f0f5]">
                                    {formatDate(invoice.date, locale)}
                                </p>
                                <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                    {t(STATUS_KEYS[invoice.status])}
                                </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                <span className="text-sm font-semibold tabular-nums text-[#f0f0f5]">
                                    {formatUsd(invoice.amountUsd, locale)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => download(invoice)}
                                    className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-[#f0f0f5]/60 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                                >
                                    <Download className="size-3.5" aria-hidden="true" />
                                    {t("invoices.download")}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
