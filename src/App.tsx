import { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ScrollToTopButton } from '@/components/shared/ScrollToTopButton';
import { Toaster } from '@/components/shared/Toaster';
import { SkipToContent } from '@/components/shared/SkipToContent';
import { RouteAnnouncer } from '@/components/shared/RouteAnnouncer';
import { Observability } from '@/components/shared/Observability';
import { CookieConsent } from '@/components/shared/CookieConsent';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStorageSync } from '@/hooks/useAuthStorageSync';
import { publicRoutes } from '@/pages/routes/publicRoutes';
import { appRoutes } from '@/pages/routes/appRoutes';

// ARCHITECT: панель наблюдаемости подключается так же, как DevBillingPanel: в прод-сборке ветка
// import.meta.env.DEV статически ложна, поэтому её чанк в бандл не попадает.
const DevObservabilityPanel = import.meta.env.DEV
  ? lazy(() =>
      import('@/components/shared/DevObservabilityPanel').then((module) => ({
        default: module.DevObservabilityPanel,
      }))
    )
  : null;

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
          {publicRoutes}
          {appRoutes}
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