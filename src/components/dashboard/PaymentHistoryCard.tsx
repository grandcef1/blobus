// ARCHITECT: история платежей — отдельный блок страницы «Подписка»: список счетов с датой, суммой
// и меткой PDF. Вынесен из страницы: та вышла за лимит строк, а блок читается как самостоятельная
// карточка и не зависит от состояния периода оплаты.

import { Download } from "lucide-react";
import type { PaymentRecord } from "@/api/billing";

interface PaymentHistoryCardProps {
    payments: PaymentRecord[];
}

export function PaymentHistoryCard({ payments }: PaymentHistoryCardProps) {
    return (
        <div className="rounded-2xl bg-[#111113] p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-medium text-[#f0f0f5]/80">История платежей</h2>
                <button className="text-xs text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70">
                    Все
                </button>
            </div>

            <div className="space-y-2">
                {payments.map((payment) => (
                    <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#f0f0f5]">
                                Подписка {payment.plan}
                            </p>
                            <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                {new Date(payment.date).toLocaleDateString("ru", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold tabular-nums text-[#f0f0f5]">
                                ${payment.amount}
                            </span>
                            <button
                                type="button"
                                aria-label="Скачать счёт PDF"
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]/80"
                            >
                                <Download className="size-3.5" />
                                PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}