// ARCHITECT: задержка симулирует сеть: без неё скелетон был бы мгновенной вспышкой, а не
// состоянием загрузки. Одно значение на все мок-запросы, чтобы тайминги не расползались; с реальным
// бэкендом функция уходит вместе с мок-обёртками.

export const MOCK_NETWORK_DELAY_MS = 400;

export function delayMock(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));
}