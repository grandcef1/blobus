import { useRouteAnnouncer } from "@/hooks/useRouteAnnouncer";

// ARCHITECT: нулевой рендер нужен, чтобы хук с useLocation жил внутри BrowserRouter.
export function RouteAnnouncer() {
  useRouteAnnouncer();
  return null;
}
