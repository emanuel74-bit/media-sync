import { useAlerts, usePods, useStreams } from "@/hooks/use-streams";
import { KPICard } from "@/components/KPICard";
import { SeverityBadge, StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Radio,
    Activity,
    AlertTriangle,
    Users,
    Server,
    Zap,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
    const { data: streams = [] } = useStreams();
    const { data: alerts = [] } = useAlerts();
    const { data: pods = [] } = usePods();

    const stats = useMemo(() => {
        const active = streams.filter((s) => s.status === "active").length;
        const inactive = streams.filter((s) => s.status === "inactive").length;
        const errors = streams.filter((s) => s.status === "error").length;
        const enabled = streams.filter((s) => s.enabled).length;
        const consumers = streams.reduce(
            (sum, s) => sum + s.activeConsumers,
            0,
        );
        const unresolved = alerts.filter((a) => !a.resolved);
        const critical = unresolved.filter(
            (a) => a.severity === "critical",
        ).length;
        const warning = unresolved.filter(
            (a) => a.severity === "warning",
        ).length;
        const activePods = pods.filter((pod) => pod.status === "active").length;
        return {
            total: streams.length,
            active,
            inactive,
            errors,
            enabled,
            consumers,
            unresolved: unresolved.length,
            critical,
            warning,
            activePods,
        };
    }, [streams, alerts, pods]);

    const podDistribution = useMemo(() => {
        const pods: Record<string, { streams: number; consumers: number }> = {};
        streams.forEach((s) => {
            const pod = s.assignedPod || "Unassigned";
            if (!pods[pod]) pods[pod] = { streams: 0, consumers: 0 };
            pods[pod].streams++;
            pods[pod].consumers += s.activeConsumers;
        });
        return Object.entries(pods).map(([name, data]) => ({
            name: name.replace("pod-", ""),
            ...data,
        }));
    }, [streams]);

    const recentActivity = useMemo(() => {
        const items = [
            ...streams.slice(0, 5).map((s) => ({
                type: "sync" as const,
                message: `${s.name} synced`,
                time: s.lastSyncedAt || s.updatedAt,
            })),
            ...alerts
                .filter((a) => !a.resolved)
                .slice(0, 5)
                .map((a) => ({
                    type: "alert" as const,
                    message: `${a.streamName}: ${a.message}`,
                    time: a.createdAt,
                    severity: a.severity,
                })),
        ]
            .sort(
                (a, b) =>
                    new Date(b.time).getTime() - new Date(a.time).getTime(),
            )
            .slice(0, 8);
        return items;
    }, [streams, alerts]);

    const unhealthyStreams = useMemo(
        () =>
            streams
                .filter(
                    (stream) => stream.status === "error" || !!stream.lastError,
                )
                .slice(0, 8),
        [streams],
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    System overview and real-time status
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KPICard
                    title="Total Streams"
                    value={stats.total}
                    icon={Radio}
                />
                <KPICard
                    title="Active"
                    value={stats.active}
                    icon={Activity}
                    variant="healthy"
                />
                <KPICard
                    title="Errors"
                    value={stats.errors}
                    icon={Zap}
                    variant={stats.errors > 0 ? "critical" : "default"}
                />
                <KPICard
                    title="Alerts"
                    value={stats.unresolved}
                    icon={AlertTriangle}
                    variant={
                        stats.critical > 0
                            ? "critical"
                            : stats.warning > 0
                              ? "warning"
                              : "default"
                    }
                />
                <KPICard
                    title="Consumers"
                    value={stats.consumers}
                    icon={Users}
                />
                <KPICard
                    title="Active Pods"
                    value={stats.activePods}
                    icon={Server}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pod Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={podDistribution} layout="vertical">
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                    horizontal={false}
                                />
                                <XAxis
                                    type="number"
                                    tick={{
                                        fontSize: 10,
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{
                                        fontSize: 10,
                                        fill: "hsl(var(--muted-foreground))",
                                    }}
                                    width={80}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--popover))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "6px",
                                        fontSize: 12,
                                    }}
                                />
                                <Bar
                                    dataKey="streams"
                                    fill="hsl(var(--primary))"
                                    radius={[0, 3, 3, 0]}
                                    name="Streams"
                                />
                                <Bar
                                    dataKey="consumers"
                                    fill="hsl(var(--status-info))"
                                    radius={[0, 3, 3, 0]}
                                    opacity={0.5}
                                    name="Consumers"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Open Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-56 overflow-auto">
                            {alerts
                                .filter((alert) => !alert.resolved)
                                .slice(0, 8)
                                .map((alert) => (
                                    <div
                                        key={alert._id}
                                        className="flex items-start gap-3 text-sm"
                                    >
                                        <SeverityBadge
                                            severity={alert.severity}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-foreground truncate">
                                                {alert.streamName}:{" "}
                                                {alert.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(
                                                    new Date(alert.createdAt),
                                                    { addSuffix: true },
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            {alerts.filter((alert) => !alert.resolved)
                                .length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No open alerts.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Unhealthy Streams
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-56 overflow-auto">
                            {unhealthyStreams.map((stream) => (
                                <div
                                    key={stream._id}
                                    className="flex items-center justify-between gap-3 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">
                                            {stream.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {stream.lastError ||
                                                "Status requires attention"}
                                        </p>
                                    </div>
                                    <StatusBadge status={stream.status} />
                                </div>
                            ))}
                            {unhealthyStreams.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No unhealthy streams detected.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-56 overflow-auto">
                            {recentActivity.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <div
                                        className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                                            item.type === "alert"
                                                ? item.severity === "critical"
                                                    ? "bg-status-critical"
                                                    : item.severity ===
                                                        "warning"
                                                      ? "bg-status-warning"
                                                      : "bg-status-info"
                                                : "bg-status-healthy"
                                        }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground truncate">
                                            {item.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(
                                                new Date(item.time),
                                                { addSuffix: true },
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {recentActivity.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No recent activity.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
