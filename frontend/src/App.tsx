import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import StreamsPage from "@/pages/StreamsPage";
import StreamDetailPage from "@/pages/StreamDetailPage";
import MetricsPage from "@/pages/MetricsPage";
import AlertsPage from "@/pages/AlertsPage";
import ClusterPage from "@/pages/ClusterPage";
import PodsPage from "@/pages/PodsPage";
import NotFound from "@/pages/NotFound";
import { useRealtimeSync } from "@/hooks/use-streams";

const queryClient = new QueryClient();

const AppRoutes = () => {
    useRealtimeSync();

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/streams" element={<StreamsPage />} />
                    <Route
                        path="/streams/:name"
                        element={<StreamDetailPage />}
                    />
                    <Route path="/pods" element={<PodsPage />} />
                    <Route path="/metrics" element={<MetricsPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/cluster" element={<ClusterPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
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
