// ARCHITECT: маршруты приложения. /app/chat без id ведёт в раздел «Сессии», а /app открывает
// последнюю сессию или список сессий: у каждого пути ровно один экран, и вход в приложение не
// оставляет пользователя на пустом чате. Ленивые маршруты обёрнуты в Suspense: без границы React
// выбрасывает ошибку при suspended компоненте.
// ARCHITECT: fallback у каждого ленивого маршрута — скелетон его раскладки: белый лист на время
// загрузки чанка читается как сбой, а скелетон показывает, что экран уже открывается.

import { Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { AppLayout } from '@/pages/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AppIndexRedirect } from '@/pages/dashboard/AppIndexRedirect';
import { HelpSkeleton } from '@/components/dashboard/skeletons/HelpSkeleton';
import { BillingSkeleton } from '@/components/dashboard/skeletons/BillingSkeleton';
import { OverviewSkeleton } from '@/components/dashboard/skeletons/OverviewSkeleton';
import { SessionsSkeleton } from '@/components/dashboard/skeletons/SessionsSkeleton';
import { TutorsSkeleton } from '@/components/dashboard/skeletons/TutorsSkeleton';
import { VocabularySkeleton } from '@/components/dashboard/skeletons/VocabularySkeleton';
import { ChatSkeleton } from '@/components/dashboard/skeletons/ChatSkeleton';
import { ProfileSkeleton } from '@/components/dashboard/skeletons/ProfileSkeleton';
import { SettingsSkeleton } from '@/components/dashboard/skeletons/SettingsSkeleton';
import {
  AdminPage,
  BillingPage,
  ChatPage,
  DashboardPage,
  HelpCenterPage,
  ProfilePage,
  SessionsPage,
  SettingsPage,
  TutorsPage,
  VocabularyPage,
} from './appLazy';

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
    <Route
      path="overview"
      element={
        <Suspense fallback={<OverviewSkeleton />}>
          <DashboardPage />
        </Suspense>
      }
    />
    <Route
      path="sessions"
      element={
        <Suspense fallback={<SessionsSkeleton />}>
          <SessionsPage />
        </Suspense>
      }
    />
    <Route path="chat" element={<Navigate to="/app/sessions" replace />} />
    <Route
      path="chat/:sessionId"
      element={
        <Suspense fallback={<ChatSkeleton />}>
          <ChatPage />
        </Suspense>
      }
    />
    <Route
      path="vocabulary"
      element={
        <Suspense fallback={<VocabularySkeleton />}>
          <VocabularyPage />
        </Suspense>
      }
    />
    <Route
      path="profile"
      element={
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfilePage />
        </Suspense>
      }
    />
    <Route
      path="tutors"
      element={
        <Suspense fallback={<TutorsSkeleton />}>
          <TutorsPage />
        </Suspense>
      }
    />
    <Route
      path="settings"
      element={
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsPage />
        </Suspense>
      }
    />
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
