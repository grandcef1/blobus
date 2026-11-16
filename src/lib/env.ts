// ARCHITECT: единственный переключатель мок↔реальный API в приложении. Сравнение со строкой "false",
// а не приведение к boolean: значение приходит из .env строкой, и опечатка в ней должна оставлять
// моки включёнными — иначе сборка без .env ходила бы в несуществующий бэкенд.

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

// ARCHITECT: USE_MOCKS — про источник данных, не про канал ошибок: связка «моки = отчёты только в
// консоль» лишала нас видимости ошибок пользователей, отказавшихся от cookies. Пустое значение =
// first-party канал выключен (бэкенда ещё нет), путь при этом готов и включается одной переменной.
export const ERROR_LOG_ENDPOINT: string = import.meta.env.VITE_ERROR_LOG_ENDPOINT ?? "";

// ARCHITECT: пустой DSN — Sentry выключен целиком: чанк SDK не грузится, транспорт не ставится.
// DSN публичный (send-only), поэтому лежит во frontend-переменных и не является секретом.
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? "";
