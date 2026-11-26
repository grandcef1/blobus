-- ARCHITECT: единый владелец тарифа — public.entitlements (его читают reserve_*/get_or_create_entitlements, там
-- же живут лимиты и туда пишет биллинг). Профильный дубль profiles.plan удаляется, чтобы у плана не было двух
-- источников правды. Идемпотентно: column if exists.
alter table public.profiles drop column if exists plan;
