// ARCHITECT: инструкция перед первым заданием — единственное место, где объясняется лимит из двух
// прослушиваний: без него кнопка, гаснущая после второго клика, читается как поломка.
// ARCHITECT: блок оформлен карточкой шага: проверка идёт и внутри мастера, и на экране в его стиле,
// поэтому поверхность у обоих входов одна, а расходиться видам незачем.

import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/lib/surfaces";

interface ListeningIntroProps {
    onStart: () => void;
    /** Выход с отдельного экрана: в мастере его нет — оттуда ведут «Назад» и шаги мастера. */
    onExit?: () => void;
}

export function ListeningIntro({ onStart, onExit }: ListeningIntroProps) {
    return (
        <StepCard>
            <h2 className="flex items-center gap-2 text-base font-medium text-[#f0f0f5]/80">
                <Headphones className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                Проверка аудирования
            </h2>

            <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/60">
                Перед выбором ответа прослушайте запись. Каждый фрагмент можно прослушать только
                дважды — отвечайте после прослушивания.
            </p>

            <div className="mt-5 flex items-center justify-between gap-4">
                {onExit ? (
                    <Button type="button" variant="ghost" onClick={onExit} className={GHOST_BUTTON}>
                        Выйти
                    </Button>
                ) : (
                    <span />
                )}

                <Button type="button" className={PRIMARY_BUTTON} onClick={onStart}>
                    Начать
                </Button>
            </div>
        </StepCard>
    );
}