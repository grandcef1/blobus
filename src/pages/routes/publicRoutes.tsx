// ARCHITECT: маршруты отдаются константой-фрагментом, а не компонентом: <Routes> разворачивает
// только Fragment и Route, поэтому обёртка вида <PublicRoutes /> сломала бы роутинг.

import { Suspense } from 'react';
import { Route } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { LegalSkeleton } from '@/components/shared/skeletons/LegalSkeleton';
import { LoginSkeleton } from '@/components/shared/skeletons/LoginSkeleton';
import { HelpSkeleton } from '@/components/dashboard/skeletons/HelpSkeleton';
import {
  ContactsPage,
  CookiesPage,
  ForgotPasswordPage,
  HelpPage,
  ListeningFlow,
  Login,
  Onboarding,
  PrivacyPage,
  ResetPasswordPage,
  TermsPage,
  VerifyEmailPage,
} from './publicLazy';

export const publicRoutes = (
  <>
    <Route path="/" element={<Landing />} />
    {/* ARCHITECT: у мастера и аудирования fallback — скелетон оболочки мастера: обе страницы
        рендерятся в OnboardingShell, поэтому до загрузки чанка виден тот же каркас, что у /login. */}
    <Route
      path="/onboarding"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <Onboarding />
        </Suspense>
      }
    />
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
    <Route
      path="/session/new"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <Onboarding flow="session" />
        </Suspense>
      }
    />
    {/* ARCHITECT: /listening — отложенная проверка аудирования в интерфейсе мастера, вне
        приложения: полосы прогресса здесь нет, а возврат ведёт в «Обзор» */}
    <Route
      path="/listening"
      element={
        <Suspense fallback={<LoginSkeleton />}>
          <ListeningFlow />
        </Suspense>
      }
    />
  </>
);
