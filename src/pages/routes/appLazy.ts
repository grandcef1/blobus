// ARCHITECT: lazy-объявления живут в .ts, потому что правило react-refresh/only-export-components
// сканирует только .tsx и считает lazy() локальными компонентами; в .ts оно не срабатывает.

import { lazy } from 'react';

export const VocabularyPage = lazy(() =>
  import('@/pages/dashboard/VocabularyPage').then((module) => ({ default: module.VocabularyPage }))
);

export const SessionsPage = lazy(() =>
  import('@/pages/dashboard/SessionsPage').then((module) => ({ default: module.SessionsPage }))
);

export const TutorsPage = lazy(() =>
  import('@/pages/dashboard/TutorsPage').then((module) => ({ default: module.TutorsPage }))
);

// ARCHITECT: «Подписка» ленива, как остальные разделы панели: страница тянет query-слой и Radix
// AlertDialog, а на первом экране приложения они не нужны.
export const BillingPage = lazy(() =>
  import('@/pages/dashboard/BillingPage').then((module) => ({ default: module.BillingPage }))
);

export const HelpCenterPage = lazy(() =>
  import('@/pages/dashboard/HelpCenterPage').then((module) => ({ default: module.HelpCenterPage }))
);

// ARCHITECT: админ-панель грузится лениво: обычный пользователь её чанк не скачивает вовсе.
export const AdminPage = lazy(() =>
  import('@/pages/dashboard/AdminPage').then((module) => ({ default: module.AdminPage }))
);

export const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);

export const ChatPage = lazy(() =>
  import('@/pages/dashboard/ChatPage').then((module) => ({ default: module.ChatPage }))
);

export const ProfilePage = lazy(() =>
  import('@/pages/dashboard/ProfilePage').then((module) => ({ default: module.ProfilePage }))
);

export const SettingsPage = lazy(() =>
  import('@/pages/dashboard/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
