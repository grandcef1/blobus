-- ARCHITECT: название сессии задаёт пользователь, поэтому колонка аддитивная и nullable: у старых строк названия
-- нет, и интерфейс показывает производный заголовок «репетитор · режим» (§спец. 3). Длину держит CHECK, а данные
-- существующих строк не меняются.
alter table public.sessions
    add column if not exists title text
    check (title is null or char_length(title) between 1 and 80);

-- ARCHITECT: правку своей сессии пользователь делает сам, но только двух колонок: апдейт-политика открывает
-- строку, а колоночный grant — ровно title и tutor_id. mode, user_id и метки времени остаются недоступными
-- клиенту, их меняет только серверный код (§16.5). Политика пересоздаётся: повторный прогон миграции не должен
-- падать на уже существующем имени.
drop policy if exists sessions_update_own on public.sessions;

create policy sessions_update_own on public.sessions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

grant update (title, tutor_id) on table public.sessions to authenticated;

-- ARCHITECT: удаление сессии и очистка её уроков/сообщений идут service-role: delete-грантов у authenticated нет,
-- а каскад lessons → messages снимает внешний ключ on delete cascade из core_learning. Серверный код при этом
-- сверяет владение: чужая и несуществующая сессия отвечают одинаково (§16.5).
