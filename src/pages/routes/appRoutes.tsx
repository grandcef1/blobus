// ARCHITECT: маршруты приложения. /app/chat без id ведёт в раздел «Сессии», а /app открывает
// последнюю сессию или список сессий: у каждого пути ровно один экран, и вход в приложение не
// оставляет пользователя на пустом чате. Ленивые маршруты обёрнуты в Suspense: без границы React
// выбрасывает ошибку при suspended компоненте.
// ARCHITECT: fallback у каждого ленивого маршрута — скелетон его раскладки: белый лист на время
// загрузки чанка читается как сбой, а скелетон показывает, что экран уже открывается.

import { Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppIndexRedirect } from "@/pages/dashboard/AppIndexRedirect";
import { HelpSkeleton } from "@/components/dashboard/skeletons/HelpSkeleton";
import { BillingSkeleton } from "@/components/dashboard/skeletons/BillingSkeleton";
import { OverviewSkeleton } from "@/components/dashboard/skeletons/OverviewSkeleton";
import { SessionsSkeleton } from "@/components/dashboard/skeletons/SessionsSkeleton";
import { TutorsSkeleton } from "@/components/dashboard/skeletons/TutorsSkeleton";
import { VocabularySkeleton } from "@/components/dashboard/skeletons/VocabularySkeleton";
import { ChatSkeleton } from "@/components/dashboard/skeletons/ChatSkeleton";
import { ProfileSkeleton } from "@/components/dashboard/skeletons/ProfileSkeleton";
import { SettingsSkeleton } from "@/components/dashboard/skeletons/SettingsSkeleton";
import { AppShellSkeleton } from "@/components/dashboard/skeletons/AppShellSkeleton";
import {
    AppLayout,
    BillingPage,
    ChatPage,
    DashboardPage,
    HelpCenterPage,
    ProfilePage,
    SessionsPage,
    SettingsPage,
    TutorsPage,
    VocabularyPage,
} from "./appLazy";

// ARCHITECT: оболочка панели ленива, поэтому посетитель лендинга её код не скачивает; гейт
// авторизации стоит до Suspense, и неавторизованный посетитель чанк оболочки не запрашивает.
export const appRoutes = (
    <Route
        path="/app"
        element={
            <ProtectedRoute>
                <Suspense fallback={<AppShellSkeleton />}>
                    <AppLayout />
                </Suspense>
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
