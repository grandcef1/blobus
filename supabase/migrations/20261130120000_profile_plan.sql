-- ARCHITECT: тариф пользователя зеркалится в profiles, чтобы GET /api/settings отдавал план вместе с
-- настройками одним чтением. Источник тарифа — биллинг, поэтому колоночный grant update
-- (display_name, locale, daily_minutes) НЕ расширяем: plan пишет только service_role, а у authenticated
-- есть лишь table-level select, который RLS select-own уже ограничивает своей строкой (16.2, 16.5).
alter table public.profiles add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro'));
