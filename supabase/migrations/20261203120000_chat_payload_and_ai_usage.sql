-- ARCHITECT: чат пишет карточки разбора и расход модели в messages.payload: текста ответа в jsonb нет —
-- только карточки и usage. Колонка additive с дефолтом, поэтому существующие строки не меняются.
-- ARCHITECT: месячный агрегат токенов живёт в usage_counters: строка уже ключуется (user_id, date), поэтому
-- отдельная таблица не нужна — месяц считается суммой по строкам месяца.
-- ARCHITECT: колонка messages.payload закрыта RLS самой таблицы (select-own): карточки видит только
-- владелец строки, а пишет их service-role, как и сами сообщения.

alter table public.messages
    add column payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8192);

alter table public.usage_counters
    add column tokens_used int not null default 0 check (tokens_used >= 0);

create or replace function public.record_ai_tokens(p_user_id uuid, p_tokens int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_counter public.usage_counters;
    v_month_tokens bigint;
begin
    -- ARCHITECT: границы входа проверяются в функции: RPC — граница доверия, а отрицательный расход
    -- исказил бы месячный агрегат.
    if p_tokens < 0 or p_tokens > 100000 then
        raise exception 'BAD_TOKENS' using errcode = 'P0001';
    end if;

    insert into public.usage_counters (user_id, tokens_used)
    values (p_user_id, p_tokens)
    on conflict (user_id, date) do update
        set tokens_used = public.usage_counters.tokens_used + excluded.tokens_used
    returning * into v_counter;

    select coalesce(sum(tokens_used), 0) into v_month_tokens
    from public.usage_counters
    where user_id = p_user_id and date >= date_trunc('month', current_date)::date;

    return jsonb_build_object(
        'tokens_today', v_counter.tokens_used,
        'tokens_month', v_month_tokens
    );
end;
$$;

revoke execute on function public.record_ai_tokens(uuid, int) from public, authenticated, anon;
grant execute on function public.record_ai_tokens(uuid, int) to service_role;
