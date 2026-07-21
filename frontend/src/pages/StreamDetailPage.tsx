import { useParams, useNavigate } from "react-router-dom";
import {
  useStream,
  useStreamMetrics,
  useAlerts,
  useToggleStream,
  useAssignStream,
  useUnassignStream,
  useActiveClusterNodes,
} from "@/hooks/use-streams";
import { StatusBadge, SeverityBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertTriangle,
  Pencil,
  Trash2,
  Scan,
  Link2,
  Unlink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { useMemo, useState } from "react";
import { EditStreamDialog } from "@/components/EditStreamDialog";
import { DeleteStreamDialog } from "@/components/DeleteStreamDialog";
import { StreamInspectionPanel } from "@/components/StreamInspectionPanel";
import { toast } from "sonner";

const chartStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: 12,
};

export default function StreamDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { data: stream, isLoading, isError, error } = useStream(name || "");
  const { data: metrics = [] } = useStreamMetrics(name || "", 60);
  const { data: allAlerts = [] } = useAlerts();
  const { data: activeNodes = [] } = useActiveClusterNodes();
  const toggleStream = useToggleStream();
  const assignStream = useAssignStream();
  const unassignStream = useUnassignStream();
  const [context, setContext] = useState<"all" | "ingest" | "cluster">("all");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const streamAlerts = useMemo(
    () => allAlerts.filter((a) => a.subject === name),
    [allAlerts, name],
  );

  const chartData = useMemo(() => {
    const filtered =
      context === "all"
        ? metrics
        : metrics.filter((m) => m.context === context);
    return filtered
      .map((m) => ({
        time: format(new Date(m.createdAt ?? 0), "HH:mm"),
        bytesReceived: m.bytesReceived,
        bytesSent: m.bytesSent,
        readers: m.readers,
        framesInError: m.framesInError,
        ready: m.ready ? 1 : 0,
      }))
      .reverse();
  }, [metrics, context]);

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (isError)
    return <div className="text-status-critical">{error.message}</div>;
  if (!stream)
    return <div className="text-muted-foreground">Stream not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/streams")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold font-mono-metric">
            {stream.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stream.source}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <Switch
              checked={stream.isEnabled}
              onCheckedChange={(checked) =>
                toggleStream.mutate({
                  name: stream.name,
                  isEnabled: checked,
                })
              }
            />
          </div>
          <StatusBadge status={stream.status} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inspection">
            <Scan className="h-3.5 w-3.5 mr-1" />
            Inspection
          </TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({streamAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Consumers</p>
                <p className="text-xl font-semibold font-mono-metric mt-1">
                  {stream.activeConsumers}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Assigned Node</p>
                <div className="flex items-center gap-2 mt-1">
                  <Select
                    value={stream.assignedNode || "__none__"}
                    onValueChange={(val) => {
                      if (val === "__none__") {
                        unassignStream.mutate(stream.name, {
                          onSuccess: () => toast.success("Stream unassigned"),
                        });
                      } else {
                        assignStream.mutate(
                          {
                            name: stream.name,
                            nodeId: val,
                          },
                          {
                            onSuccess: () =>
                              toast.success(`Assigned to ${val}`),
                          },
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm font-mono-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {activeNodes.map((node) => (
                        <SelectItem key={node.nodeId} value={node.nodeId}>
                          {node.nodeId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Last Seen</p>
                <p className="text-sm mt-1">
                  {stream.lastSeenAt
                    ? formatDistanceToNow(new Date(stream.lastSeenAt), {
                        addSuffix: true,
                      })
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Last Synced</p>
                <p className="text-sm mt-1">
                  {stream.lastSyncedAt
                    ? formatDistanceToNow(new Date(stream.lastSyncedAt), {
                        addSuffix: true,
                      })
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
          {stream.lastError && (
            <Card className="border-status-critical/30 bg-status-critical/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-status-critical mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-status-critical">
                    Last Error
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stream.lastError}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stream.metadata && Object.keys(stream.metadata).length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono-metric text-muted-foreground bg-muted/50 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(stream.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inspection" className="mt-4">
          <StreamInspectionPanel streamName={name || ""} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Context:</span>
            {(["all", "ingest", "cluster"] as const).map((c) => (
              <Button
                key={c}
                variant={context === c ? "default" : "outline"}
                size="sm"
                onClick={() => setContext(c)}
                className="capitalize"
              >
                {c}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: "bytesReceived",
                label: "Bytes Received",
                color: "--primary",
              },
              {
                key: "bytesSent",
                label: "Bytes Sent",
                color: "--status-healthy",
              },
              {
                key: "readers",
                label: "Readers",
                color: "--status-warning",
              },
              {
                key: "framesInError",
                label: "Frames in Error",
                color: "--status-info",
              },
              {
                key: "ready",
                label: "Ready (1/0)",
                color: "--status-critical",
              },
            ].map(({ key, label, color }) => (
              <Card key={key} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="time"
                        tick={{
                          fontSize: 9,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 9,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <Tooltip contentStyle={chartStyle} />
                      <Area
                        type="monotone"
                        dataKey={key}
                        stroke={`hsl(var(${color}))`}
                        fill={`hsl(var(${color}) / 0.15)`}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-2">
            {streamAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No alerts for this stream
              </p>
            )}
            {streamAlerts.map((alert) => (
              <Card key={alert.id} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <SeverityBadge severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.type} ·{" "}
                      {formatDistanceToNow(new Date(alert.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={alert.isResolved ? "secondary" : "outline"}
                    className={
                      alert.isResolved
                        ? ""
                        : "border-status-warning/30 text-status-warning"
                    }
                  >
                    {alert.isResolved ? "Resolved" : "Open"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <EditStreamDialog
        stream={stream}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteStreamDialog
        streamName={stream.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate("/streams")}
      />
    </div>
  );
}
