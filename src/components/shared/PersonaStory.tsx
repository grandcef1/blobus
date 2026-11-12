// ARCHITECT: история персонажа — единственный источник текста, поэтому и полоса истории в мастере,
// и карточка на странице репетиторов рендерят его одним компонентом. Первое слово (имя) выделено:
// имя звучит один раз и не создаёт второго носителя идентичности. Защита на случай строки без
// пробела просто оставляет весь текст приглушённым.

interface PersonaStoryProps {
    story: string;
    className?: string;
}

export function PersonaStory({ story, className }: PersonaStoryProps) {
    const spaceIndex = story.indexOf(" ");
    const lead = spaceIndex === -1 ? story : story.slice(0, spaceIndex);
    const tail = spaceIndex === -1 ? "" : story.slice(spaceIndex);

    return (
        <p className={className}>
            <span className="font-medium text-[#f0f0f5]">{lead}</span>
            {tail}
        </p>
    );
}