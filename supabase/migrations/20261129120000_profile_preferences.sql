-- ARCHITECT: настройки одним jsonb; дефолт {} заполняется схемой на чтении; пишет только service_role,
-- колоночный grant update не расширяем (как stage/next_due_at). RLS select-own уже покрывает чтение
-- колонки, новых политик не нужно.
alter table public.profiles add column if not exists preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(preferences) = 'object');
