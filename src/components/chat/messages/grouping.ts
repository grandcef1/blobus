// ARCHITECT: группировка ленты как в мессенджере: подряд идущие реплики одного отправителя с паузой до двух
// минут — одна группа. Разделитель даты и реплика другого отправителя группу ломают (§спец. 1).
// ARCHITECT: логика групп — чистые функции без React: их проверяет юнит-тест, а разметку держит MessageGroup.
// Модуль отдельный, потому что файл компонента не экспортирует ничего, кроме компонентов (react-refresh).

import type { ChatFeedMessage } from "@/hooks/useChat";
import type { MessagePosition } from "./messageShape";

/** Пауза, после которой реплики одного отправителя считаются разными группами. */
export const GROUP_GAP_MS = 2 * 60 * 1000;

export interface ChatGroupEntry {
    readonly message: ChatFeedMessage;
    /** Предыдущая реплика: правки репетитора объясняют именно её текст. */
    readonly prev: ChatFeedMessage | undefined;
    /** Следующая реплика: её карточки объясняют правки в этой. */
    readonly next: ChatFeedMessage | undefined;
    readonly position: MessagePosition;
}

export interface ChatGroup {
    readonly key: string;
    readonly role: "user" | "assistant";
    /** Календарный день группы: смена дня ставит разделитель даты перед группой. */
    readonly dayKey: string;
    readonly entries: readonly ChatGroupEntry[];
}

/** Календарный день в локальной зоне: разделитель даты и граница группы считаются по нему. */
export function dayKeyOf(timestamp: number): string {
    const date = new Date(timestamp);

    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function positionOf(index: number, length: number): MessagePosition {
    if (length === 1) return "single";
    if (index === 0) return "first";
    if (index === length - 1) return "last";

    return "middle";
}

/**
 * Собирает ленту в группы: пауза больше двух минут, смена отправителя и смена дня начинают новую группу.
 * Пустые реплики (первая часть ответа ещё в пути) в группы не попадают — их рисует индикатор набора.
 */
export function groupMessages(messages: readonly ChatFeedMessage[]): readonly ChatGroup[] {
    const groups: {
        key: string;
        role: "user" | "assistant";
        dayKey: string;
        entries: ChatGroupEntry[];
    }[] = [];

    messages.forEach((message, index) => {
        if (message.role === "assistant" && message.content === "") return;

        const previous = index === 0 ? undefined : messages[index - 1];
        const open = groups[groups.length - 1];
        const gap = previous === undefined ? 0 : message.createdAt - previous.createdAt;
        const continues =
            open !== undefined &&
            previous !== undefined &&
            open.role === message.role &&
            gap >= 0 &&
            gap <= GROUP_GAP_MS &&
            dayKeyOf(previous.createdAt) === dayKeyOf(message.createdAt);

        const entry: ChatGroupEntry = {
            message,
            prev: previous,
            next: messages[index + 1],
            position: "single",
        };

        if (continues && open !== undefined) {
            open.entries.push(entry);
            return;
        }

        groups.push({
            key: message.id,
            role: message.role,
            dayKey: dayKeyOf(message.createdAt),
            entries: [entry],
        });
    });

    // ARCHITECT: углы пузыря зависят от места в группе, поэтому позиция проставляется после её сборки.
    for (const group of groups)
        group.entries.forEach((entry, index) => {
            group.entries[index] = { ...entry, position: positionOf(index, group.entries.length) };
        });

    return groups;
}

/** Группа с готовым решением о разделителе даты: первая группа дня подписывается, остальные идут без него. */
export interface DatedGroup {
    readonly group: ChatGroup;
    /** Метка времени первой реплики группы: 0 — времени нет, разделитель не рисуется. */
    readonly at: number;
    readonly showDate: boolean;
}

/** Расставляет разделители даты по группам: считается заранее, чтобы отрисовка ничего не меняла. */
export function withDateDividers(groups: readonly ChatGroup[]): readonly DatedGroup[] {
    return groups.map((group, index) => {
        const previous = index === 0 ? undefined : groups[index - 1];
        const at = group.entries[0]?.message.createdAt ?? 0;

        return {
            group,
            at,
            showDate: at > 0 && (previous === undefined || previous.dayKey !== group.dayKey),
        };
    });
}
