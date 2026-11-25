-- ARCHITECT: серверный флаг завершения онбординга: источник правды — колонка профиля, а не клиент.
-- Колонка nullable без default: отсутствие значения = онбординг ещё не пройден.
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

-- ARCHITECT: backfill (согласовано владельцем): существующие аккаунты считаются прошедшими онбординг.
-- Новые регистрации получают null через существующий триггер handle_new_user — его не меняем.
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;

-- ARCHITECT: гранты и политики не меняем: колоночный grant update (display_name, locale, daily_minutes)
-- не включает новую колонку, поэтому authenticated не может писать её через PostgREST; table-level select
-- и политика profiles_select_own дают чтение только своей строки; service_role имеет table-level all и
-- пишет колонку.
