// ARCHITECT: одна точка правды для кнопок шапки чата. Класс раньше жил в ChatHeader, но меню
// вынесены в отдельные файлы: копия неизбежно разошлась бы при первой же правке размеров.
// Размеры 44px на телефоне и 40px с md — палец шире мыши.
export const CHAT_HEADER_BUTTON =
    "flex size-11 items-center justify-center rounded-lg text-[#f0f0f5]/40 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:size-10";
