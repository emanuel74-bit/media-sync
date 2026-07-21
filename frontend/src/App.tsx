import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { useRealtimeSync } from "@/hooks/use-streams";

const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const ClusterPage = lazy(() => import("@/pages/ClusterPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MetricsPage = lazy(() => import("@/pages/MetricsPage"));
const NodesPage = lazy(() => import("@/pages/NodesPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const StreamDetailPage = lazy(() => import("@/pages/StreamDetailPage"));
const StreamsPage = lazy(() => import("@/pages/StreamsPage"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Loading dashboard…
  </div>
);

const AppRoutes = () => {
  useRealtimeSync();

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/streams" element={<StreamsPage />} />
            <Route path="/streams/:name" element={<StreamDetailPage />} />
            <Route path="/nodes" element={<NodesPage />} />
            <Route path="/pods" element={<Navigate to="/nodes" replace />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/cluster" element={<ClusterPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppRoutes />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
