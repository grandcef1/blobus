// ARCHITECT: углы пузыря зависят от места реплики в группе, поэтому форма живёт отдельным модулем: файл
// компонента не экспортирует ничего, кроме компонентов (react-refresh/only-export-components — то же правило,
// по которому рядом лежат quizCheck.ts и quizConstants.ts).

/** Место реплики в группе: от него зависят углы пузыря и наличие аватара с именем. */
export type MessagePosition = "first" | "middle" | "last" | "single";

// ARCHITECT: у первой реплики скруглён верх, у последней низ, у средних — малые углы. Сторона, к которой прижат
// аватар, между репликами почти прямая, внешняя всегда скруглена крупно.
const SHAPES: Record<MessagePosition, string> = {
    single: "rounded-2xl",
    first: "rounded-2xl rounded-bl-md",
    middle: "rounded-xl rounded-tl-md rounded-bl-md",
    last: "rounded-2xl rounded-tl-md",
};
const SHAPES_USER: Record<MessagePosition, string> = {
    single: "rounded-2xl",
    first: "rounded-2xl rounded-br-md",
    middle: "rounded-xl rounded-tr-md rounded-br-md",
    last: "rounded-2xl rounded-tr-md",
};

/** Углы пузыря по месту в группе: у реплики ученика сторона зеркальная. */
export function bubbleShape(position: MessagePosition, role: "user" | "assistant"): string {
    return role === "user"
        ? (SHAPES_USER[position] ?? SHAPES_USER.single)
        : (SHAPES[position] ?? SHAPES.single);
}
