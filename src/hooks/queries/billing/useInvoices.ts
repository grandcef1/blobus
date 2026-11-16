// ARCHITECT: счета читаются своим ключом: их список обновляется вместе с подпиской (инвалидация
// billingKeys.all), но загрузка и ошибка этого запроса не смешиваются с состоянием тарифа.

import { useQuery } from "@tanstack/react-query";
import { getInvoices } from "@/api/billing";
import { billingKeys } from "@/api/query-keys";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Invoice } from "@/api/billing";

export function useInvoices(): UseQueryResult<Invoice[], Error> {
    return useQuery({ queryKey: billingKeys.invoices(), queryFn: getInvoices });
}
