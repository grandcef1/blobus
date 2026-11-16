// ARCHITECT: маршруты приложения. /app/chat без id ведёт в раздел «Сессии», а /app открывает
// последнюю сессию или список сессий: у каждого пути ровно один экран, и вход в приложение не
// оставляет пользователя на пустом чате. Ленивые маршруты обёрнуты в Suspense: без границы React
// выбрасывает ошибку при suspended компоненте.
// ARCHITECT: fallback у каждого ленивого маршрута — скелетон его раскладки: белый лист на время
// загрузки чанка читается как сбой, а скелетон показывает, что экран уже открывается.

import { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { ListeningFlow } from '@/pages/ListeningFlow';
import { AppLayout } from '@/pages/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ChatPage } from '@/pages/dashboard/ChatPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AppIndexRedirect } from '@/pages/dashboard/AppIndexRedirect';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';
import { Toaster } from '@/components/shared/Toaster';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';
import { Observability } from '@/components/shared/Observability';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStorageSync } from '@/hooks/useAuthStorageSync';
import { LegalSkeleton } from '@/components/shared/skeletons/LegalSkeleton';
import { LoginSkeleton } from '@/components/shared/skeletons/LoginSkeleton';
import { HelpSkeleton } from '@/components/dashboard/skeletons/HelpSkeleton';
import { BillingSkeleton } from '@/components/dashboard/skeletons/BillingSkeleton';
import { OverviewSkeleton } from '@/components/dashboard/skeletons/OverviewSkeleton';
import { SessionsSkeleton } from '@/components/dashboard/skeletons/SessionsSkeleton';
import { TutorsSkeleton } from '@/components/dashboard/skeletons/TutorsSkeleton';
import { VocabularySkeleton } from '@/components/dashboard/skeletons/VocabularySkeleton';

const VocabularyPage = lazy(() =>
  import('@/pages/dashboard/VocabularyPage').then((module) => ({ default: module.VocabularyPage }))
);

const SessionsPage = lazy(() =>
  import('@/pages/dashboard/SessionsPage').then((module) => ({ default: module.SessionsPage }))
);

const TutorsPage = lazy(() =>
  import('@/pages/dashboard/TutorsPage').then((module) => ({ default: module.TutorsPage }))
);

// ARCHITECT: «Подписка» ленива, как остальные разделы панели: страница тянет query-слой и Radix
// AlertDialog, а на первом экране приложения они не нужны.
const BillingPage = lazy(() =>
  import('@/pages/dashboard/BillingPage').then((module) => ({ default: module.BillingPage }))
);

const Login = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.Login }))
);

const HelpPage = lazy(() =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }))
);

// ARCHITECT: панель наблюдаемости подключается так же, как DevBillingPanel: в прод-сборке ветка
// import.meta.env.DEV статически ложна, поэтому её чанк в бандл не попадает.
const DevObservabilityPanel = import.meta.env.DEV
  ? lazy(() =>
      import('@/components/shared/DevObservabilityPanel').then((module) => ({
        default: module.DevObservabilityPanel,
      }))
    )
  : null;

const HelpCenterPage = lazy(() =>
  import('@/pages/dashboard/HelpCenterPage').then((module) => ({ default: module.HelpCenterPage }))
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

// ARCHITECT: админ-панель грузится лениво: обычный пользователь её чанк не скачивает вовсе.
const AdminPage = lazy(() =>
  import('@/pages/dashboard/AdminPage').then((module) => ({ default: module.AdminPage }))
);

function App() {
  // ARCHITECT: сеть и межвкладочная синхронизация не зависят от роутера, поэтому живут в корне
  // приложения: баннер офлайна виден на любом экране, а чужой выход или отзыв согласия
  // применяется к локальным сторам независимо от текущего маршрута.
  const isOnline = useNetworkStatus();
  useAuthStorageSync();

  return (
    // ARCHITECT: reducedMotion="user" гасит только transform/layout-анимации, когда система
    // просит меньше движения; opacity остаётся, поэтому появление элементов не исчезает.
    // Существующие гейты useReducedMotion в компонентах не тронуты и продолжают работать.
    <MotionConfig reducedMotion="user">
      {/* ARCHITECT: граница ошибок охватывает весь роутинг: падение любой страницы или самого
          BrowserRouter уходит на экран ErrorBoundary, а не на белый лист. */}
      <ErrorBoundary>
        <BrowserRouter>
        <SkipToContent />
        <Routes>
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
          {/* ARCHITECT: защита ставится над самим AppLayout, а не над каждой вложенной
              страницей: один узел покрывает все дочерние маршруты /app/* и не позволяет
              забыть обёртку при добавлении нового экрана. */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AppIndexRedirect />} />
            <Route path="overview" element={<DashboardPage />} />
            <Route
              path="sessions"
              element={
                <Suspense fallback={<SessionsSkeleton />}>
                  <SessionsPage />
                </Suspense>
              }
            />
            <Route path="chat" element={<Navigate to="/app/sessions" replace />} />
            <Route path="chat/:sessionId" element={<ChatPage />} />
            <Route
              path="vocabulary"
              element={
                <Suspense fallback={<VocabularySkeleton />}>
                  <VocabularyPage />
                </Suspense>
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="tutors"
              element={
                <Suspense fallback={<TutorsSkeleton />}>
                  <TutorsPage />
                </Suspense>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="billing"
              element={
                <Suspense fallback={<BillingSkeleton />}>
                  <BillingPage />
                </Suspense>
              }
            />
            {/* ARCHITECT: гейт стоит вне Suspense: роль проверяется до загрузки чанка панели,
                поэтому обычный пользователь её код не скачивает и сразу видит тост с редиректом.
                Скелетон взят у «Обзора»: та же шапка, сетка метрик и две карточки-списка, отдельный
                файл ради этой страницы не нужен. */}
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Suspense fallback={<OverviewSkeleton />}>
                    <AdminPage />
                  </Suspense>
                </AdminRoute>
              }
            />
            <Route
              path="help"
              element={
                <Suspense fallback={<HelpSkeleton />}>
                  <HelpCenterPage />
                </Suspense>
              }
            />
          </Route>
          {/* ARCHITECT: catch-all ставится последним: любой неизвестный путь внутри SPA
              попадает на брендированную 404 вместо пустого экрана. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <RouteAnnouncer />
        {/* ARCHITECT: монтируется один раз в корне — работает и на лендинге, и внутри приложения */}
        <ScrollToTopButton />
        {/* ARCHITECT: тосты тоже живут в корне: сообщение должно быть видно на любом экране */}
        <Toaster />
        {/* ARCHITECT: баннер офлайна монтируется один раз в корне и только когда сети нет:
            постоянный узел в DOM дублировал бы объявление о состоянии связи. */}
        {!isOnline && <OfflineBanner />}
        {/* ARCHITECT: баннер согласия монтируется один раз в корне и виден на любом экране: решение
            о cookie нельзя терять при переходах между лендингом, документами и приложением. */}
        <CookieConsent />
        {/* ARCHITECT: сторонние сервисы наблюдаемости подключаются только здесь и только при
            согласии: до него компонент рендерит null и ничего не загружает. */}
        <Observability />
        {DevObservabilityPanel !== null && (
          <Suspense fallback={null}>
            <DevObservabilityPanel />
          </Suspense>
        )}
        </BrowserRouter>
      </ErrorBoundary>
    </MotionConfig>
  );
}

export default App;