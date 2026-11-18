-- ARCHITECT: словарь пополняется явным действием пользователя через сервер, а не моделью, поэтому запись
-- доступна только service-role: иначе карточка нового слова из ответа модели писала бы строки сама.
-- ARCHITECT: unique по lower(term) — дедупликация на уровне БД: «Serendipity» и «serendipity» это одно слово.
-- ARCHITECT: source_lesson_id с on delete set null — слово переживает удаление урока, из которого пришло.
-- ARCHITECT: placement_results — история замеров, актуальный результат выбирает сервер по времени.
-- ARCHITECT: тикеты и ответы пишет только сервер (там валидация длины и лимитов), поддержка отвечает через
-- service-role: у пользователя нет ни insert, ни update.
-- ARCHITECT: anon без грантов — deny by default.

create table public.vocabulary (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    term text not null check (char_length(term) between 1 and 120),
    translation text check (translation is null or char_length(translation) <= 240),
    context text check (context is null or char_length(context) <= 500),
    source_lesson_id uuid references public.lessons (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index vocabulary_user_term_unique on public.vocabulary (user_id, lower(term));
create index vocabulary_user_created on public.vocabulary (user_id, created_at desc, id desc);

create trigger vocabulary_set_updated_at
    before update on public.vocabulary
    for each row
    execute function public.set_updated_at();

create table public.placement_results (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    score int not null check (score between 0 and 100),
    created_at timestamptz not null default now()
);

create index placement_results_user_created on public.placement_results (user_id, created_at desc, id desc);

create table public.tickets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    subject text not null check (char_length(subject) between 1 and 160),
    status text not null default 'open' check (status in ('open', 'answered', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger tickets_set_updated_at
    before update on public.tickets
    for each row
    execute function public.set_updated_at();

create index tickets_user_created on public.tickets (user_id, created_at desc, id desc);

create table public.ticket_messages (
    id uuid primary key default gen_random_uuid(),
    ticket_id uuid not null references public.tickets (id) on delete cascade,
    author text not null check (author in ('user', 'support')),
    content text not null check (char_length(content) between 1 and 4000),
    created_at timestamptz not null default now()
);

create index ticket_messages_ticket_created on public.ticket_messages (ticket_id, created_at, id);

alter table public.vocabulary enable row level security;
alter table public.placement_results enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

revoke all on table public.vocabulary from anon, authenticated;
revoke all on table public.placement_results from anon, authenticated;
revoke all on table public.tickets from anon, authenticated;
revoke all on table public.ticket_messages from anon, authenticated;

grant select on table public.vocabulary to authenticated;
grant select on table public.placement_results to authenticated;
grant select on table public.tickets to authenticated;
grant select on table public.ticket_messages to authenticated;

grant all on table public.vocabulary to service_role;
grant all on table public.placement_results to service_role;
grant all on table public.tickets to service_role;
grant all on table public.ticket_messages to service_role;

create policy vocabulary_select_own on public.vocabulary
    for select
    to authenticated
    using (user_id = auth.uid());

create policy placement_results_select_own on public.placement_results
    for select
    to authenticated
    using (user_id = auth.uid());

create policy tickets_select_own on public.tickets
    for select
    to authenticated
    using (user_id = auth.uid());

create policy ticket_messages_select_own on public.ticket_messages
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.tickets t
            where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
        )
    );

