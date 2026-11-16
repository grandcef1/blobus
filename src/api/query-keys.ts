// ARCHITECT: ключи собраны в одну иерархию: инвалидация по billingKeys.all сбрасывает и подписку, и
// счета — точечные ключи нужны только для чтения и оптимистичных правок кэша.

export const billingKeys = {
    all: ["billing"] as const,
    subscription: () => [...billingKeys.all, "subscription"] as const,
    invoices: () => [...billingKeys.all, "invoices"] as const,
};
