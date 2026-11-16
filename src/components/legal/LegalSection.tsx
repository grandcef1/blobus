// ARCHITECT: раздел правового документа. Иерархия h1 → h2 без пропусков: заголовок страницы в
// LegalLayout, разделы здесь — так скринридер и поиск по странице видят структуру документа.
// ARCHITECT: body печатается с whitespace-pre-line: абзацы в словаре разделены \n\n, и переводимый
// текст остаётся читаемым в JSON, а не превращается в одну длинную строку.

import type { ReactNode } from "react";

interface LegalSectionProps {
    readonly title: string;
    readonly body?: string;
    readonly children?: ReactNode;
}

export function LegalSection({ title, body, children }: LegalSectionProps) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-xl font-normal tracking-tight text-[#f0f0f5] md:text-2xl">{title}</h2>
            {body && (
                <p className="whitespace-pre-line text-base leading-relaxed text-[#f0f0f5]/60">{body}</p>
            )}
            {children}
        </section>
    );
}
