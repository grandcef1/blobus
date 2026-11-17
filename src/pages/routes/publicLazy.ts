// ARCHITECT: lazy-объявления живут в .ts, потому что правило react-refresh/only-export-components
// сканирует только .tsx и считает lazy() локальными компонентами; в .ts оно не срабатывает.

import { lazy } from 'react';

export const Login = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.Login }))
);

export const HelpPage = lazy(() =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }))
);

// ARCHITECT: правовые документы ленивы, как и остальные страницы вне критического пути: на лендинг
// они не входят, а чанк нужен только при переходе по ссылке из футера.
export const PrivacyPage = lazy(() =>
  import('@/pages/legal/PrivacyPage').then((module) => ({ default: module.PrivacyPage }))
);

export const TermsPage = lazy(() =>
  import('@/pages/legal/TermsPage').then((module) => ({ default: module.TermsPage }))
);

export const CookiesPage = lazy(() =>
  import('@/pages/legal/CookiesPage').then((module) => ({ default: module.CookiesPage }))
);

// ARCHITECT: контакты — публичная страница вне критического пути: чанк нужен только при переходе
// по ссылке из футера, поэтому грузится лениво, как правовые документы.
export const ContactsPage = lazy(() =>
  import('@/pages/ContactsPage').then((module) => ({ default: module.ContactsPage }))
);

// ARCHITECT: /about и /changelog — публичные контентные страницы вне критического пути: чанк нужен
// только при переходе по прямой ссылке, в основной бандл он не попадает.
export const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((module) => ({ default: module.AboutPage }))
);

export const ChangelogPage = lazy(() =>
  import('@/pages/ChangelogPage').then((module) => ({ default: module.ChangelogPage }))
);

// ARCHITECT: восстановление доступа — тоже ленивые публичные маршруты: чанк нужен только тем, кто
// потерял пароль или подтверждает почту, и в основной бандл он не попадает.
export const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
);

export const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
);

export const VerifyEmailPage = lazy(() =>
  import('@/pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage }))
);

export const Onboarding = lazy(() =>
  import('@/pages/Onboarding').then((module) => ({ default: module.Onboarding }))
);

export const ListeningFlow = lazy(() =>
  import('@/pages/ListeningFlow').then((module) => ({ default: module.ListeningFlow }))
);
