-- ARCHITECT: повторение слов по Лейтнеру: stage — текущий шаг 1..5, next_due_at — когда слово снова
-- показывать. Колонки аддитивные: существующие слова получают шаг 1 и ближайший показ, поэтому после
-- миграции они сразу попадают в повторение, а не выпадают из него.
alter table public.vocabulary add column if not exists stage smallint not null default 1
    check (stage between 1 and 5);

alter table public.vocabulary add column if not exists next_due_at timestamptz not null default now();

-- ARCHITECT: колоночный grant не расширяется: шаг и дату двигает только серверный код под service_role,
-- иначе клиент мог бы сам объявить слово выученным (§16.2). Индекс под выборку «пора повторить» пока не
-- нужен: чтение идёт по vocabulary_user_created с лимитом 50.
