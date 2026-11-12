// ARCHITECT: маршруты приложения. Раньше /app/chat без id открывал дашборд внутри чата — теперь
// это редирект в раздел «Сессии», а /app ведёт на «Обзор»: у каждого пути ровно один экран.
// Ленивые маршруты обёрнуты в Suspense: без границы React выбрасывает ошибку при suspended
// компоненте. Fallback — null: чанк приходит быстрее 300 мс, и скелет только мигал бы.

import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { AppLayout } from '@/pages/AppLayout';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ChatPage } from '@/pages/dashboard/ChatPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { BillingPage } from '@/pages/dashboard/BillingPage';
import { AdminPage } from '@/pages/dashboard/AdminPage';
import { AppIndexRedirect } from '@/pages/dashboard/AppIndexRedirect';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';
import { Toaster } from '@/components/shared/Toaster';

const VocabularyPage = lazy(() =>
  import('@/pages/dashboard/VocabularyPage').then((module) => ({ default: module.VocabularyPage }))
);

const SessionsPage = lazy(() =>
  import('@/pages/dashboard/SessionsPage').then((module) => ({ default: module.SessionsPage }))
);

const Login = lazy(() =>
  import('@/pages/Login').then((module) => ({ default: module.Login }))
);

const HelpPage = lazy(() =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage }))
);

const HelpCenterPage = lazy(() =>
  import('@/pages/dashboard/HelpCenterPage').then((module) => ({ default: module.HelpCenterPage }))
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* ARCHITECT: вход существующего пользователя — без шагов мастера */}
        <Route
          path="/login"
          element={
            <Suspense fallback={null}>
              <Login />
            </Suspense>
          }
        />
        {/* ARCHITECT: центр помощи доступен и без авторизации, и из сайдбара */}
        <Route
          path="/help"
          element={
            <Suspense fallback={null}>
              <HelpPage />
            </Suspense>
          }
        />
        {/* ARCHITECT: /session/new — тот же мастер в режиме session: репетитор и режим, потом чат */}
        <Route path="/session/new" element={<Onboarding flow="session" />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AppIndexRedirect />} />
          <Route path="overview" element={<DashboardPage />} />
          <Route
            path="sessions"
            element={
              <Suspense fallback={null}>
                <SessionsPage />
              </Suspense>
            }
          />
          <Route path="chat" element={<Navigate to="/app/sessions" replace />} />
          <Route path="chat/:sessionId" element={<ChatPage />} />
          <Route
            path="vocabulary"
            element={
              <Suspense fallback={null}>
                <VocabularyPage />
              </Suspense>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route
            path="help"
            element={
              <Suspense fallback={null}>
                <HelpCenterPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      {/* ARCHITECT: монтируется один раз в корне — работает и на лендинге, и внутри приложения */}
      <ScrollToTopButton />
      {/* ARCHITECT: тосты тоже живут в корне: сообщение должно быть видно на любом экране */}
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
