// ARCHITECT: mock-db играет роль сервера: значения переживают перезагрузку страницы, поэтому цепочку
// подписки можно пройти руками за один сеанс и увидеть её результат после F5. Реальный режим
// (USE_MOCKS=false) сюда не обращается — данные приходят от API.
// ARCHITECT: префикс отделяет мок-ключи от состояния приложения (язык, согласие на cookie, сессия):
// сброс мок-базы не задевает пользовательские настройки.

const PREFIX = "blobus-mock-";

function storageKey(name: string): string {
    return `${PREFIX}${name}`;
}

// ARCHITECT: испорченное значение в ключе не должно ронять экран: возвращаем seed и считаем, что
// данных ещё нет, — так же повёл бы себя сервер с битой записью.
function get<T>(name: string, seed: T): T {
    const raw = window.localStorage.getItem(storageKey(name));
    if (raw === null) return seed;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return seed;
    }
}

function set<T>(name: string, value: T): void {
    window.localStorage.setItem(storageKey(name), JSON.stringify(value));
}

// ARCHITECT: reset() без имени чистит всю мок-базу — это действие кнопки сброса в DEV-панели.
function reset(name?: string): void {
    if (name !== undefined) {
        window.localStorage.removeItem(storageKey(name));
        return;
    }
    const mockKeys = Object.keys(window.localStorage).filter((key) => key.startsWith(PREFIX));
    for (const key of mockKeys) window.localStorage.removeItem(key);
}

export const mockDb = { get, set, reset };
