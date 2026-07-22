import { formatDistanceToNow } from "date-fns";
import { Server } from "lucide-react";

import type { Node } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Flat registry of every node (both planes) with endpoint + heartbeat detail.
export function NodesTable({
  nodes,
  streamCounts,
}: {
  nodes: Node[];
  streamCounts: Record<string, number>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
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
          {nodes.map((node) => (
            <TableRow key={node.nodeId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono-metric text-sm font-medium">
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
                      ? "border-status-healthy/30 bg-status-healthy/10 text-status-healthy"
                      : node.status === "draining"
                        ? "border-status-warning/30 bg-status-warning/10 text-status-warning"
                        : "border-status-critical/30 bg-status-critical/10 text-status-critical"
                  }
                >
                  {node.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-mono-metric text-xs text-muted-foreground">
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
  );
}
