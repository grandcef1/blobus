-- ARCHITECT: путь к картинке пользователя в приватном бакете avatars. null = своей картинки нет: UI
-- показывает иконку или картинку провайдера. Границы 1..300 покрывают ключ вида <user_id>/<uuid>.webp.
alter table public.profiles add column if not exists avatar_path text
    check (avatar_path is null or char_length(avatar_path) between 1 and 300);

-- ARCHITECT: колоночный grant update (display_name, locale, daily_minutes) НЕ расширяем: путь аватара пишет
-- только сервер из доверенного кода, иначе клиент подставил бы чужой ключ и получил доступ к картинке
-- другого пользователя (§16.2). service_role имеет table-level all — запись ему разрешена, authenticated — нет.

-- ARCHITECT: бакет приватный: public=false, 2 МБ на файл, только jpeg/png/webp. Политик storage.objects для
-- anon/authenticated нет — deny by default; доступ только у service_role, наружу позже короткоживущие signed
-- URL (§16.10). on conflict do nothing — повторная миграция не затирает настройки бакета.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;