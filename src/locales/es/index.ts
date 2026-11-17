// ARCHITECT: баррель нужен, чтобы Vite собрал язык в ОДИН чанк вместо 11 отдельных JSON-чанков;
// имена экспортов обязаны совпадать с NAMESPACES, иначе addResourceBundle положит переводы не в тот неймспейс.
export { default as common } from "./common.json";
export { default as landing } from "./landing.json";
export { default as footer } from "./footer.json";
export { default as auth } from "./auth.json";
export { default as legal } from "./legal.json";
export { default as billing } from "./billing.json";
export { default as dashboard } from "./dashboard.json";
export { default as docs } from "./docs.json";
export { default as chat } from "./chat.json";
export { default as onboarding } from "./onboarding.json";
export { default as placement } from "./placement.json";