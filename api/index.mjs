// ARCHITECT: единственная функция Vercel для всего API; вход .mjs, потому что сервер уже собран в JS обычным tsc и мы не зависим от TS-компилятора Vercel; локальный дев-запуск идёт нативным Node из server/, эта точка только для Vercel.
import { buildApp } from "../dist-server/app.js";
// ARCHITECT: режим Secure для кук на Vercel: NODE_ENV — флаг режима, не секрет, читается в точке входа.
// Полную loadEnv здесь не вызываем: Supabase-ключи в Vercel ещё не заданы, fail-fast уронил бы /api/health;
// валидация всего окружения в этой точке — шаг Ф3.4.
import { configureCookies } from "../dist-server/cookies.js";
configureCookies({ secure: process.env.NODE_ENV === "production" });

export default buildApp();
