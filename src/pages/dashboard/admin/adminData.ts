// ARCHITECT: данные админ-панели вынесены из страницы: AdminPage стал короче 150 строк, а
// типы и подписи статусов лежат в одной точке и не дублируются между секциями.

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    plan: "free" | "pro";
    status: "active" | "suspended" | "pending";
    lastActive: string;
    issues: number;
}

export interface AdminTicket {
    id: string;
    userId: string;
    userName: string;
    subject: string;
    priority: "low" | "medium" | "high";
    status: "open" | "in-progress" | "resolved";
    createdAt: string;
}

export const ADMIN_USERS: AdminUser[] = [
    { id: "user_1", name: "Алекс Разработчик", email: "alex@blobus.ai", plan: "pro", status: "active", lastActive: "2026-11-10T14:30:00Z", issues: 0 },
    { id: "user_2", name: "Мария Иванова", email: "maria@example.com", plan: "pro", status: "active", lastActive: "2026-11-10T12:15:00Z", issues: 2 },
    { id: "user_3", name: "Иван Смирнов", email: "ivan@example.com", plan: "free", status: "active", lastActive: "2026-11-09T18:45:00Z", issues: 0 },
    { id: "user_4", name: "Сара Уильямс", email: "sarah@example.com", plan: "pro", status: "active", lastActive: "2026-11-10T09:20:00Z", issues: 1 },
    { id: "user_5", name: "Дмитрий Козлов", email: "dmitry@example.com", plan: "pro", status: "suspended", lastActive: "2026-11-05T16:10:00Z", issues: 5 },
];

export const ADMIN_TICKETS: AdminTicket[] = [
    { id: "ticket_1", userId: "user_2", userName: "Мария Иванова", subject: "Не работает коррекция грамматики", priority: "high", status: "open", createdAt: "2026-11-10T10:30:00Z" },
    { id: "ticket_2", userId: "user_4", userName: "Сара Уильямс", subject: "Не могу добавить члена команды", priority: "medium", status: "in-progress", createdAt: "2026-11-09T15:20:00Z" },
    { id: "ticket_3", userId: "user_3", userName: "Иван Смирнов", subject: "Вопрос по повторению слов", priority: "low", status: "resolved", createdAt: "2026-11-08T11:45:00Z" },
];

export const USER_STATUS_LABELS: Record<AdminUser["status"], string> = {
    active: "Активен",
    suspended: "Заблокирован",
    pending: "Ожидает",
};

export const TICKET_STATUS_LABELS: Record<AdminTicket["status"], string> = {
    open: "Открыт",
    "in-progress": "В работе",
    resolved: "Решён",
};

export const PRIORITY_LABELS: Record<AdminTicket["priority"], string> = {
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
};

export function formatAdminDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString("ru", { day: "numeric", month: "short" });
}
