import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { wsManager } from "@/services/websocket";

export function AppLayout() {
    const [connected, setConnected] = useState(wsManager.connected);

    useEffect(() => {
        const unsubscribe = wsManager.on("connection", setConnected);
        return unsubscribe;
    }, []);

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <header className="h-12 flex items-center border-b border-border/50 px-4 shrink-0">
                        <SidebarTrigger className="mr-3" />
                        <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <div
                                    className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-status-healthy" : "bg-status-warning"}`}
                                />
                                <span className="font-mono-metric">
                                    {connected
                                        ? "Realtime Connected"
                                        : "Realtime Reconnecting"}
                                </span>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
