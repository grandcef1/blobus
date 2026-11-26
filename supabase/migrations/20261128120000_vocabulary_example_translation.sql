-- ARCHITECT: перевод примера — данные слова, а не текст интерфейса: он приходит вместе с примером и лежит
-- рядом с context. Колонка аддитивная и nullable: старые слова остаются без перевода, а длину держит CHECK
-- как у context. Пишет только service_role — колоночный grant update не расширяем (как stage/next_due_at).
alter table public.vocabulary
    add column if not exists example_translation text
    check (example_translation is null or char_length(example_translation) <= 500);
