// ARCHITECT: банк аудирования. В основной адаптивный тест эти задания не входят: понимание на
// слух проверяется отдельным диалогом, потому что требует озвучки. audioText читает синтезатор
// речи браузера (en-US), вопрос проверяет понимание, а не произношение говорящего.

import type { PlacementItem } from "@/types/placement";

export const LISTENING_ITEMS: PlacementItem[] = [
    {
        id: "listening_a2_1",
        skill: "listening",
        level: "A2",
        audioText: "The train to Oxford leaves from platform four at half past six.",
        prompt: "Когда отправляется поезд?",
        options: [
            { id: "a", text: "в 6:30" },
            { id: "b", text: "в 4:30" },
            { id: "c", text: "в 6:00" },
            { id: "d", text: "в 7:30" },
        ],
        correctOptionId: "a",
        explanation: "Half past six — половина седьмого, то есть 6:30.",
    },
    {
        id: "listening_a2_2",
        skill: "listening",
        level: "A2",
        audioText: "I'd like a table for two by the window, please.",
        prompt: "Что нужно говорящему?",
        options: [
            { id: "a", text: "столик на двоих у окна" },
            { id: "b", text: "столик на четверых" },
            { id: "c", text: "номер в гостинице" },
            { id: "d", text: "меню на английском" },
        ],
        correctOptionId: "a",
        explanation: "A table for two by the window — столик на двоих у окна.",
    },
    {
        id: "listening_b1_1",
        skill: "listening",
        level: "B1",
        audioText:
            "The meeting has been moved from Tuesday to Thursday because the client is travelling.",
        prompt: "Почему встреча перенесена?",
        options: [
            { id: "a", text: "клиент в отъезде" },
            { id: "b", text: "занята переговорная" },
            { id: "c", text: "заболел коллега" },
            { id: "d", text: "не готова повестка" },
        ],
        correctOptionId: "a",
        explanation: "The client is travelling — причина в поездке клиента.",
    },
    {
        id: "listening_b1_2",
        skill: "listening",
        level: "B1",
        audioText:
            "Could you send me the invoice again? I can't find the attachment from last week.",
        prompt: "О чём просит говорящий?",
        options: [
            { id: "a", text: "отправить счёт повторно" },
            { id: "b", text: "подготовить новый договор" },
            { id: "c", text: "прислать повестку недели" },
            { id: "d", text: "подтвердить оплату" },
        ],
        correctOptionId: "a",
        explanation: "Send the invoice again — счёт нужно отправить заново.",
    },
    {
        id: "listening_b2_1",
        skill: "listening",
        level: "B2",
        audioText:
            "Although the data looked promising, the team decided to run one more test before publishing the results.",
        prompt: "Что команда сделает дальше?",
        options: [
            { id: "a", text: "проведёт ещё один тест" },
            { id: "b", text: "опубликует результаты сейчас" },
            { id: "c", text: "закроет проект" },
            { id: "d", text: "соберёт данные заново" },
        ],
        correctOptionId: "a",
        explanation: "Run one more test — до публикации нужен ещё один прогон.",
    },
    {
        id: "listening_c1_1",
        skill: "listening",
        level: "C1",
        audioText:
            "Had we known about the delay, we would have booked the earlier flight and avoided the whole rush.",
        prompt: "Что подразумевает говорящий?",
        options: [
            { id: "a", text: "выбрал поздний рейс и попал в спешку" },
            { id: "b", text: "успел на ранний рейс" },
            { id: "c", text: "пропустил свой рейс" },
            { id: "d", text: "избежал спешки" },
        ],
        correctOptionId: "a",
        explanation: "Had we known ... would have booked — сожалеет о выбранном рейсе.",
    },
];