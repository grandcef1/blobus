// ARCHITECT: структура вынесена в данные, чтобы страница осталась в лимите 150 строк и чтобы порядок
// разделов задавался в одном месте; ключи без префикса неймспейса — проектный паттерн, резолв делает компонент.

export const DOCS_SECTIONS = [
    {
        id: "gettingStarted",
        titleKey: "gettingStarted.title",
        introKey: "gettingStarted.intro",
        items: [
            { titleKey: "gettingStarted.step1Title", bodyKey: "gettingStarted.step1Body" },
            { titleKey: "gettingStarted.step2Title", bodyKey: "gettingStarted.step2Body" },
            { titleKey: "gettingStarted.step3Title", bodyKey: "gettingStarted.step3Body" },
            { titleKey: "gettingStarted.step4Title", bodyKey: "gettingStarted.step4Body" },
            { titleKey: "gettingStarted.step5Title", bodyKey: "gettingStarted.step5Body" },
        ],
    },
    {
        id: "levelTest",
        titleKey: "levelTest.title",
        introKey: "levelTest.intro",
        items: [
            { titleKey: "levelTest.adaptiveTitle", bodyKey: "levelTest.adaptiveBody" },
            { titleKey: "levelTest.scaleTitle", bodyKey: "levelTest.scaleBody" },
            { titleKey: "levelTest.listeningWhyTitle", bodyKey: "levelTest.listeningWhyBody" },
            { titleKey: "levelTest.listeningHowTitle", bodyKey: "levelTest.listeningHowBody" },
        ],
    },
    {
        id: "modes",
        titleKey: "modes.title",
        introKey: "modes.intro",
        items: [
            { titleKey: "modes.interviewTitle", bodyKey: "modes.interviewBody" },
            { titleKey: "modes.speakingTitle", bodyKey: "modes.speakingBody" },
            { titleKey: "modes.grammarTitle", bodyKey: "modes.grammarBody" },
            { titleKey: "modes.generalTitle", bodyKey: "modes.generalBody" },
            { titleKey: "modes.switchTitle", bodyKey: "modes.switchBody" },
        ],
        helpLinkKey: "modes.helpLink",
    },
    {
        id: "tutors",
        titleKey: "tutors.title",
        introKey: "tutors.intro",
        items: [
            { titleKey: "tutors.pageTitle", bodyKey: "tutors.pageBody" },
            { titleKey: "tutors.switchTitle", bodyKey: "tutors.switchBody" },
        ],
    },
    {
        id: "dialogue",
        titleKey: "dialogue.title",
        introKey: "dialogue.intro",
        items: [
            { titleKey: "dialogue.sendTitle", bodyKey: "dialogue.sendBody" },
            { titleKey: "dialogue.correctionTitle", bodyKey: "dialogue.correctionBody" },
            { titleKey: "dialogue.quizTitle", bodyKey: "dialogue.quizBody" },
            { titleKey: "dialogue.wordTitle", bodyKey: "dialogue.wordBody" },
        ],
        helpLinkKey: "dialogue.helpLink",
    },
    {
        id: "dashboard",
        titleKey: "dashboard.title",
        introKey: "dashboard.intro",
        items: [
            { titleKey: "dashboard.overviewTitle", bodyKey: "dashboard.overviewBody" },
            { titleKey: "dashboard.sessionsTitle", bodyKey: "dashboard.sessionsBody" },
            { titleKey: "dashboard.vocabularyTitle", bodyKey: "dashboard.vocabularyBody" },
            { titleKey: "dashboard.profileTitle", bodyKey: "dashboard.profileBody" },
            { titleKey: "dashboard.settingsTitle", bodyKey: "dashboard.settingsBody" },
            { titleKey: "dashboard.subscriptionTitle", bodyKey: "dashboard.subscriptionBody" },
        ],
        helpLinkKey: "dashboard.helpLink",
    },
    {
        id: "limits",
        titleKey: "limits.title",
        introKey: "limits.intro",
        items: [
            { titleKey: "limits.localTitle", bodyKey: "limits.localBody" },
            { titleKey: "limits.chatTitle", bodyKey: "limits.chatBody" },
            { titleKey: "limits.unfinishedTitle", bodyKey: "limits.unfinishedBody" },
            { titleKey: "limits.serverTitle", bodyKey: "limits.serverBody" },
        ],
    },
] as const;