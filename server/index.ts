// ARCHITECT: точка входа сервера. Окружение проверяется до поднятия порта, поэтому невалидная
// конфигурация останавливает процесс, а не проявляется падением на первом запросе.
import { buildApp } from "./app.ts";
import { configureCookies } from "./cookies.ts";
import { loadEnv, type ServerEnv } from "./env.ts";

function readEnv(): ServerEnv {
    try {
        return loadEnv(process.env);
    } catch (error) {
        // ARCHITECT: в лог уходит только текст ошибки loadEnv (имена ключей); значения переменных не
        // печатаются никогда — иначе секрет попал бы в терминал и в сборщик логов.
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

const env = readEnv();

// ARCHITECT: режим Secure для кук — из проверенного env, один раз на старте; сами куки env не читают.
configureCookies({ secure: env.NODE_ENV === "production" });

// ARCHITECT: одна строка о старте: уровень, сообщение и порт; значения переменных окружения не логируются.
buildApp().listen(env.PORT, () => {
    console.log(JSON.stringify({ level: "info", msg: "api listening", port: env.PORT }));
});
