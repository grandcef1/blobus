// ARCHITECT: добавление слова в свой словарь: ровно поля контракта POST /api/vocabulary. Пустое поле уходит
// как null, а не пустой строкой — сервер трактует пустое значение как «нет перевода».
// ARCHITECT: дубль слова сервер отдаёт той же записью с 200, поэтому это не ошибка: диалог закрывается так же.

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ApiError } from "@/api/client";
import { addVocabularyEntry } from "@/api/progress";
import type { AddVocabularyInput } from "@/api/progress";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { FOCUS_RING, INPUT_SURFACE } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

interface AddWordDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
}

// ARCHITECT: границы полей — как в серверной схеме, чтобы обработчик не отклонял ввод, который уже набран.
const TERM_MAX = 120;
const TRANSLATION_MAX = 240;
const CONTEXT_MAX = 500;
const FIELD = "mt-3 flex flex-col gap-1.5";
const FIELD_LABEL = "text-xs text-[#f0f0f5]/50";
const ACTION =
    "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50";
const PRIMARY_ACTION = cn(ACTION, "bg-[#f0f0f5] font-medium text-black hover:bg-[#f0f0f5]/90");
const SECONDARY_ACTION = cn(ACTION, "border border-white/15 text-[#f0f0f5] hover:bg-white/5");

type WordDraftField = "term" | "translation" | "context" | "exampleTranslation";
type WordDraft = Record<WordDraftField, string>;

interface WordFieldSpec {
    readonly id: WordDraftField;
    readonly labelKey:
        | "vocabulary.add.term"
        | "vocabulary.add.translation"
        | "vocabulary.add.example"
        | "vocabulary.add.exampleTranslation";
    readonly maxLength: number;
    readonly multiline: boolean;
}

const WORD_FIELDS: readonly WordFieldSpec[] = [
    {
        id: "term",
        labelKey: "vocabulary.add.term",
        maxLength: TERM_MAX,
        multiline: false,
    },
    {
        id: "translation",
        labelKey: "vocabulary.add.translation",
        maxLength: TRANSLATION_MAX,
        multiline: false,
    },
    {
        id: "context",
        labelKey: "vocabulary.add.example",
        maxLength: CONTEXT_MAX,
        multiline: true,
    },
    {
        id: "exampleTranslation",
        labelKey: "vocabulary.add.exampleTranslation",
        maxLength: CONTEXT_MAX,
        multiline: true,
    },
];

const EMPTY_DRAFT: WordDraft = {
    term: "",
    translation: "",
    context: "",
    exampleTranslation: "",
};

/** Пустое поле — это null: сервер различает «нет перевода» и пустую строку. */
function blankToNull(value: string): string | null {
    const trimmed = value.trim();

    return trimmed === "" ? null : trimmed;
}

export function AddWordDialog({ open, onOpenChange }: AddWordDialogProps) {
    const { t } = useTranslation("dashboard");
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<WordDraft>(EMPTY_DRAFT);
    const [lastOpen, setLastOpen] = useState(open);

    // ARCHITECT: черновик очищается при открытии: состояние правится на рендере, а не в эффекте — иначе
    // в уже открытом диалоге мелькнул бы прошлый текст (как в NewTicketDialog).
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setDraft(EMPTY_DRAFT);
    }

    const mutation = useMutation({
        // ARCHITECT: вызов идёт через стрелку: модуль api читается в момент отправки, поэтому мок-модули
        // тестов, которым нужен только чтение, не обязаны объявлять функцию добавления.
        mutationFn: (input: AddVocabularyInput) => addVocabularyEntry(input),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
            onOpenChange(false);
        },
        onError: (error) => {
            // ARCHITECT: 401 разбирает общий useAuthExpiry — свой тост был бы вторым; диалог остаётся открытым.
            if (!(error instanceof ApiError && error.statusCode === 401)) {
                toast.error(t("vocabulary.add.error"));
            }
        },
    });

    const busy = mutation.isPending;

    const setField = (id: WordDraftField, value: string): void => {
        setDraft((previous) => ({ ...previous, [id]: value }));
    };

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();

        const term = draft.term.trim();

        // ARCHITECT: пустое слово не отправляем: сервер бы его отклонил, а тост ругался бы зря.
        if (term === "" || busy) return;

        mutation.mutate({
            term,
            translation: blankToNull(draft.translation),
            context: blankToNull(draft.context),
            exampleTranslation: blankToNull(draft.exampleTranslation),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* ARCHITECT: у диалога нет строки-подсказки: в списке ключей задачи её нет, а выдумывать новый
                ключ нельзя — поэтому описание отключено явно, вместо пустого DialogDescription. */}
            <DialogContent aria-describedby={undefined}>
                <DialogTitle>{t("vocabulary.add.title")}</DialogTitle>

                <form onSubmit={handleSubmit} noValidate>
                    {WORD_FIELDS.map((field) => (
                        <div key={field.id} className={FIELD}>
                            <label htmlFor={`add-word-${field.id}`} className={FIELD_LABEL}>
                                {t(field.labelKey)}
                            </label>
                            {field.multiline ? (
                                <textarea
                                    id={`add-word-${field.id}`}
                                    rows={2}
                                    value={draft[field.id]}
                                    maxLength={field.maxLength}
                                    onChange={(event) => setField(field.id, event.target.value)}
                                    className={cn(INPUT_SURFACE, "resize-none")}
                                />
                            ) : (
                                <input
                                    id={`add-word-${field.id}`}
                                    type="text"
                                    value={draft[field.id]}
                                    maxLength={field.maxLength}
                                    onChange={(event) => setField(field.id, event.target.value)}
                                    className={INPUT_SURFACE}
                                />
                            )}
                        </div>
                    ))}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className={cn(SECONDARY_ACTION, FOCUS_RING)}
                        >
                            {t("vocabulary.add.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={busy}
                            className={cn(PRIMARY_ACTION, FOCUS_RING)}
                        >
                            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            {t("vocabulary.add.submit")}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
