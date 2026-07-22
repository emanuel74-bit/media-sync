import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  HardDrive,
  Radio,
  Server,
  Users,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useAlerts, useNodes, useStreams } from "@/hooks/use-streams";
import { KPICard } from "@/components/KPICard";
import { SeverityBadge, StatusBadge } from "@/components/StatusBadge";
import { LifecyclePipeline } from "@/components/LifecyclePipeline";
import { PlaneHealthCard } from "@/components/PlaneHealthCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: streams = [] } = useStreams();
  const { data: alerts = [] } = useAlerts();
  const { data: nodes = [] } = useNodes();

  const stats = useMemo(() => {
    const synced = streams.filter((s) => s.status === "synced").length;
    const errors = streams.filter((s) => s.status === "sync_error").length;
    const consumers = streams.reduce((sum, s) => sum + s.activeConsumers, 0);
    const unresolved = alerts.filter((a) => !a.isResolved);
    const critical = unresolved.filter((a) => a.severity === "critical").length;
    const warning = unresolved.filter((a) => a.severity === "warning").length;

    const ingest = nodes.filter((n) => n.type === "ingest");
    const cluster = nodes.filter((n) => n.type === "cluster");
    return {
      total: streams.length,
      synced,
      errors,
      consumers,
      unresolved: unresolved.length,
      critical,
      warning,
      ingestActive: ingest.filter((n) => n.status === "active").length,
      ingestTotal: ingest.length,
      clusterActive: cluster.filter((n) => n.status === "active").length,
      clusterTotal: cluster.length,
      reservations: streams.filter((s) => s.status === "reserved").length,
      publishing: streams.filter(
        (s) => s.status === "discovered" || s.status === "synced",
      ).length,
      assigned: streams.filter((s) => s.assignedNode).length,
    };
  }, [streams, alerts, nodes]);

  const recentActivity = useMemo(() => {
    return [
      ...streams.slice(0, 5).map((s) => ({
        type: "sync" as const,
        message: `${s.name} synced`,
        time:
          s.lastSyncedAt ??
          s.updatedAt ??
          s.createdAt ??
          new Date(0).toISOString(),
      })),
      ...alerts
        .filter((a) => !a.isResolved)
        .slice(0, 5)
        .map((a) => ({
          type: "alert" as const,
          message: `${a.subject}: ${a.message}`,
          time: a.createdAt ?? new Date(0).toISOString(),
          severity: a.severity,
        })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [streams, alerts]);

  const unhealthyStreams = useMemo(
    () =>
      streams
        .filter(
          (stream) =>
            stream.status === "sync_error" ||
            stream.status === "stale" ||
            !!stream.lastError,
        )
        .slice(0, 8),
    [streams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System overview and real-time status
        </p>
      </div>

      <LifecyclePipeline streams={streams} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <KPICard title="Total Streams" value={stats.total} icon={Radio} />
        <KPICard
          title="Synced"
          value={stats.synced}
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
          title="Ingest Nodes"
          value={`${stats.ingestActive}/${stats.ingestTotal}`}
          icon={HardDrive}
        />
        <KPICard
          title="Cluster Nodes"
          value={`${stats.clusterActive}/${stats.clusterTotal}`}
          icon={Server}
        />
      </div>

      {/* Two-plane health — equal weight for ingest and cluster */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlaneHealthCard
          title="Ingest Plane"
          icon={HardDrive}
          accent="text-status-info"
          stats={[
            {
              label: "Nodes active",
              value: `${stats.ingestActive}/${stats.ingestTotal}`,
              tone:
                stats.ingestActive < stats.ingestTotal
                  ? "text-status-warning"
                  : "text-status-healthy",
            },
            {
              label: "Reservations",
              value: stats.reservations,
              tone: "text-status-info",
            },
            { label: "Publishing", value: stats.publishing },
          ]}
        />
        <PlaneHealthCard
          title="Cluster Plane"
          icon={Server}
          accent="text-status-healthy"
          stats={[
            {
              label: "Nodes active",
              value: `${stats.clusterActive}/${stats.clusterTotal}`,
              tone:
                stats.clusterActive < stats.clusterTotal
                  ? "text-status-warning"
                  : "text-status-healthy",
            },
            {
              label: "Synced",
              value: stats.synced,
              tone: "text-status-healthy",
            },
            { label: "Consumers", value: stats.consumers },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 space-y-3 overflow-auto">
              {alerts
                .filter((alert) => !alert.isResolved)
                .slice(0, 8)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <SeverityBadge severity={alert.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">
                        {alert.subject}: {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              {alerts.filter((alert) => !alert.isResolved).length === 0 && (
                <p className="text-sm text-muted-foreground">No open alerts.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unhealthy Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 space-y-3 overflow-auto">
              {unhealthyStreams.map((stream) => (
                <div
                  key={stream.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{stream.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {stream.lastError || "Status requires attention"}
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
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid max-h-56 grid-cols-1 gap-x-6 gap-y-3 overflow-auto md:grid-cols-2">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    item.type === "alert"
                      ? item.severity === "critical"
                        ? "bg-status-critical"
                        : item.severity === "warning"
                          ? "bg-status-warning"
                          : "bg-status-info"
                      : "bg-status-healthy"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.time), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
