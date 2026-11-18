-- ARCHITECT: тариф живёт в БД и назначается только сервером: клиент не выбирает план и не правит лимиты
-- (16.3/16.4 — entitlements и роль вычисляются на сервере, а не приходят с фронтенда).
-- ARCHITECT: счётчики атомарны: SELECT ... FOR UPDATE внутри plpgsql держит строку до конца транзакции,
-- поэтому две параллельные попытки не пробьют лимит — вторая увидит уже увеличенный lessons_used/messages_used.
-- ARCHITECT: release_* возвращает резерв, когда модель упала после резервирования: списание не должно
-- съедать квоту неудачного запроса.
-- ARCHITECT: сброс по дате — это просто insert новой строки с current_date: старые счётчики остаются для истории.
-- ARCHITECT: unique(user_id) в entitlements — один тариф на пользователя, upsert не создаёт дублей.
-- ARCHITECT: revoke execute — чтобы пользователь с валидным токеном не мог вызвать RPC напрямую через PostgREST:
-- квоту расходует только серверный сервис-клиент.

create table public.entitlements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users (id) on delete cascade,
    plan text not null default 'free' check (plan in ('free', 'pro')),
    daily_lessons_limit int not null default 1 check (daily_lessons_limit >= 0),
    daily_messages_limit int not null default 20 check (daily_messages_limit >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger entitlements_set_updated_at
    before update on public.entitlements
    for each row
    execute function public.set_updated_at();

create table public.usage_counters (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    date date not null default current_date,
    lessons_used int not null default 0 check (lessons_used >= 0),
    messages_used int not null default 0 check (messages_used >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index usage_counters_user_date_unique on public.usage_counters (user_id, date);

create trigger usage_counters_set_updated_at
    before update on public.usage_counters
    for each row
    execute function public.set_updated_at();

create or replace function public.get_or_create_entitlements(p_user_id uuid)
returns public.entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.entitlements;
begin
    select * into v_row
    from public.entitlements e
    where e.user_id = p_user_id
    for update;

    if found then
        return v_row;
    end if;

    insert into public.entitlements (user_id)
    values (p_user_id)
    on conflict (user_id) do nothing
    returning * into v_row;

    if v_row.id is null then
        select * into v_row
        from public.entitlements e
        where e.user_id = p_user_id
        for update;
    end if;

    return v_row;
end;
$$;

create or replace function public.reserve_lesson(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_entitlements public.entitlements;
    v_counter public.usage_counters;
begin
    v_entitlements := public.get_or_create_entitlements(p_user_id);

    select * into v_counter
    from public.usage_counters u
    where u.user_id = p_user_id and u.date = current_date
    for update;

    if not found then
        insert into public.usage_counters (user_id, lessons_used)
        values (p_user_id, 1)
        returning * into v_counter;

        return jsonb_build_object(
            'lessons_remaining', v_entitlements.daily_lessons_limit - 1,
            'messages_remaining', v_entitlements.daily_messages_limit
        );
    end if;

    if v_counter.lessons_used >= v_entitlements.daily_lessons_limit then
        raise exception 'QUOTA_EXHAUSTED:lessons' using errcode = 'P0001';
    end if;

    update public.usage_counters
    set lessons_used = v_counter.lessons_used + 1
    where id = v_counter.id
    returning * into v_counter;

    return jsonb_build_object(
        'lessons_remaining', v_entitlements.daily_lessons_limit - v_counter.lessons_used,
        'messages_remaining', v_entitlements.daily_messages_limit - v_counter.messages_used
    );
end;
$$;

create or replace function public.reserve_message(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_entitlements public.entitlements;
    v_counter public.usage_counters;
begin
    v_entitlements := public.get_or_create_entitlements(p_user_id);

    select * into v_counter
    from public.usage_counters u
    where u.user_id = p_user_id and u.date = current_date
    for update;

    if not found then
        insert into public.usage_counters (user_id, messages_used)
        values (p_user_id, 1)
        returning * into v_counter;

        return jsonb_build_object(
            'lessons_remaining', v_entitlements.daily_lessons_limit,
            'messages_remaining', v_entitlements.daily_messages_limit - 1
        );
    end if;

    if v_counter.messages_used >= v_entitlements.daily_messages_limit then
        raise exception 'QUOTA_EXHAUSTED:messages' using errcode = 'P0001';
    end if;

    update public.usage_counters
    set messages_used = v_counter.messages_used + 1
    where id = v_counter.id
    returning * into v_counter;

    return jsonb_build_object(
        'lessons_remaining', v_entitlements.daily_lessons_limit - v_counter.lessons_used,
        'messages_remaining', v_entitlements.daily_messages_limit - v_counter.messages_used
    );
end;
$$;

create or replace function public.release_lesson(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_counter public.usage_counters;
begin
    update public.usage_counters
    set lessons_used = greatest(0, lessons_used - 1)
    where user_id = p_user_id and date = current_date
    returning * into v_counter;

    if not found then
        return jsonb_build_object('lessons_used', 0, 'messages_used', 0);
    end if;

    return jsonb_build_object(
        'lessons_used', v_counter.lessons_used,
        'messages_used', v_counter.messages_used
    );
end;
$$;

create or replace function public.release_message(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_counter public.usage_counters;
begin
    update public.usage_counters
    set messages_used = greatest(0, messages_used - 1)
    where user_id = p_user_id and date = current_date
    returning * into v_counter;

    if not found then
        return jsonb_build_object('lessons_used', 0, 'messages_used', 0);
    end if;

    return jsonb_build_object(
        'lessons_used', v_counter.lessons_used,
        'messages_used', v_counter.messages_used
    );
end;
$$;

alter table public.entitlements enable row level security;
alter table public.usage_counters enable row level security;

revoke all on table public.entitlements from anon, authenticated;
revoke all on table public.usage_counters from anon, authenticated;

grant all on table public.entitlements to service_role;
grant all on table public.usage_counters to service_role;

revoke execute on function public.get_or_create_entitlements(uuid) from public, authenticated, anon;
revoke execute on function public.reserve_lesson(uuid) from public, authenticated, anon;
revoke execute on function public.reserve_message(uuid) from public, authenticated, anon;
revoke execute on function public.release_lesson(uuid) from public, authenticated, anon;
revoke execute on function public.release_message(uuid) from public, authenticated, anon;

-- ARCHITECT: execute выдаётся service_role явно: публичный грант снят, и без этой строки сервисный ключ
-- потерял бы доступ к RPC вместе с anon и authenticated.
grant execute on function public.get_or_create_entitlements(uuid) to service_role;
grant execute on function public.reserve_lesson(uuid) to service_role;
grant execute on function public.reserve_message(uuid) to service_role;
grant execute on function public.release_lesson(uuid) to service_role;
grant execute on function public.release_message(uuid) to service_role;


