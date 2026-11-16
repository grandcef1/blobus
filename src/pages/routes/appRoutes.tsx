/* eslint-disable react-refresh/only-export-components -- дерево маршрутов отдаётся константой, а не компонентом, поэтому правило про fast-refresh тут неприменимо */
// ARCHITECT: маршруты приложения. /app/chat без id ведёт в раздел «Сессии», а /app открывает
// последнюю сессию или список сессий: у каждого пути ровно один экран, и вход в приложение не
// оставляет пользователя на пустом чате. Ленивые маршруты обёрнуты в Suspense: без границы React
// выбрасывает ошибку при suspended компоненте.
// ARCHITECT: fallback у каждого ленивого маршрута — скелетон его раскладки: белый лист на время
// загрузки чанка читается как сбой, а скелетон показывает, что экран уже открывается.

import { lazy, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { AppLayout } from '@/pages/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AppIndexRedirect } from '@/pages/dashboard/AppIndexRedirect';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ChatPage } from '@/pages/dashboard/ChatPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
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

const HelpCenterPage = lazy(() =>
  import('@/pages/dashboard/HelpCenterPage').then((module) => ({ default: module.HelpCenterPage }))
);

// ARCHITECT: админ-панель грузится лениво: обычный пользователь её чанк не скачивает вовсе.
const AdminPage = lazy(() =>
  import('@/pages/dashboard/AdminPage').then((module) => ({ default: module.AdminPage }))
);

export const appRoutes = (
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
);
