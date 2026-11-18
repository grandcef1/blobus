// ARCHITECT: единственная функция Vercel для всего API; вход .mjs, потому что сервер уже собран в JS обычным tsc и мы не зависим от TS-компилятора Vercel; локальный дев-запуск идёт нативным Node из server/, эта точка только для Vercel.
import { buildApp } from "../dist-server/app.js";
// ARCHITECT: ключи Supabase в Vercel заданы, поэтому loadEnv вызывается здесь осознанно: fail-fast включён —
// отсутствие переменной останавливает функцию, а не даёт тихий 401 на /api/auth. При валидном env
// /api/health работает как раньше и от Supabase не зависит.
import { loadEnv } from "../dist-server/env.js";
// ARCHITECT: режим Secure для кук на Vercel: NODE_ENV — флаг режима, не секрет, читается в точке входа.
import { configureCookies } from "../dist-server/cookies.js";

const env = loadEnv(process.env);

configureCookies({ secure: env.NODE_ENV === "production" });

export default buildApp(undefined, env);
