import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
// ARCHITECT: i18n инициализируется до первого рендера — иначе первый кадр показал бы ключи вместо
// переведённых строк.
import './lib/i18n'
import { queryClient } from './lib/query-client'
// ARCHITECT: глобальные обработчики ошибок ставятся до первого рендера: сбой на самом старте тоже
// должен попасть в отчёт. HMR снимает их, иначе после правки файла обработчики дублировались бы.
import { initGlobalHandlers } from './lib/observability/init-global-handlers'
import App from './App.tsx'

const disposeGlobalHandlers = initGlobalHandlers()
import.meta.hot?.dispose(disposeGlobalHandlers)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ARCHITECT: провайдер стоит выше App: кэш запросов общий для всех экранов, поэтому переход
        между маршрутами не заставляет заново загружать уже полученные данные. */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
