-- ARCHITECT: первая строка дня тоже проверяет лимит: в прежних версиях reserve_message/reserve_lesson ветка
-- "not found" вставляла счётчик без проверки, поэтому при daily_*_limit = 0 первый запрос дня проходил, а
-- второй падал — лимит 0 не работал ровно один раз за сутки. Проверка лимита теперь стоит до вставки, и
-- отказ одинаков и для первой строки дня, и для последующих.
-- ARCHITECT: транзакция та же (проверка + вставка/обновление): строку держит SELECT ... FOR UPDATE, вставка
-- новой строки защищена unique(user_id, date), поэтому параллельные первые запросы не создают две строки.

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

    if v_entitlements.daily_lessons_limit <= 0 then
        raise exception 'QUOTA_EXHAUSTED:lessons' using errcode = 'P0001';
    end if;

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

    if v_entitlements.daily_messages_limit <= 0 then
        raise exception 'QUOTA_EXHAUSTED:messages' using errcode = 'P0001';
    end if;

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
