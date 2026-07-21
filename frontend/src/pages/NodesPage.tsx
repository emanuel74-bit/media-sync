import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Server, Wifi, WifiOff } from "lucide-react";

import { useNodes, useStreams } from "@/hooks/use-streams";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function NodesPage() {
  const { data: nodes = [] } = useNodes();
  const { data: streams = [] } = useStreams();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? nodes
        : nodes.filter((node) => node.status === statusFilter),
    [nodes, statusFilter],
  );
  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    streams.forEach((stream) => {
      if (stream.assignedNode) {
        counts[stream.assignedNode] = (counts[stream.assignedNode] ?? 0) + 1;
      }
    });
    return counts;
  }, [streams]);

  const active = nodes.filter((node) => node.status === "active").length;
  const inactive = nodes.filter((node) => node.status === "inactive").length;
  const draining = nodes.filter((node) => node.status === "draining").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nodes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {active} active · {inactive} inactive · {draining} draining
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Active",
            value: active,
            icon: Wifi,
            background: "bg-status-healthy/10",
            foreground: "text-status-healthy",
          },
          {
            label: "Draining",
            value: draining,
            icon: Clock,
            background: "bg-status-warning/10",
            foreground: "text-status-warning",
          },
          {
            label: "Inactive",
            value: inactive,
            icon: WifiOff,
            background: "bg-status-critical/10",
            foreground: "text-status-critical",
          },
        ].map(({ label, value, icon: Icon, background, foreground }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-lg ${background} flex items-center justify-center`}
              >
                <Icon className={`h-4 w-4 ${foreground}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold font-mono-metric">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px] h-9 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="draining">Draining</SelectItem>
        </SelectContent>
      </Select>

      <div className="border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Node ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Streams</TableHead>
              <TableHead>Last Heartbeat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((node) => (
              <TableRow key={node.nodeId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium font-mono-metric text-sm">
                      {node.nodeId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{node.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      node.status === "active"
                        ? "border-status-healthy/30 text-status-healthy bg-status-healthy/10"
                        : node.status === "draining"
                          ? "border-status-warning/30 text-status-warning bg-status-warning/10"
                          : "border-status-critical/30 text-status-critical bg-status-critical/10"
                    }
                  >
                    {node.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono-metric text-muted-foreground">
                    <p>{node.host}</p>
                    <p>
                      API {node.apiPort} · RTSP {node.rtspPort} · metrics{" "}
                      {node.metricsPort}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono-metric">
                  {streamCounts[node.nodeId] ?? 0}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(node.lastHeartbeatAt), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
