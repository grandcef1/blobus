// ARCHITECT: админ-панель. Цветные бейджи статусов и плитки метрик заменены текстом с тонким
// маркером: статус читается и без цвета, а палитра остаётся монохромной. Секции вынесены в
// отдельные файлы, чтобы страница и списки остались в пределах 150 строк.

import { motion } from "framer-motion";
import { AdminMetrics } from "./admin/AdminMetrics";
import { AdminTicketsList } from "./admin/AdminTicketsList";
import { AdminUsersList } from "./admin/AdminUsersList";

export function AdminPage() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Админ</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">Состояние аккаунтов и обращений</p>
                </motion.header>

                <div className="space-y-4">
                    <AdminMetrics />
                    <AdminTicketsList />
                    <AdminUsersList />
                </div>
            </div>
        </div>
    );
}
