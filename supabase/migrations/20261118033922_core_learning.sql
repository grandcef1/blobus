-- ARCHITECT: первая миграция core learning: профили, сессии, уроки, сообщения. Схема owner-only: клиент
-- читает своё, а писать в эти таблицы не может ни один пользовательский ключ.
-- ARCHITECT: в profiles нет тарифа: entitlements живут на сервере, клиент не назначает себе план.
-- ARCHITECT: запись в sessions/lessons/messages доступна только service-role: квоты атомарны, и обойти
-- счётчик на уровне БД невозможно.
-- ARCHITECT: user_id не дублируется в lessons/messages: один источник правды, владение проверяется через сессию.
-- ARCHITECT: grant update на profiles колоночный: клиент правит только профильные поля, id и created_at неизменяемы.
-- ARCHITECT: anon без грантов — deny by default.
-- ARCHITECT: tutor_id и mode ограничены длиной, а allowlist значений проверяет сервер в Ф4.

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default '' check (char_length(display_name) <= 80),
    locale text not null default 'ru' check (locale in ('ru', 'en', 'es')),
    daily_minutes int not null default 20 check (daily_minutes between 5 and 120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    tutor_id text not null check (char_length(tutor_id) between 1 and 64),
    mode text not null check (char_length(mode) between 1 and 32),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.lessons (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions (id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
    plan jsonb check (plan is null or (jsonb_typeof(plan) = 'object' and octet_length(plan::text) <= 16384)),
    daily_minutes int not null check (daily_minutes between 5 and 120),
    started_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    lesson_id uuid not null references public.lessons (id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null check (char_length(content) between 1 and 4000),
    created_at timestamptz not null default now()
);

create index sessions_user_created_idx on public.sessions (user_id, created_at desc, id desc);
create index lessons_session_started_idx on public.lessons (session_id, started_at desc, id desc);
create index messages_lesson_created_idx on public.messages (lesson_id, created_at, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute function public.set_updated_at();

create trigger sessions_set_updated_at
    before update on public.sessions
    for each row
    execute function public.set_updated_at();

create trigger lessons_set_updated_at
    before update on public.lessons
    for each row
    execute function public.set_updated_at();

-- ARCHITECT: профиль заводит триггер на auth.users, а не клиент: иначе пользователь без профиля ломал бы
-- чтение своих данных, а создать строку в profiles ему всё равно нечем — insert-грантов нет.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.lessons enable row level security;
alter table public.messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.sessions to authenticated;
grant select on table public.lessons to authenticated;
grant select on table public.messages to authenticated;

grant update (display_name, locale, daily_minutes) on table public.profiles to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.sessions to service_role;
grant all on table public.lessons to service_role;
grant all on table public.messages to service_role;

create policy profiles_select_own on public.profiles
    for select
    to authenticated
    using (id = auth.uid());

create policy profiles_update_own on public.profiles
    for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

create policy sessions_select_own on public.sessions
    for select
    to authenticated
    using (user_id = auth.uid());

create policy lessons_select_own on public.lessons
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.sessions s
            where s.id = lessons.session_id and s.user_id = auth.uid()
        )
    );

create policy messages_select_own on public.messages
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.lessons l
            join public.sessions s on s.id = l.session_id
            where l.id = messages.lesson_id and s.user_id = auth.uid()
        )
    );

