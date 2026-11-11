import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { AppLayout } from '@/pages/AppLayout';
import { ChatPage } from '@/pages/dashboard/ChatPage';
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { BillingPage } from '@/pages/dashboard/BillingPage';
import { AdminPage } from '@/pages/dashboard/AdminPage';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';
import { lazy } from "react";
const VocabularyPage = lazy(() =>
  import("@/pages/dashboard/VocabularyPage").then((m) => ({ default: m.VocabularyPage }))
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:sessionId" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="/app/vocabulary" element={<VocabularyPage />} />
        </Route>
      </Routes>
      {/* ARCHITECT: монтируется один раз в корне — работает и на лендинге, и внутри приложения */}
      <ScrollToTopButton />
    </BrowserRouter>
  );
}

export default App;