// ARCHITECT: чтение подписки — отдельный query-хук: ключ и функция запроса описаны в одном месте,
// поэтому и чтение, и инвалидация после действий работают с одним кэшем.

import { useQuery } from "@tanstack/react-query";
import { getSubscription } from "@/api/billing";
import { billingKeys } from "@/api/query-keys";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Subscription } from "@/api/billing";

export function useSubscription(): UseQueryResult<Subscription, Error> {
    return useQuery({ queryKey: billingKeys.subscription(), queryFn: getSubscription });
}
