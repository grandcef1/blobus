// ARCHITECT: сниппет чата живёт в двух подачах. На телефоне — компактный живой фрагмент на три
// сообщения: тесные отступы, узкая колонка, блобатар 160/192px. С md возвращается прежняя
// десктопная подача: широкая карточка, прежние отступы сообщений и крупный блобатар
// (320px с scale-240), который занимает всю правую часть карточки и срезается её границей.
// Вынесен из FeaturesSection: один компонент на файл.

import { motion } from "framer-motion";
import { Languages, Volume2 } from "lucide-react";

import { ChatBlobatar } from "@/components/landing/ChatBlobatar";

interface ChatMessage {
    author: "bot" | "user";
    text: string;
    widthClass: string;
}

const CHAT_MESSAGES: ChatMessage[] = [
    {
        author: "bot",
        text: "Tell me about your weekend.",
        widthClass: "max-w-56",
    },
    {
        author: "user",
        text: "I go to cinema with my friends.",
        widthClass: "max-w-[90%]",
    },
    {
        author: "bot",
        text: `Nice! Correct form: "I went to the cinema." Let's practice the Past Simple.`,
        widthClass: "max-w-[90%]",
    },
];

export function ChatPreview() {
    return (
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col items-center justify-center gap-6 md:flex-row md:gap-12">
            <div className="flex min-w-0 w-full flex-1 flex-col gap-3 md:gap-4">
                {CHAT_MESSAGES.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: message.author === "user" ? 20 : -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 + index * 0.25 }}
                        className={`flex min-w-0 max-w-full items-end gap-2 ${message.author === "user" ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                        {/* ARCHITECT: relative + pb-7 у сообщения бота резервируют место внутри
                           пузыря для кнопок действий справа снизу, не увеличивая высоту. */}
                        <div
                            className={`relative min-w-0 break-words rounded-2xl px-3.5 py-2.5 text-sm md:px-4 md:py-3 [overflow-wrap:anywhere] ${
                                message.author === "user"
                                    ? "rounded-br-md bg-[#f0f0f5] text-black"
                                    : "rounded-bl-md bg-white/10 text-[#f0f0f5]"
                            } ${message.widthClass}`}
                        >
                            <div className={message.author === "bot" ? "pb-7 pr-1 md:pb-8 md:pr-2" : ""}>
                                {message.text}
                            </div>

                            {/* ARCHITECT: кнопки действий — в пузыре справа снизу. На телефоне
                               size-6/size-3 вписываются в pb-7, с md возвращаются прежние
                               size-7/size-3.5 и резерв pb-8. */}
                            {message.author === "bot" && (
                                <div className="absolute bottom-1 right-1 flex items-center gap-1.5 md:bottom-1.5 md:right-1.5">
                                    <motion.button
                                        type="button"
                                        className="flex size-6 items-center justify-center rounded-full bg-black/10 text-[#f0f0f5]/60 transition-colors hover:bg-black/20 hover:text-[#f0f0f5] md:size-7"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label="Прослушать"
                                    >
                                        <Volume2 className="size-3 md:size-3.5" aria-hidden="true" />
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        className="flex size-6 items-center justify-center rounded-full bg-black/10 text-[#f0f0f5]/60 transition-colors hover:bg-black/20 hover:text-[#f0f0f5] md:size-7"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        aria-label="Перевести"
                                    >
                                        <Languages className="size-3 md:size-3.5" aria-hidden="true" />
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.3, delay: 0.15 + CHAT_MESSAGES.length * 0.25 }}
                    className="flex w-fit self-start items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5 md:px-4 md:py-3"
                    aria-hidden="true"
                >
                    {[0, 1, 2].map((dot) => (
                        <motion.span
                            key={dot}
                            className="h-1.5 w-1.5 rounded-full bg-[#f0f0f5]/60"
                            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2, ease: "easeInOut" }}
                        />
                    ))}
                </motion.div>

                {/* ARCHITECT: подпись про голос и перевод — только на десктопе: на телефоне
                    сниппет держим короче, с md он снова выглядит как раньше. */}
                <p className="mt-4 hidden text-xs text-[#f0f0f5]/40 md:block">
                    Воспроизведение голосом и перевод
                </p>
            </div>

            {/* ARCHITECT: на телефоне блобатар компактный (160/192px), с md возвращается прежняя
                десктопная подача: 320px с scale-240 и сдвигом вниз-вправо — блобатар занимает всю
                правую часть карточки, а туловище срезает её граница (clip сверху, в FeatureCard). */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex w-full shrink-0 items-center justify-center md:w-auto md:pl-4"
            >
                <div className="h-40 w-40 sm:h-48 sm:w-48 md:h-80 md:w-80 md:scale-240 md:translate-x-18 md:translate-y-3">
                    <ChatBlobatar />
                </div>
            </motion.div>
        </div>
    );
}
