-- ARCHITECT: имя из метаданных провайдера: GoTrue при OAuth кладёт профиль Google в raw_user_meta_data
-- (full_name/name), а триггер заводил строку с пустым display_name — пользователь оставался «Учеником»
-- даже при наличии имени в аккаунте. Метаданные правит сам пользователь, поэтому это недоверенные данные
-- (§16.2): значение только чистится и обрезается по CHECK-границе схемы, в SQL-выражения не подставляется.
-- Архитектура триггера не меняется: security definer, search_path = public, on conflict do nothing.
-- ARCHITECT: без метаданных имя остаётся пустым, как и было: заглушку в интерфейсе показывает
-- profile.fallbackName, а выводить имя из адреса — значит придумывать данные, которых нет.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    name text;
begin
    name := coalesce(
        nullif(regexp_replace(trim(meta ->> 'full_name'), '\s+', ' ', 'g'), ''),
        nullif(regexp_replace(trim(meta ->> 'name'), '\s+', ' ', 'g'), '')
    );

    insert into public.profiles (id, display_name)
    values (new.id, left(coalesce(name, ''), 80))
    on conflict (id) do nothing;

    return new;
end;
$$;

-- ARCHITECT: однократный догон для уже созданных аккаунтов: только строки, заведённые входом через
-- провайдера (identity не email), только с пустым именем и только когда метаданные имя действительно несут —
-- намеренно очищенное пользователем имя и аккаунты без метаданных не задеваются.
update public.profiles p
   set display_name = left(
           coalesce(
               nullif(regexp_replace(trim(u.raw_user_meta_data ->> 'full_name'), '\s+', ' ', 'g'), ''),
               nullif(regexp_replace(trim(u.raw_user_meta_data ->> 'name'), '\s+', ' ', 'g'), '')
           ),
           80
       )
  from auth.users u
  join auth.identities i on i.user_id = u.id and i.provider <> 'email'
 where u.id = p.id
   and p.display_name = ''
   and coalesce(
           nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(trim(u.raw_user_meta_data ->> 'name'), '')
       ) is not null;
