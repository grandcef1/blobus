/* eslint-disable react-refresh/only-export-components -- дерево маршрутов отдаётся константой, а не компонентом, поэтому правило про fast-refresh тут неприменимо */
// ARCHITECT: маршруты отдаются константой-фрагментом, а не компонентом: <Routes> разворачивает
// только Fragment и Route, поэтому обёртка вида <PublicRoutes /> сломала бы роутинг.

import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { ListeningFlow } from '@/pages/ListeningFlow';
import { LegalSkeleton } from '@/components/shared/skeletons/LegalSkeleton';
import { LoginSkeleton } from '@/components/shared/skeletons/LoginSkeleton';
import { HelpSkeleton } from '@/components/dashboard/skeletons/HelpSkeleton';

const Login = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.Login }))
);

const HelpPage = lazy(() =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }))
);

// ARCHITECT: правовые документы ленивы, как и остальные страницы вне критического пути: на лендинг
// они не входят, а чанк нужен только при переходе по ссылке из футера.
const PrivacyPage = lazy(() =>
  import('@/pages/legal/PrivacyPage').then((module) => ({ default: module.PrivacyPage }))
);

const TermsPage = lazy(() =>
  import('@/pages/legal/TermsPage').then((module) => ({ default: module.TermsPage }))
);

const CookiesPage = lazy(() =>
  import('@/pages/legal/CookiesPage').then((module) => ({ default: module.CookiesPage }))
);

// ARCHITECT: контакты — публичная страница вне критического пути: чанк нужен только при переходе
// по ссылке из футера, поэтому грузится лениво, как правовые документы.
const ContactsPage = lazy(() =>
  import('@/pages/ContactsPage').then((module) => ({ default: module.ContactsPage }))
);

// ARCHITECT: восстановление доступа — тоже ленивые публичные маршруты: чанк нужен только тем, кто
// потерял пароль или подтверждает почту, и в основной бандл он не попадает.
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
);

const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
);

const VerifyEmailPage = lazy(() =>
  import('@/pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage }))
);

export const publicRoutes = (
  <>
    <Route path="/" element={<Landing />} />
    <Route path="/onboarding" element={<Onboarding />} />
    {/* ARCHITECT: вход существующего пользователя — без шагов мастера */}
    <Route
      path="/login"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <Login />
        </Suspense>
      }
    />
    {/* ARCHITECT: центр помощи доступен и без авторизации, и из сайдбара */}
    <Route
      path="/help"
      element={
        <Suspense fallback={<HelpSkeleton />}>
          <HelpPage />
        </Suspense>
      }
    />
    {/* ARCHITECT: /session/new — тот же мастер в режиме session: репетитор и режим, потом чат */}
    {/* ARCHITECT: правовые документы публичны: на них ссылается футер лендинга, авторизация
        им не нужна, а до запуска бэкенда это единственный юридический текст проекта. */}
    <Route
      path="/privacy"
      element={
        <Suspense fallback={<LegalSkeleton />}>
          <PrivacyPage />
        </Suspense>
      }
    />
    <Route
      path="/terms"
      element={
        <Suspense fallback={<LegalSkeleton />}>
          <TermsPage />
        </Suspense>
      }
    />
    <Route
      path="/cookies"
      element={
        <Suspense fallback={<LegalSkeleton />}>
          <CookiesPage />
        </Suspense>
      }
    />
    {/* ARCHITECT: контакты делят оболочку с правовыми документами, поэтому скелетон тот же. */}
    <Route
      path="/contacts"
      element={
        <Suspense fallback={<LegalSkeleton />}>
          <ContactsPage />
        </Suspense>
      }
    />
    {/* ARCHITECT: восстановление пароля и подтверждение почты публичны; скелетон берём у /login —
        экраны той же формы: оболочка мастера, заголовок шага, стеклянная карточка. */}
    <Route
      path="/forgot-password"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <ForgotPasswordPage />
        </Suspense>
      }
    />
    <Route
      path="/reset-password"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <ResetPasswordPage />
        </Suspense>
      }
    />
    <Route
      path="/verify-email"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <VerifyEmailPage />
        </Suspense>
      }
    />
    <Route path="/session/new" element={<Onboarding flow="session" />} />
    {/* ARCHITECT: /listening — отложенная проверка аудирования в интерфейсе мастера, вне
        приложения: полосы прогресса здесь нет, а возврат ведёт в «Обзор» */}
    <Route path="/listening" element={<ListeningFlow />} />
  </>
);
