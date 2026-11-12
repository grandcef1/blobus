// ARCHITECT: озвучка английского текста через синтезатор речи браузера. Вынесено в lib, а не в
// компонент: это вызов браузерного API, а не состояние React, поэтому функция не тянет за собой
// зависимости в эффекты и может переиспользоваться (например, в карточке слова).

const SPEECH_LANG = "en-US";
const SPEECH_RATE = 0.95;

/** Читает английский текст вслух. Предыдущая озвучка при этом прерывается. */
export function speakEnglish(text: string): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG;
    utterance.rate = SPEECH_RATE;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

/** Снимает текущую озвучку: голос не должен продолжать читать поверх следующего экрана. */
export function stopSpeaking(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
}