// ARCHITECT: единственная функция Vercel для всего API; вход .mjs, потому что сервер уже собран в JS обычным tsc и мы не зависим от TS-компилятора Vercel; локальный дев-запуск идёт нативным Node из server/, эта точка только для Vercel.
import { buildApp } from "../dist-server/app.js";

export default buildApp();
